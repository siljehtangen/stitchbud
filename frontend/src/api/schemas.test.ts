import { describe, it, expect, vi } from 'vitest'
import {
  projectSchema,
  libraryItemSchema,
  friendSchema,
  friendRequestSchema,
  safeParsed,
  setSchemaMismatchReporter,
} from './schemas'

const minimalProject = {
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

describe('projectSchema', () => {
  it('parses a minimal valid project', () => {
    const result = projectSchema.safeParse(minimalProject)
    expect(result.success).toBe(true)
  })

  it('parses a project with all optional fields', () => {
    const full = {
      ...minimalProject,
      startDate: 1700000000,
      endDate: 1800000000,
      userId: 'user-1',
      rowCounter: { id: 1, stitchesPerRound: 8, totalRounds: 10, checkedStitches: '[]' },
      materials: [
        {
          id: 1,
          name: 'Wool',
          type: 'yarn',
          color: 'red',
          colorHex: '#ff0000',
          amount: '100',
          unit: 'g',
          images: [
            {
              id: 1,
              storedName: 'img.jpg',
              originalName: 'img.jpg',
              section: 'cover',
              isMain: true,
              projectId: 1,
            },
          ],
        },
      ],
    }
    const result = projectSchema.safeParse(full)
    expect(result.success).toBe(true)
  })

  it('rejects invalid category', () => {
    const result = projectSchema.safeParse({ ...minimalProject, category: 'WEAVING' })
    expect(result.success).toBe(false)
  })

  it('rejects missing required fields', () => {
    const result = projectSchema.safeParse({ ...minimalProject, name: undefined })
    expect(result.success).toBe(false)
  })

  it('rejects non-boolean isPublic', () => {
    const result = projectSchema.safeParse({ ...minimalProject, isPublic: 'yes' })
    expect(result.success).toBe(false)
  })

  it('accepts CROCHET and SEWING categories', () => {
    expect(projectSchema.safeParse({ ...minimalProject, category: 'CROCHET' }).success).toBe(true)
    expect(projectSchema.safeParse({ ...minimalProject, category: 'SEWING' }).success).toBe(true)
  })

  it('accepts rowCounter as optional', () => {
    const result = projectSchema.safeParse({ ...minimalProject, rowCounter: undefined })
    expect(result.success).toBe(true)
  })
})

const minimalLibraryItem = {
  id: 1,
  itemType: 'YARN',
  name: 'Blue Merino',
  colors: ['blue'],
  createdAt: 0,
}

describe('libraryItemSchema', () => {
  it('parses a minimal yarn item', () => {
    const result = libraryItemSchema.safeParse(minimalLibraryItem)
    expect(result.success).toBe(true)
  })

  it('parses all valid item types', () => {
    for (const itemType of ['YARN', 'FABRIC', 'KNITTING_NEEDLE', 'CROCHET_HOOK']) {
      const result = libraryItemSchema.safeParse({ ...minimalLibraryItem, itemType })
      expect(result.success).toBe(true)
    }
  })

  it('rejects invalid item type', () => {
    const result = libraryItemSchema.safeParse({ ...minimalLibraryItem, itemType: 'SCISSORS' })
    expect(result.success).toBe(false)
  })

  it('parses optional yarn fields', () => {
    const result = libraryItemSchema.safeParse({
      ...minimalLibraryItem,
      yarnMaterial: 'Merino',
      yarnBrand: 'Drops',
      yarnAmountG: 100,
      yarnAmountM: 200,
    })
    expect(result.success).toBe(true)
  })

  it('parses optional needle fields', () => {
    const result = libraryItemSchema.safeParse({
      ...minimalLibraryItem,
      itemType: 'KNITTING_NEEDLE',
      needleSizeMm: '4.0',
      circularLengthCm: 80,
    })
    expect(result.success).toBe(true)
  })

  it('parses images when provided', () => {
    const result = libraryItemSchema.safeParse({
      ...minimalLibraryItem,
      images: [{ id: 1, storedName: 'img.jpg', originalName: 'img.jpg', isMain: true, libraryItemId: 1 }],
    })
    expect(result.success).toBe(true)
  })

  it('accepts empty colors array', () => {
    const result = libraryItemSchema.safeParse({ ...minimalLibraryItem, colors: [] })
    expect(result.success).toBe(true)
  })
})

describe('friendSchema', () => {
  it('parses a valid friend', () => {
    const result = friendSchema.safeParse({
      friendshipId: 1,
      userId: 'user-2',
      displayName: 'Alice',
      email: 'alice@test.com',
    })
    expect(result.success).toBe(true)
  })

  it('accepts null displayName', () => {
    const result = friendSchema.safeParse({
      friendshipId: 1,
      userId: 'user-2',
      displayName: null,
      email: 'alice@test.com',
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing email', () => {
    const result = friendSchema.safeParse({ friendshipId: 1, userId: 'u', displayName: null })
    expect(result.success).toBe(false)
  })
})

describe('friendRequestSchema', () => {
  it('parses a valid friend request', () => {
    const result = friendRequestSchema.safeParse({
      friendshipId: 2,
      requesterId: 'user-1',
      requesterDisplayName: 'Bob',
      requesterEmail: 'bob@test.com',
      createdAt: 1700000000,
    })
    expect(result.success).toBe(true)
  })

  it('accepts null requesterDisplayName', () => {
    const result = friendRequestSchema.safeParse({
      friendshipId: 2,
      requesterId: 'user-1',
      requesterDisplayName: null,
      requesterEmail: 'bob@test.com',
      createdAt: 0,
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing createdAt', () => {
    const result = friendRequestSchema.safeParse({
      friendshipId: 2,
      requesterId: 'user-1',
      requesterDisplayName: null,
      requesterEmail: 'bob@test.com',
    })
    expect(result.success).toBe(false)
  })
})

describe('safeParsed', () => {
  it('returns parsed data when schema matches', () => {
    const data = { friendshipId: 1, userId: 'u', displayName: null, email: 'e@t.com' }
    const result = safeParsed(friendSchema, data, 'test')
    expect(result).toEqual(data)
  })

  it('returns raw data and logs warning when schema does not match', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const badData = { unexpected: true }
    const result = safeParsed(friendSchema, badData, 'test-ctx')
    expect(result).toBe(badData)
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('test-ctx'), expect.anything())
    warn.mockRestore()
  })

  it('uses a custom mismatch reporter when configured', () => {
    const reporter = vi.fn()
    setSchemaMismatchReporter(reporter)
    const badData = { unexpected: true }
    safeParsed(friendSchema, badData, 'custom-ctx')
    expect(reporter).toHaveBeenCalledWith('custom-ctx', expect.any(Array))
    setSchemaMismatchReporter((context, issues) => {
      console.warn(`[API] Schema mismatch for ${context}:`, issues)
    })
  })
})
