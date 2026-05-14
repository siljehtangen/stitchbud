import { describe, it, expect, vi, beforeEach } from 'vitest'
import { projectsApi } from './projects'

// Mock the client module so no real HTTP or Supabase calls are made
vi.mock('./client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
  uploadFile: vi.fn(),
}))

import { api, uploadFile } from './client'

const minimalProjectResponse = {
  id: 1,
  name: 'Test',
  description: '',
  category: 'KNITTING',
  tags: '',
  coverImages: [],
  notes: '',
  recipeText: '',
  pinterestBoardUrls: [],
  craftDetails: '',
  materials: [],
  files: [],
  patternGrids: [],
  isPublic: false,
  createdAt: 0,
  updatedAt: 0,
}

beforeEach(() => vi.clearAllMocks())

// ──────── registerMaterialImageByUrl ────────

describe('projectsApi.registerMaterialImageByUrl', () => {
  it('uses the provided originalName when given', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: minimalProjectResponse })

    await projectsApi.registerMaterialImageByUrl(1, 10, 'https://img.jpg', 'photo.jpg')

    expect(vi.mocked(api.post)).toHaveBeenCalledWith(
      '/projects/1/material-images/register',
      expect.objectContaining({ originalName: 'photo.jpg' })
    )
  })

  it('falls back to "image" when originalName is empty', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: minimalProjectResponse })

    await projectsApi.registerMaterialImageByUrl(1, 10, 'https://img.jpg', '')

    expect(vi.mocked(api.post)).toHaveBeenCalledWith(
      '/projects/1/material-images/register',
      expect.objectContaining({ originalName: 'image' })
    )
  })

  it('includes the materialId and fileUrl in the request body', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: minimalProjectResponse })

    await projectsApi.registerMaterialImageByUrl(1, 42, 'https://cdn.example.com/img.jpg', 'img.jpg')

    expect(vi.mocked(api.post)).toHaveBeenCalledWith(
      '/projects/1/material-images/register',
      expect.objectContaining({ materialId: 42, fileUrl: 'https://cdn.example.com/img.jpg' })
    )
  })
})

// ──────── uploadProjectFile MIME type fallback ────────

describe('projectsApi.uploadProjectFile', () => {
  it('uses file.type when present', async () => {
    vi.mocked(uploadFile).mockResolvedValue('https://cdn.example.com/file.pdf')
    vi.mocked(api.post).mockResolvedValue({ data: minimalProjectResponse })

    const file = new File(['content'], 'recipe.pdf', { type: 'application/pdf' })
    await projectsApi.uploadProjectFile(1, file)

    expect(vi.mocked(api.post)).toHaveBeenCalledWith(
      '/projects/1/files/register',
      expect.objectContaining({ mimeType: 'application/pdf' })
    )
  })

  it('falls back to application/octet-stream when file.type is empty', async () => {
    vi.mocked(uploadFile).mockResolvedValue('https://cdn.example.com/file')
    vi.mocked(api.post).mockResolvedValue({ data: minimalProjectResponse })

    const file = new File(['content'], 'data.bin', { type: '' })
    await projectsApi.uploadProjectFile(1, file)

    expect(vi.mocked(api.post)).toHaveBeenCalledWith(
      '/projects/1/files/register',
      expect.objectContaining({ mimeType: 'application/octet-stream' })
    )
  })

  it('uses the file name as originalName', async () => {
    vi.mocked(uploadFile).mockResolvedValue('https://cdn.example.com/file.pdf')
    vi.mocked(api.post).mockResolvedValue({ data: minimalProjectResponse })

    const file = new File(['content'], 'my-pattern.pdf', { type: 'application/pdf' })
    await projectsApi.uploadProjectFile(1, file)

    expect(vi.mocked(api.post)).toHaveBeenCalledWith(
      '/projects/1/files/register',
      expect.objectContaining({ originalName: 'my-pattern.pdf' })
    )
  })
})

// ──────── replaceFile ordering ────────

describe('projectsApi.replaceFile', () => {
  it('uploads the new file before deleting the old one', async () => {
    const callOrder: string[] = []

    vi.mocked(uploadFile).mockImplementation(async () => {
      callOrder.push('upload')
      return 'https://cdn.example.com/new.pdf'
    })
    vi.mocked(api.post).mockResolvedValue({ data: minimalProjectResponse })
    vi.mocked(api.delete).mockImplementation(async () => {
      callOrder.push('delete')
      return { data: minimalProjectResponse }
    })

    const file = new File(['content'], 'new.pdf', { type: 'application/pdf' })
    await projectsApi.replaceFile(1, 99, file)

    expect(callOrder[0]).toBe('upload')
    expect(callOrder[1]).toBe('delete')
  })

  it('deletes the old file with the correct fileId', async () => {
    vi.mocked(uploadFile).mockResolvedValue('https://cdn.example.com/new.pdf')
    vi.mocked(api.post).mockResolvedValue({ data: minimalProjectResponse })
    vi.mocked(api.delete).mockResolvedValue({ data: minimalProjectResponse })

    const file = new File(['content'], 'new.pdf', { type: 'application/pdf' })
    await projectsApi.replaceFile(5, 77, file)

    expect(vi.mocked(api.delete)).toHaveBeenCalledWith('/projects/5/files/77')
  })
})

// ──────── endpoint URLs spot-check ────────

describe('projectsApi endpoint URLs', () => {
  it('getAll hits /projects', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: [] })
    await projectsApi.getAll()
    expect(vi.mocked(api.get)).toHaveBeenCalledWith('/projects', expect.anything())
  })

  it('getOne hits /projects/:id', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: minimalProjectResponse })
    await projectsApi.getOne(3)
    expect(vi.mocked(api.get)).toHaveBeenCalledWith('/projects/3')
  })

  it('delete hits /projects/:id', async () => {
    vi.mocked(api.delete).mockResolvedValue({})
    await projectsApi.delete(7)
    expect(vi.mocked(api.delete)).toHaveBeenCalledWith('/projects/7')
  })

  it('updateRowCounter hits /projects/:id/row-counter', async () => {
    vi.mocked(api.put).mockResolvedValue({ data: minimalProjectResponse })
    await projectsApi.updateRowCounter(2, { stitchesPerRound: 8, totalRounds: 10, checkedStitches: '[]' })
    expect(vi.mocked(api.put)).toHaveBeenCalledWith('/projects/2/row-counter', expect.anything())
  })

  it('deletePatternGrid hits /projects/:id/pattern-grids/:gridId', async () => {
    vi.mocked(api.delete).mockResolvedValue({ data: minimalProjectResponse })
    await projectsApi.deletePatternGrid(1, 5)
    expect(vi.mocked(api.delete)).toHaveBeenCalledWith('/projects/1/pattern-grids/5')
  })
})
