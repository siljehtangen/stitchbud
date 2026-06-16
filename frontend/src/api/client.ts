import { supabase } from '../supabase'

export const STORAGE_BUCKET = 'stitchbud-files'

const PUBLIC_MARKER = `/object/public/${STORAGE_BUCKET}/`

export { supabase }

/** The current authenticated user's id. Throws if there is no active session. */
export async function getUserId(): Promise<string> {
  const { data } = await supabase.auth.getSession()
  const id = data.session?.user.id
  if (!id) throw new Error('Not authenticated')
  return id
}

/** Upload a file to the public bucket and return its public URL. */
export async function uploadFile(file: File, folder: string): Promise<string> {
  const dotIdx = file.name.lastIndexOf('.')
  const ext = dotIdx !== -1 ? file.name.slice(dotIdx) : ''
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`
  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, { upsert: true })
  if (error) throw error
  return supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path).data.publicUrl
}

/** The in-bucket object path for a managed public URL, or null if not ours. */
export function storagePathFromUrl(url: string | null | undefined): string | null {
  if (!url || !url.startsWith('http')) return null
  const idx = url.indexOf(PUBLIC_MARKER)
  if (idx === -1) return null
  const path = url.slice(idx + PUBLIC_MARKER.length)
  if (!path || path.includes('..')) return null
  try {
    return decodeURIComponent(path)
  } catch {
    return path
  }
}

/** Best-effort delete of an uploaded object. Storage cleanup failures are non-fatal. */
export async function deleteUploadedFile(url: string | null | undefined): Promise<void> {
  const path = storagePathFromUrl(url)
  if (!path) return
  const { error } = await supabase.storage.from(STORAGE_BUCKET).remove([path])
  if (error) console.warn(`Failed to delete stored file: ${error.message}`)
}

/** Throw a friendly Error from a Supabase/PostgREST error (preserves DB messages). */
export function raiseError(error: { message: string } | null, fallback: string): void {
  if (error) throw new Error(error.message || fallback)
}
