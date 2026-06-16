// delete-account Edge Function.
//
// Replaces the parts of the Spring Boot account flow that need the service-role
// key: bulk storage cleanup, deleting the Supabase Auth user, and removing
// friendships/profile. Two actions:
//   * "reset"  -> delete all of the caller's projects + library (and their files)
//   * "delete" -> reset, then remove friendships, profile, and the auth user
//
// Row deletes rely on ON DELETE CASCADE (projects -> materials/images/files/
// grids/row_counters, library_items -> library_item_images), so we only delete
// the top-level rows after collecting their storage object paths.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { BUCKET, storagePathFromUrl } from '../_shared/storage.ts'

type Action = 'reset' | 'delete'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return json({ error: 'Missing Authorization header' }, 401)
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Identify the caller from their JWT.
  const token = authHeader.replace(/^Bearer\s+/i, '')
  const { data: userData, error: userErr } = await admin.auth.getUser(token)
  if (userErr || !userData.user) {
    return json({ error: 'Invalid or expired session' }, 401)
  }
  const userId = userData.user.id

  let action: Action = 'delete'
  try {
    const body = await req.json()
    if (body?.action === 'reset' || body?.action === 'delete') action = body.action
  } catch {
    // No body -> default to full delete (matches DELETE /projects/account).
  }

  // 1. Collect storage object paths owned by the user.
  const paths = new Set<string>()

  const { data: projectIdRows } = await admin
    .from('projects')
    .select('id')
    .eq('user_id', userId)
  const projectIds = (projectIdRows ?? []).map(r => r.id)

  if (projectIds.length > 0) {
    const { data: images } = await admin
      .from('project_images')
      .select('stored_name')
      .in('project_id', projectIds)
    images?.forEach(i => {
      const p = storagePathFromUrl(i.stored_name)
      if (p) paths.add(p)
    })

    const { data: files } = await admin
      .from('project_files')
      .select('stored_name')
      .in('project_id', projectIds)
    files?.forEach(f => {
      const p = storagePathFromUrl(f.stored_name)
      if (p) paths.add(p)
    })
  }

  const { data: libraryIdRows } = await admin
    .from('library_items')
    .select('id')
    .eq('user_id', userId)
  const libraryIds = (libraryIdRows ?? []).map(r => r.id)

  if (libraryIds.length > 0) {
    const { data: libImages } = await admin
      .from('library_item_images')
      .select('stored_name')
      .in('library_item_id', libraryIds)
    libImages?.forEach(i => {
      const p = storagePathFromUrl(i.stored_name)
      if (p) paths.add(p)
    })
  }

  // 2. Remove storage objects. For a full account delete this is personal data,
  //    so a failure must abort before we delete any rows (the request can then be
  //    retried) rather than silently orphaning files in storage.
  if (paths.size > 0) {
    const { error: storageErr } = await admin.storage.from(BUCKET).remove([...paths])
    if (storageErr) {
      console.error('Storage cleanup error:', storageErr.message)
      if (action === 'delete') {
        return json({ error: 'Failed to remove stored files; account not deleted' }, 500)
      }
    }
  }

  // 3. Delete the user's data (children cascade). Check each step: if data
  //    removal fails we must not proceed to delete the auth user, otherwise the
  //    account is gone but its rows linger.
  const projectsDel = await admin.from('projects').delete().eq('user_id', userId)
  const libraryDel = await admin.from('library_items').delete().eq('user_id', userId)
  if (projectsDel.error || libraryDel.error) {
    console.error('Data delete failed:', projectsDel.error?.message, libraryDel.error?.message)
    return json({ error: 'Failed to delete account data' }, 500)
  }

  if (action === 'delete') {
    const friendsDel = await admin
      .from('friendships')
      .delete()
      .or(`requester_id.eq.${userId},recipient_id.eq.${userId}`)
    const profileDel = await admin.from('user_profiles').delete().eq('user_id', userId)
    if (friendsDel.error || profileDel.error) {
      console.error('Account cleanup failed:', friendsDel.error?.message, profileDel.error?.message)
      return json({ error: 'Failed to delete account data' }, 500)
    }

    const { error: deleteErr } = await admin.auth.admin.deleteUser(userId)
    if (deleteErr) {
      console.error('Auth user delete failed:', deleteErr.message)
      return json({ error: 'Failed to delete account' }, 500)
    }
  }

  return json({ ok: true, action })
})
