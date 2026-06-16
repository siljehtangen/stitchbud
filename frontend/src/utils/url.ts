/** URL safety helpers. Used to keep user-supplied links (e.g. Pinterest board
 *  URLs) from becoming a `javascript:`/`data:` injection vector when rendered
 *  as an href — including in a friend's browser viewing a shared project. */

/** True only for well-formed http(s) URLs. Everything else (javascript:, data:,
 *  relative, garbage) is rejected. */
export function isSafeHttpUrl(value: string): boolean {
  let parsed: URL
  try {
    parsed = new URL(value.trim())
  } catch {
    return false
  }
  return parsed.protocol === 'http:' || parsed.protocol === 'https:'
}

/** Return the URL if it is a safe http(s) link, otherwise undefined. */
export function safeHttpUrl(value: string | null | undefined): string | undefined {
  if (!value) return undefined
  return isSafeHttpUrl(value) ? value.trim() : undefined
}
