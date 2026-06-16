import { describe, it, expect } from 'vitest'
import { isSafeHttpUrl, safeHttpUrl } from './url'

describe('isSafeHttpUrl', () => {
  it('accepts http and https URLs', () => {
    expect(isSafeHttpUrl('https://pinterest.com/board')).toBe(true)
    expect(isSafeHttpUrl('http://example.com')).toBe(true)
    expect(isSafeHttpUrl('  https://example.com  ')).toBe(true)
  })

  it('rejects dangerous and malformed URLs', () => {
    expect(isSafeHttpUrl('javascript:alert(1)')).toBe(false)
    expect(isSafeHttpUrl('data:text/html,<script>alert(1)</script>')).toBe(false)
    expect(isSafeHttpUrl('vbscript:msgbox(1)')).toBe(false)
    expect(isSafeHttpUrl('not a url')).toBe(false)
    expect(isSafeHttpUrl('/relative/path')).toBe(false)
    expect(isSafeHttpUrl('')).toBe(false)
  })
})

describe('safeHttpUrl', () => {
  it('returns the trimmed URL when safe, otherwise undefined', () => {
    expect(safeHttpUrl('  https://example.com  ')).toBe('https://example.com')
    expect(safeHttpUrl('javascript:alert(1)')).toBeUndefined()
    expect(safeHttpUrl(null)).toBeUndefined()
    expect(safeHttpUrl(undefined)).toBeUndefined()
    expect(safeHttpUrl('')).toBeUndefined()
  })
})
