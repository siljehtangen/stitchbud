import { describe, it, expect } from 'vitest'
import {
  normalizeProject,
  projectCoverImageUrls,
  materialImageUrls,
  uniqueImageUrls,
  libraryItemImagesForProject,
} from './projectOverviewMedia'
import type { Project, Material, LibraryItem } from './types'

// ──────── helpers ────────

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
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
    ...overrides,
  }
}

function makeMaterial(overrides: Partial<Material> = {}): Material {
  return {
    id: 1,
    name: 'Wool',
    type: 'yarn',
    color: '',
    colorHex: '',
    amount: '',
    unit: 'g',
    images: [],
    ...overrides,
  }
}

function makeImage(id: number, storedName: string, isMain = false) {
  return { id, storedName, originalName: 'img.jpg', section: 'cover', isMain, projectId: 1 }
}

// ──────── normalizeProject ────────

describe('normalizeProject', () => {
  it('passes through a project with valid arrays unchanged', () => {
    const p = makeProject({ coverImages: [makeImage(1, 'a.jpg')] })
    const result = normalizeProject(p)
    expect(result.coverImages).toHaveLength(1)
  })

  it('replaces null coverImages with empty array', () => {
    const p = makeProject({ coverImages: null as never })
    const result = normalizeProject(p)
    expect(Array.isArray(result.coverImages)).toBe(true)
    expect(result.coverImages).toHaveLength(0)
  })

  it('replaces null materials with empty array', () => {
    const p = makeProject({ materials: null as never })
    const result = normalizeProject(p)
    expect(Array.isArray(result.materials)).toBe(true)
  })

  it('replaces null images inside each material', () => {
    const mat = makeMaterial({ images: null as never })
    const p = makeProject({ materials: [mat] })
    const result = normalizeProject(p)
    expect(Array.isArray(result.materials[0].images)).toBe(true)
    expect(result.materials[0].images).toHaveLength(0)
  })

  it('preserves existing material images', () => {
    const img = {
      id: 1,
      storedName: 'x.jpg',
      originalName: 'x.jpg',
      section: 'material',
      isMain: true,
      projectId: 1,
      materialId: 1,
    }
    const mat = makeMaterial({ images: [img] })
    const p = makeProject({ materials: [mat] })
    const result = normalizeProject(p)
    expect(result.materials[0].images).toHaveLength(1)
  })
})

// ──────── projectCoverImageUrls ────────

describe('projectCoverImageUrls', () => {
  it('returns empty array when there are no cover images', () => {
    expect(projectCoverImageUrls(makeProject())).toEqual([])
  })

  it('returns storedName for each cover image', () => {
    const p = makeProject({ coverImages: [makeImage(1, 'a.jpg'), makeImage(2, 'b.jpg')] })
    expect(projectCoverImageUrls(p)).toEqual(['a.jpg', 'b.jpg'])
  })

  it('puts the main image first', () => {
    const p = makeProject({
      coverImages: [makeImage(1, 'first.jpg', false), makeImage(2, 'main.jpg', true), makeImage(3, 'third.jpg', false)],
    })
    const urls = projectCoverImageUrls(p)
    expect(urls[0]).toBe('main.jpg')
  })

  it('filters out blank storedNames', () => {
    const p = makeProject({ coverImages: [makeImage(1, ''), makeImage(2, 'valid.jpg')] })
    const urls = projectCoverImageUrls(p)
    expect(urls).toEqual(['valid.jpg'])
  })

  it('handles null coverImages gracefully', () => {
    const p = makeProject({ coverImages: null as never })
    expect(projectCoverImageUrls(p)).toEqual([])
  })
})

// ──────── materialImageUrls ────────

describe('materialImageUrls', () => {
  it('returns empty array when material has no images', () => {
    expect(materialImageUrls(makeMaterial())).toEqual([])
  })

  it('returns storedNames of all images', () => {
    const mat = makeMaterial({
      images: [
        {
          id: 1,
          storedName: 'a.jpg',
          originalName: 'a.jpg',
          section: 'material',
          isMain: false,
          projectId: 1,
          materialId: 1,
        },
        {
          id: 2,
          storedName: 'b.jpg',
          originalName: 'b.jpg',
          section: 'material',
          isMain: false,
          projectId: 1,
          materialId: 1,
        },
      ],
    })
    expect(materialImageUrls(mat)).toEqual(['a.jpg', 'b.jpg'])
  })

  it('places the main image first', () => {
    const mat = makeMaterial({
      images: [
        {
          id: 1,
          storedName: 'first.jpg',
          originalName: '',
          section: 'material',
          isMain: false,
          projectId: 1,
          materialId: 1,
        },
        {
          id: 2,
          storedName: 'main.jpg',
          originalName: '',
          section: 'material',
          isMain: true,
          projectId: 1,
          materialId: 1,
        },
      ],
    })
    const urls = materialImageUrls(mat)
    expect(urls[0]).toBe('main.jpg')
  })

  it('returns full Supabase URLs unchanged', () => {
    const url = 'https://storage.supabase.co/object/public/stitchbud-files/photo.jpg'
    const mat = makeMaterial({
      images: [
        {
          id: 1,
          storedName: url,
          originalName: '',
          section: 'material',
          isMain: false,
          projectId: 1,
          materialId: 1,
        },
      ],
    })
    expect(materialImageUrls(mat)).toEqual([url])
  })

  it('handles null images array gracefully', () => {
    const mat = makeMaterial({ images: null as never })
    expect(materialImageUrls(mat)).toEqual([])
  })
})

// ──────── uniqueImageUrls ────────

describe('uniqueImageUrls', () => {
  it('removes duplicate URLs', () => {
    expect(uniqueImageUrls(['a.jpg', 'b.jpg', 'a.jpg'])).toEqual(['a.jpg', 'b.jpg'])
  })

  it('filters out falsy values', () => {
    expect(uniqueImageUrls(['a.jpg', '', 'b.jpg'])).toEqual(['a.jpg', 'b.jpg'])
  })

  it('returns empty array for empty input', () => {
    expect(uniqueImageUrls([])).toEqual([])
  })

  it('preserves order of first occurrence', () => {
    expect(uniqueImageUrls(['c.jpg', 'a.jpg', 'b.jpg', 'c.jpg'])).toEqual(['c.jpg', 'a.jpg', 'b.jpg'])
  })
})

// ──────── libraryItemImagesForProject ────────

function makeLibraryItem(overrides: Partial<LibraryItem> = {}): LibraryItem {
  return {
    id: 1,
    itemType: 'YARN',
    name: 'Blue Yarn',
    colors: [],
    createdAt: 0,
    ...overrides,
  }
}

describe('libraryItemImagesForProject', () => {
  it('returns empty array when item has no images', () => {
    expect(libraryItemImagesForProject(makeLibraryItem())).toEqual([])
  })

  it('returns empty array when images is null', () => {
    expect(libraryItemImagesForProject(makeLibraryItem({ images: null as never }))).toEqual([])
  })

  it('places the main image first', () => {
    const item = makeLibraryItem({
      images: [
        { id: 1, storedName: 'first.jpg', originalName: 'first.jpg', isMain: false, libraryItemId: 1 },
        { id: 2, storedName: 'main.jpg', originalName: 'main.jpg', isMain: true, libraryItemId: 1 },
      ],
    })
    const result = libraryItemImagesForProject(item)
    expect(result[0].storedName).toBe('main.jpg')
  })

  it('returns all images when none is marked as main', () => {
    const item = makeLibraryItem({
      images: [
        { id: 1, storedName: 'a.jpg', originalName: 'a.jpg', isMain: false, libraryItemId: 1 },
        { id: 2, storedName: 'b.jpg', originalName: 'b.jpg', isMain: false, libraryItemId: 1 },
      ],
    })
    expect(libraryItemImagesForProject(item)).toHaveLength(2)
  })

  it('maps to storedName and originalName only', () => {
    const item = makeLibraryItem({
      images: [{ id: 1, storedName: 'x.jpg', originalName: 'x-orig.jpg', isMain: false, libraryItemId: 1 }],
    })
    const result = libraryItemImagesForProject(item)
    expect(result[0]).toEqual({ storedName: 'x.jpg', originalName: 'x-orig.jpg' })
  })

  it('falls back to empty string for missing originalName', () => {
    const item = makeLibraryItem({
      images: [{ id: 1, storedName: 'x.jpg', originalName: undefined as never, isMain: false, libraryItemId: 1 }],
    })
    const result = libraryItemImagesForProject(item)
    expect(result[0].originalName).toBe('')
  })
})
