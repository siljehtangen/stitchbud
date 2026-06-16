export const BUCKET = 'stitchbud-files'

const PUBLIC_MARKER = `/object/public/${BUCKET}/`

/**
 * Extract the in-bucket object path from a public Supabase Storage URL.
 * Returns null for non-http values, foreign URLs, or paths containing "..".
 */
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
