export const BUCKET = 'stitchbud-files'

const PUBLIC_MARKER = `/object/public/${BUCKET}/`
const SIGNED_MARKER = `/object/sign/${BUCKET}/`

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
