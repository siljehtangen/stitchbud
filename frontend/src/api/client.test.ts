import { describe, it, expect, vi } from 'vitest'

// client.ts imports the supabase singleton, which throws without env vars.
// Mock it so we can test the pure helpers in isolation.
vi.mock('../supabase', () => ({ supabase: {} }))

import { storagePathFromUrl, raiseError } from './client'

const BASE = 'https://abc.supabase.co/storage/v1/object/public/stitchbud-files/'

describe('storagePathFromUrl', () => {
  it('extracts the object path from a managed public URL', () => {
    expect(storagePathFromUrl(`${BASE}project-covers/1/123.jpg`)).toBe('project-covers/1/123.jpg')
  })

  it('decodes percent-encoded segments', () => {
    expect(storagePathFromUrl(`${BASE}library/9/my%20file.png`)).toBe('library/9/my file.png')
  })

  it('returns null for non-http or empty values', () => {
    expect(storagePathFromUrl(null)).toBeNull()
    expect(storagePathFromUrl(undefined)).toBeNull()
    expect(storagePathFromUrl('')).toBeNull()
    expect(storagePathFromUrl('relative/path.jpg')).toBeNull()
  })

  it('returns null for URLs outside the managed bucket', () => {
    expect(storagePathFromUrl('https://evil.com/x.jpg')).toBeNull()
  })

  it('rejects path traversal', () => {
    expect(storagePathFromUrl(`${BASE}../secret.jpg`)).toBeNull()
  })
})

describe('raiseError', () => {
  it('does nothing when error is null', () => {
    expect(() => raiseError(null, 'fallback')).not.toThrow()
  })

  it('throws the supabase error message', () => {
    expect(() => raiseError({ message: 'boom' }, 'fallback')).toThrow('boom')
  })

  it('throws the fallback when the message is empty', () => {
    expect(() => raiseError({ message: '' }, 'fallback')).toThrow('fallback')
  })
})
