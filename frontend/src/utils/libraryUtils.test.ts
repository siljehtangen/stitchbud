import { describe, it, expect } from 'vitest'
import { libraryItemImageUrl, isImageUrl, itemSummary } from './libraryUtils'
import type { LibraryItem } from '../types'

describe('libraryItemImageUrl', () => {
  it('returns the storedName of the main image', () => {
    const item = {
      images: [
        { storedName: 'other.jpg', isMain: false },
        { storedName: 'main.jpg', isMain: true },
      ],
    }
    expect(libraryItemImageUrl(item)).toBe('main.jpg')
  })

  it('falls back to the first image when none is marked as main', () => {
    const item = {
      images: [
        { storedName: 'first.jpg', isMain: false },
        { storedName: 'second.jpg', isMain: false },
      ],
    }
    expect(libraryItemImageUrl(item)).toBe('first.jpg')
  })

  it('returns undefined when images array is empty', () => {
    expect(libraryItemImageUrl({ images: [] })).toBeUndefined()
  })

  it('returns undefined when images is absent', () => {
    expect(libraryItemImageUrl({})).toBeUndefined()
  })
})

describe('isImageUrl', () => {
  it.each(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'])('returns true for %s extension', ext => {
    expect(isImageUrl(`photo${ext}`)).toBe(true)
    expect(isImageUrl(`photo${ext.toUpperCase()}`)).toBe(true)
  })

  it('returns false for non-image extensions', () => {
    expect(isImageUrl('document.pdf')).toBe(false)
    expect(isImageUrl('notes.txt')).toBe(false)
    expect(isImageUrl('file.doc')).toBe(false)
  })

  it('returns true for signed storage URLs with query params', () => {
    expect(isImageUrl('https://example.supabase.co/storage/v1/object/sign/bucket/library/1/a.jpg?token=abc')).toBe(true)
  })
})

describe('itemSummary', () => {
  const base: Omit<LibraryItem, 'itemType'> = {
    id: 1,
    name: 'Test',
    colors: [],
    createdAt: 0,
  }

  it('formats a YARN item with brand, material, and amounts', () => {
    const item: LibraryItem = {
      ...base,
      itemType: 'YARN',
      yarnBrand: 'Drops',
      yarnMaterial: 'Wool',
      yarnAmountG: 100,
      yarnAmountM: 200,
    }
    expect(itemSummary(item)).toBe('Drops, Wool · 100g / 200m')
  })

  it('formats a YARN item with only a brand', () => {
    const item: LibraryItem = { ...base, itemType: 'YARN', yarnBrand: 'Drops' }
    expect(itemSummary(item)).toBe('Drops')
  })

  it('formats a YARN item with only an amount', () => {
    const item: LibraryItem = { ...base, itemType: 'YARN', yarnAmountG: 50 }
    expect(itemSummary(item)).toBe('50g')
  })

  it('formats a FABRIC item with length and width', () => {
    const item: LibraryItem = { ...base, itemType: 'FABRIC', fabricLengthCm: 150, fabricWidthCm: 90 }
    expect(itemSummary(item)).toBe('150cm × 90cm')
  })

  it('formats a KNITTING_NEEDLE item with size and circular length', () => {
    const item: LibraryItem = {
      ...base,
      itemType: 'KNITTING_NEEDLE',
      needleSizeMm: '3.5',
      circularLengthCm: 80,
    }
    expect(itemSummary(item)).toBe('3.5 mm, 80 cm')
  })

  it('formats a CROCHET_HOOK item with size', () => {
    const item: LibraryItem = { ...base, itemType: 'CROCHET_HOOK', hookSizeMm: '4.0' }
    expect(itemSummary(item)).toBe('4.0 mm')
  })

  it('returns empty string for a CROCHET_HOOK with no size', () => {
    const item: LibraryItem = { ...base, itemType: 'CROCHET_HOOK' }
    expect(itemSummary(item)).toBe('')
  })
})
