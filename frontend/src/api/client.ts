import { supabase } from '../supabase'

export const STORAGE_BUCKET = 'stitchbud-files'

const PUBLIC_MARKER = `/object/public/${STORAGE_BUCKET}/`
const SIGNED_MARKER = `/object/sign/${STORAGE_BUCKET}/`

/** Hard upload ceiling. Mirrors the bucket-level `file_size_limit` so the user
 *  gets an immediate error instead of a failed network round-trip. */
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024 // 25 MB

/** Content the bucket accepts: images plus the document types used for patterns.
 *  Some browsers send '' / octet-stream for .doc/.docx, so those pass here and
 *  are bounded by the size limit. */
const ALLOWED_UPLOAD_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/octet-stream',
  '',
])

export { supabase }

/** The current authenticated user's id. Throws if there is no active session. */
export async function getUserId(): Promise<string> {
  const { data } = await supabase.auth.getSession()
  const id = data.session?.user.id
  if (!id) throw new Error('Not authenticated')
  return id
}

/** Upload a file to the (private) storage bucket. Returns a public-object URL
 *  that is used purely as a stable identifier in `stored_name`; it is not
 *  directly fetchable — render sites resolve it to a signed URL (see media.ts). */
export async function uploadFile(file: File, folder: string): Promise<string> {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error(`File is too large (max ${Math.floor(MAX_UPLOAD_BYTES / (1024 * 1024))} MB)`)
  }
  if (!ALLOWED_UPLOAD_TYPES.has(file.type)) {
    throw new Error('Unsupported file type')
  }
  const dotIdx = file.name.lastIndexOf('.')
  const ext = dotIdx !== -1 ? file.name.slice(dotIdx) : ''
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`
  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, { upsert: true })
  if (error) throw error
  return supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path).data.publicUrl
}

/** The in-bucket object path for a managed storage URL (public-object or signed
 *  form), or null if not ours. Any `?token=...` query is stripped. */
export function storagePathFromUrl(url: string | null | undefined): string | null {
  if (!url || !url.startsWith('http')) return null
  let idx = url.indexOf(PUBLIC_MARKER)
  let markerLen = PUBLIC_MARKER.length
  if (idx === -1) {
    idx = url.indexOf(SIGNED_MARKER)
    markerLen = SIGNED_MARKER.length
  }
  if (idx === -1) return null
  let path = url.slice(idx + markerLen)
  const queryIdx = path.indexOf('?')
  if (queryIdx !== -1) path = path.slice(0, queryIdx)
  if (!path || path.includes('..')) return null
  try {
    return decodeURIComponent(path)
  } catch {
    return path
  }
}

/** Rebuild the canonical public-object identifier we persist in `stored_name`
 *  from any managed storage URL (public or signed). Returns the input unchanged
 *  if it is not one of ours. */
export function canonicalStoredName(url: string): string {
  const path = storagePathFromUrl(url)
  if (!path) return url
  return supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path).data.publicUrl
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
