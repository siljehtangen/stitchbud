import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { storagePathFromUrl } from './storage.ts'

const BASE = 'https://abc.supabase.co/storage/v1/object/public/stitchbud-files/'

Deno.test('extracts the object path from a managed public URL', () => {
  assertEquals(
    storagePathFromUrl(`${BASE}project-covers/1/123-abc.jpg`),
    'project-covers/1/123-abc.jpg'
  )
})

Deno.test('decodes percent-encoded paths', () => {
  assertEquals(storagePathFromUrl(`${BASE}library/9/my%20file.png`), 'library/9/my file.png')
})

Deno.test('returns null for non-http values', () => {
  assertEquals(storagePathFromUrl('not-a-url'), null)
  assertEquals(storagePathFromUrl(''), null)
  assertEquals(storagePathFromUrl(null), null)
  assertEquals(storagePathFromUrl(undefined), null)
})

Deno.test('returns null for URLs outside the managed bucket', () => {
  assertEquals(storagePathFromUrl('https://evil.example.com/foo.jpg'), null)
  assertEquals(
    storagePathFromUrl('https://abc.supabase.co/storage/v1/object/public/other-bucket/x.jpg'),
    null
  )
})

Deno.test('rejects path traversal attempts', () => {
  assertEquals(storagePathFromUrl(`${BASE}../secret.jpg`), null)
})
