import { describe, it, expect } from 'vitest'
import {
  rowToProject,
  rowToLibraryItem,
  parsePinterestUrls,
  parseColors,
  detectFileType,
  type DbProject,
  type DbLibraryItem,
} from './mappers'

// ──────── parsePinterestUrls ────────

describe('parsePinterestUrls', () => {
  it('parses a JSON array of strings', () => {
    expect(parsePinterestUrls('["https://a.com","https://b.com"]')).toEqual(['https://a.com', 'https://b.com'])
  })

  it('returns [] for null, empty, or invalid JSON', () => {
    expect(parsePinterestUrls(null)).toEqual([])
    expect(parsePinterestUrls('')).toEqual([])
    expect(parsePinterestUrls('not json')).toEqual([])
  })

  it('filters out non-string entries', () => {
    expect(parsePinterestUrls('["ok", 5, null]')).toEqual(['ok'])
  })

  it('returns [] when the JSON is not an array', () => {
    expect(parsePinterestUrls('{"a":1}')).toEqual([])
  })
})

// ──────── parseColors ────────

describe('parseColors', () => {
  it('splits a comma-separated string', () => {
    expect(parseColors('red,blue,green')).toEqual(['red', 'blue', 'green'])
  })

  it('drops empty segments and handles null', () => {
    expect(parseColors('red,,blue')).toEqual(['red', 'blue'])
    expect(parseColors(null)).toEqual([])
    expect(parseColors('')).toEqual([])
  })
})

// ──────── detectFileType ────────

describe('detectFileType', () => {
  it('classifies images by mime type', () => {
    expect(detectFileType('image/png', 'x.png')).toBe('image')
  })

  it('classifies pdfs by mime or extension', () => {
    expect(detectFileType('application/pdf', 'x.pdf')).toBe('pdf')
    expect(detectFileType('application/octet-stream', 'pattern.pdf')).toBe('pdf')
  })

  it('classifies word documents', () => {
    expect(detectFileType('application/msword', 'a.doc')).toBe('word')
    expect(detectFileType('application/octet-stream', 'a.docx')).toBe('word')
  })

  it('falls back to other', () => {
    expect(detectFileType('application/octet-stream', 'data.bin')).toBe('other')
  })
})

// ──────── rowToProject ────────

const baseProjectRow: DbProject = {
  id: 1,
  user_id: 'user-1',
  name: 'Sweater',
  description: 'desc',
  category: 'KNITTING',
  tags: 'wip',
  notes: 'private',
  recipe_text: 'recipe',
  pinterest_board_urls: '["https://pin.it/1"]',
  craft_details: '{"gauge":"20"}',
  start_date: 1700000000000,
  end_date: null,
  is_public: true,
  created_at: 1699000000000,
  updated_at: 1699500000000,
  materials: [
    {
      id: 10,
      project_id: 1,
      name: 'Wool',
      type: 'yarn',
      item_type: null,
      color: 'red',
      color_hex: '#ff0000',
      amount: '100',
      unit: 'g',
    },
  ],
  project_images: [
    {
      id: 1,
      project_id: 1,
      material_id: null,
      original_name: 'cover.jpg',
      section: 'cover',
      stored_name: 'https://x/cover.jpg',
      is_main: true,
    },
    {
      id: 2,
      project_id: 1,
      material_id: 10,
      original_name: 'mat.jpg',
      section: 'material',
      stored_name: 'https://x/mat.jpg',
      is_main: true,
    },
  ],
  project_files: [
    {
      id: 5,
      project_id: 1,
      original_name: 'p.pdf',
      stored_name: 'https://x/p.pdf',
      mime_type: 'application/pdf',
      file_type: 'pdf',
      uploaded_at: 1699000000001,
    },
  ],
  pattern_grids: [{ id: 7, project_id: 1, rows: 10, cols: 10, cell_data: '[]' }],
  row_counters: [{ id: 3, project_id: 1, stitches_per_round: 8, total_rounds: 12, checked_stitches: '[]' }],
}

describe('rowToProject', () => {
  it('maps snake_case columns to camelCase fields', () => {
    const p = rowToProject(baseProjectRow)
    expect(p.id).toBe(1)
    expect(p.recipeText).toBe('recipe')
    expect(p.isPublic).toBe(true)
    expect(p.startDate).toBe(1700000000000)
    expect(p.endDate).toBeUndefined()
    expect(p.userId).toBe('user-1')
  })

  it('parses pinterest urls and keeps craftDetails as a string', () => {
    const p = rowToProject(baseProjectRow)
    expect(p.pinterestBoardUrls).toEqual(['https://pin.it/1'])
    expect(p.craftDetails).toBe('{"gauge":"20"}')
  })

  it('splits cover images from material images', () => {
    const p = rowToProject(baseProjectRow)
    expect(p.coverImages).toHaveLength(1)
    expect(p.coverImages[0].storedName).toBe('https://x/cover.jpg')
    expect(p.materials[0].images).toHaveLength(1)
    expect(p.materials[0].images[0].materialId).toBe(10)
  })

  it('maps the row counter from an array embed', () => {
    const p = rowToProject(baseProjectRow)
    expect(p.rowCounter).toEqual({ id: 3, stitchesPerRound: 8, totalRounds: 12, checkedStitches: '[]' })
  })

  it('maps the row counter from a to-one (object) embed', () => {
    const row = {
      ...baseProjectRow,
      row_counters: { id: 9, project_id: 1, stitches_per_round: 4, total_rounds: 5, checked_stitches: '[1]' },
    }
    const p = rowToProject(row)
    expect(p.rowCounter?.id).toBe(9)
    expect(p.rowCounter?.stitchesPerRound).toBe(4)
  })

  it('defaults missing collections and nullable fields', () => {
    const sparse: DbProject = {
      id: 2,
      user_id: null,
      name: null,
      description: null,
      category: 'CROCHET',
      tags: null,
      notes: null,
      recipe_text: null,
      pinterest_board_urls: null,
      craft_details: null,
      start_date: null,
      end_date: null,
      is_public: false,
      created_at: 0,
      updated_at: 0,
    }
    const p = rowToProject(sparse)
    expect(p.name).toBe('')
    expect(p.craftDetails).toBe('{}')
    expect(p.coverImages).toEqual([])
    expect(p.materials).toEqual([])
    expect(p.files).toEqual([])
    expect(p.patternGrids).toEqual([])
    expect(p.rowCounter).toBeUndefined()
  })
})

// ──────── rowToLibraryItem ────────

const libraryRow: DbLibraryItem = {
  id: 1,
  user_id: 'user-1',
  item_type: 'YARN',
  name: 'Merino',
  colors: 'blue,white',
  yarn_material: 'wool',
  yarn_brand: 'Drops',
  yarn_amountg: 100,
  yarn_amountm: 200,
  fabric_width_cm: null,
  fabric_length_cm: null,
  needle_size_mm: null,
  circular_length_cm: null,
  hook_size_mm: null,
  created_at: 123,
  library_item_images: [
    { id: 4, library_item_id: 1, original_name: 'a.jpg', stored_name: 'https://x/a.jpg', is_main: true },
  ],
}

describe('rowToLibraryItem', () => {
  it('maps fields and splits colors', () => {
    const item = rowToLibraryItem(libraryRow)
    expect(item.itemType).toBe('YARN')
    expect(item.colors).toEqual(['blue', 'white'])
    expect(item.yarnAmountG).toBe(100)
    expect(item.yarnAmountM).toBe(200)
    expect(item.images?.[0].libraryItemId).toBe(1)
  })

  it('omits null optional fields and defaults images', () => {
    const item = rowToLibraryItem({ ...libraryRow, library_item_images: null, yarn_material: null })
    expect(item.yarnMaterial).toBeUndefined()
    expect(item.images).toEqual([])
  })
})
