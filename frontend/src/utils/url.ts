export function isSafeHttpUrl(value: string): boolean {
  let parsed: URL
  try {
    parsed = new URL(value.trim())
  } catch {
    return false
  }
  return parsed.protocol === 'http:' || parsed.protocol === 'https:'
}

export function safeHttpUrl(value: string | null | undefined): string | undefined {
  if (!value) return undefined
  return isSafeHttpUrl(value) ? value.trim() : undefined
}
