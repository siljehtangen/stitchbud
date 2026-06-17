import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { LibraryItem, Project, ProjectImage, ProjectFile } from '../types'

const createSignedUrls = vi.fn()
vi.mock('../supabase', () => ({
  supabase: { storage: { from: () => ({ createSignedUrls }) } },
}))

import {
  withSignedProjectMedia,
  withSignedProjectsMedia,
  withSignedLibraryMedia,
  withSignedLibraryItemsMedia,
} from './media'

const BASE = 'https://abc.supabase.co/storage/v1/object/public/stitchbud-files/'
const SIGN = 'https://abc.supabase.co/storage/v1/object/sign/stitchbud-files/'

function mockSign(token = 'tok') {
  createSignedUrls.mockImplementation(async (paths: string[]) => ({
    data: paths.map(path => ({ path, signedUrl: `${SIGN}${path}?token=${token}`, error: null })),
    error: null,
  }))
}

function coverImage(over: Partial<ProjectImage> = {}): ProjectImage {
  return {
    id: 1,
    storedName: `${BASE}project-covers/1/a.jpg`,
    originalName: 'a.jpg',
    section: 'cover',
    isMain: true,
    projectId: 1,
    ...over,
  }
}

function projectFile(over: Partial<ProjectFile> = {}): ProjectFile {
  return {
    id: 1,
    storedName: `${BASE}project-files/1/doc.pdf`,
    originalName: 'doc.pdf',
    mimeType: 'application/pdf',
    fileType: 'pdf',
    uploadedAt: 0,
    projectId: 1,
    ...over,
  }
}

function makeProject(over: Partial<Project> = {}): Project {
  return {
    id: 1,
    name: 'P',
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
    ...over,
  }
}

beforeEach(() => {
  createSignedUrls.mockReset()
})

describe('withSignedProjectMedia', () => {
  it('swaps cover, material, and file URLs for signed URLs', async () => {
    mockSign()
    const project = makeProject({
      coverImages: [coverImage()],
      materials: [
        {
          id: 1,
          name: 'Wool',
          type: 'yarn',
          color: '',
          colorHex: '',
          amount: '',
          unit: 'g',
          images: [
            coverImage({ id: 2, storedName: `${BASE}project-materials/1/1/m.jpg`, section: 'material', materialId: 1 }),
          ],
        },
      ],
      files: [projectFile()],
    })

    const signed = await withSignedProjectMedia(project)

    expect(signed.coverImages[0].storedName).toBe(`${SIGN}project-covers/1/a.jpg?token=tok`)
    expect(signed.materials[0].images[0].storedName).toBe(`${SIGN}project-materials/1/1/m.jpg?token=tok`)
    expect(signed.files[0].storedName).toBe(`${SIGN}project-files/1/doc.pdf?token=tok`)
  })

  it('signs every distinct object in a single createSignedUrls call', async () => {
    mockSign()
    await withSignedProjectMedia(
      makeProject({ coverImages: [coverImage(), coverImage({ id: 2, storedName: `${BASE}project-covers/1/b.jpg` })] })
    )
    expect(createSignedUrls).toHaveBeenCalledTimes(1)
    expect(createSignedUrls.mock.calls[0][0]).toEqual(['project-covers/1/a.jpg', 'project-covers/1/b.jpg'])
  })

  it('does not call the API when there are no images', async () => {
    const project = await withSignedProjectMedia(makeProject())
    expect(createSignedUrls).not.toHaveBeenCalled()
    expect(project.coverImages).toEqual([])
  })

  it('falls back to the original URL when signing fails', async () => {
    createSignedUrls.mockResolvedValue({ data: null, error: { message: 'boom' } })
    const original = `${BASE}project-covers/1/a.jpg`
    const signed = await withSignedProjectMedia(makeProject({ coverImages: [coverImage({ storedName: original })] }))
    expect(signed.coverImages[0].storedName).toBe(original)
  })
})

describe('withSignedProjectsMedia', () => {
  it('signs across multiple projects in one round-trip', async () => {
    mockSign()
    const result = await withSignedProjectsMedia([
      makeProject({ id: 1, coverImages: [coverImage()] }),
      makeProject({ id: 2, coverImages: [coverImage({ id: 9, storedName: `${BASE}project-covers/2/x.jpg` })] }),
    ])
    expect(createSignedUrls).toHaveBeenCalledTimes(1)
    expect(result[0].coverImages[0].storedName).toContain('/object/sign/')
    expect(result[1].coverImages[0].storedName).toBe(`${SIGN}project-covers/2/x.jpg?token=tok`)
  })
})

describe('withSignedLibraryMedia', () => {
  it('signs library item images', async () => {
    mockSign()
    const item: LibraryItem = {
      id: 1,
      itemType: 'YARN',
      name: 'Wool',
      images: [{ id: 1, storedName: `${BASE}library/1/a.jpg`, originalName: 'a.jpg', isMain: true, libraryItemId: 1 }],
      colors: [],
      createdAt: 0,
    }
    const signed = await withSignedLibraryMedia(item)
    expect(signed.images?.[0].storedName).toBe(`${SIGN}library/1/a.jpg?token=tok`)
  })

  it('leaves an item without images untouched', async () => {
    const item: LibraryItem = { id: 1, itemType: 'YARN', name: 'Wool', colors: [], createdAt: 0 }
    const signed = await withSignedLibraryMedia(item)
    expect(createSignedUrls).not.toHaveBeenCalled()
    expect(signed).toEqual(item)
  })
})

describe('withSignedLibraryItemsMedia', () => {
  it('signs images across multiple library items in one call', async () => {
    mockSign()
    const items: LibraryItem[] = [
      {
        id: 1,
        itemType: 'YARN',
        name: 'Wool',
        images: [
          { id: 1, storedName: `${BASE}library/1/a.jpg`, originalName: 'a.jpg', isMain: true, libraryItemId: 1 },
        ],
        colors: [],
        createdAt: 0,
      },
      {
        id: 2,
        itemType: 'FABRIC',
        name: 'Cotton',
        images: [
          { id: 2, storedName: `${BASE}library/2/b.jpg`, originalName: 'b.jpg', isMain: true, libraryItemId: 2 },
        ],
        colors: [],
        createdAt: 0,
      },
    ]
    const signed = await withSignedLibraryItemsMedia(items)
    expect(createSignedUrls).toHaveBeenCalledTimes(1)
    expect(signed[0].images?.[0].storedName).toBe(`${SIGN}library/1/a.jpg?token=tok`)
    expect(signed[1].images?.[0].storedName).toBe(`${SIGN}library/2/b.jpg?token=tok`)
  })

  it('returns items unchanged when there is nothing to sign', async () => {
    const items: LibraryItem[] = [{ id: 1, itemType: 'YARN', name: 'Wool', colors: [], createdAt: 0 }]
    const signed = await withSignedLibraryItemsMedia(items)
    expect(createSignedUrls).not.toHaveBeenCalled()
    expect(signed).toEqual(items)
  })
})
