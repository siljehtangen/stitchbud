import { describe, it, expect, vi, beforeEach } from 'vitest'

const { getSession, upload, getPublicUrl, remove } = vi.hoisted(() => ({
  getSession: vi.fn(),
  upload: vi.fn(),
  getPublicUrl: vi.fn(),
  remove: vi.fn(),
}))

vi.mock('../supabase', () => ({
  supabase: {
    auth: { getSession },
    storage: {
      from: vi.fn(() => ({
        upload,
        getPublicUrl,
        remove,
      })),
    },
  },
}))

import {
  storagePathFromUrl,
  raiseError,
  getUserId,
  uploadFile,
  canonicalStoredName,
  deleteUploadedFile,
  STORAGE_BUCKET,
} from './client'
import { supabase } from '../supabase'

const BASE = `https://abc.supabase.co/storage/v1/object/public/${STORAGE_BUCKET}/`

beforeEach(() => {
  vi.clearAllMocks()
  getPublicUrl.mockReturnValue({ data: { publicUrl: `${BASE}uploaded/file.jpg` } })
  upload.mockResolvedValue({ error: null })
  remove.mockResolvedValue({ error: null })
})

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

  it('extracts the path from a signed URL and strips the token query', () => {
    const signed =
      'https://abc.supabase.co/storage/v1/object/sign/stitchbud-files/project-covers/1/123.jpg?token=abc.def.ghi'
    expect(storagePathFromUrl(signed)).toBe('project-covers/1/123.jpg')
  })

  it('strips a query string from a public URL', () => {
    expect(storagePathFromUrl(`${BASE}library/9/a.png?x=1`)).toBe('library/9/a.png')
  })

  it('returns the raw path when percent-decoding fails', () => {
    expect(storagePathFromUrl(`${BASE}bad%ZZname.jpg`)).toBe('bad%ZZname.jpg')
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

describe('getUserId', () => {
  it('returns the authenticated user id', async () => {
    getSession.mockResolvedValue({ data: { session: { user: { id: 'user-1' } } } })
    await expect(getUserId()).resolves.toBe('user-1')
  })

  it('throws when there is no session', async () => {
    getSession.mockResolvedValue({ data: { session: null } })
    await expect(getUserId()).rejects.toThrow('Not authenticated')
  })
})

describe('uploadFile', () => {
  it('uploads an allowed file and returns the public URL', async () => {
    const file = new File(['data'], 'photo.jpg', { type: 'image/jpeg' })
    const url = await uploadFile(file, 'project-covers/1')

    expect(supabase.storage.from).toHaveBeenCalledWith(STORAGE_BUCKET)
    expect(upload).toHaveBeenCalled()
    expect(url).toBe(`${BASE}uploaded/file.jpg`)
  })

  it('rejects files that are too large', async () => {
    const file = new File([new Uint8Array(26 * 1024 * 1024)], 'big.jpg', { type: 'image/jpeg' })
    await expect(uploadFile(file, 'folder')).rejects.toThrow('too large')
  })

  it('rejects unsupported file types', async () => {
    const file = new File(['data'], 'virus.exe', { type: 'application/x-msdownload' })
    await expect(uploadFile(file, 'folder')).rejects.toThrow('Unsupported file type')
  })

  it('surfaces upload errors from storage', async () => {
    upload.mockResolvedValue({ error: { message: 'upload failed' } })
    const file = new File(['data'], 'photo.jpg', { type: 'image/jpeg' })
    await expect(uploadFile(file, 'folder')).rejects.toEqual({ message: 'upload failed' })
  })

  it('uploads files without an extension', async () => {
    const file = new File(['data'], 'README', { type: 'application/octet-stream' })
    await uploadFile(file, 'docs')
    expect(upload).toHaveBeenCalled()
  })
})

describe('canonicalStoredName', () => {
  it('returns the canonical public URL for a managed storage URL', () => {
    expect(canonicalStoredName(`${BASE}library/1/a.jpg`)).toBe(`${BASE}uploaded/file.jpg`)
  })

  it('returns the original value when the URL is not managed storage', () => {
    expect(canonicalStoredName('https://example.com/a.jpg')).toBe('https://example.com/a.jpg')
  })
})

describe('deleteUploadedFile', () => {
  it('removes the stored object when the URL is managed', async () => {
    await deleteUploadedFile(`${BASE}library/1/a.jpg`)
    expect(remove).toHaveBeenCalledWith(['library/1/a.jpg'])
  })

  it('does nothing for non-managed URLs', async () => {
    await deleteUploadedFile('https://example.com/a.jpg')
    expect(remove).not.toHaveBeenCalled()
  })

  it('logs a warning when deletion fails', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    remove.mockResolvedValue({ error: { message: 'denied' } })
    await deleteUploadedFile(`${BASE}library/1/a.jpg`)
    expect(warn).toHaveBeenCalledWith('Failed to delete stored file: denied')
    warn.mockRestore()
  })
})
