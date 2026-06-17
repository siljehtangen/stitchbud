import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useLibraryFilter } from './useLibraryFilter'
import type { LibraryItem } from '../types'

vi.mock('../components/LibraryItemForm', () => ({
  COLOR_ITEM_TYPES: ['YARN', 'FABRIC'],
}))

function makeItem(overrides: Partial<LibraryItem>): LibraryItem {
  return {
    id: 1,
    itemType: 'YARN',
    name: '',
    colors: [],
    createdAt: 0,
    ...overrides,
  }
}

const items: LibraryItem[] = [
  makeItem({ id: 1, itemType: 'YARN', name: 'Merino', yarnBrand: 'Drops', colors: ['red', 'blue'] }),
  makeItem({ id: 2, itemType: 'FABRIC', name: 'Cotton', colors: ['white'] }),
  makeItem({ id: 3, itemType: 'KNITTING_NEEDLE', name: '4mm Needle', needleSizeMm: '4' }),
  makeItem({ id: 4, itemType: 'CROCHET_HOOK', name: 'Hook 5mm', hookSizeMm: '5' }),
]

describe('useLibraryFilter', () => {
  it('returns all items with no filters applied', () => {
    const { result } = renderHook(() => useLibraryFilter(items))

    expect(result.current.filtered).toHaveLength(4)
  })

  it('filters by item type', () => {
    const { result } = renderHook(() => useLibraryFilter(items))

    act(() => result.current.setFilterType('YARN'))

    expect(result.current.filtered).toHaveLength(1)
    expect(result.current.filtered[0].itemType).toBe('YARN')
  })

  it('clears the type filter when reset to null', () => {
    const { result } = renderHook(() => useLibraryFilter(items))

    act(() => result.current.setFilterType('KNITTING_NEEDLE'))
    act(() => result.current.setFilterType(null))

    expect(result.current.filtered).toHaveLength(4)
  })

  it('filters by search term matching name', () => {
    const { result } = renderHook(() => useLibraryFilter(items))

    act(() => result.current.setSearch('cotton'))

    expect(result.current.filtered).toHaveLength(1)
    expect(result.current.filtered[0].id).toBe(2)
  })

  it('filters by search term matching yarnBrand', () => {
    const { result } = renderHook(() => useLibraryFilter(items))

    act(() => result.current.setSearch('drops'))

    expect(result.current.filtered).toHaveLength(1)
    expect(result.current.filtered[0].id).toBe(1)
  })

  it('filters by search term matching needle size', () => {
    const { result } = renderHook(() => useLibraryFilter(items))

    act(() => result.current.setSearch('4mm'))

    expect(result.current.filtered).toHaveLength(1)
    expect(result.current.filtered[0].id).toBe(3)
  })

  it('filters by color', () => {
    const { result } = renderHook(() => useLibraryFilter(items))

    act(() => result.current.setFilterColors(['red']))

    expect(result.current.filtered).toHaveLength(1)
    expect(result.current.filtered[0].id).toBe(1)
  })

  it('includes items matching any of the selected colors', () => {
    const { result } = renderHook(() => useLibraryFilter(items))

    act(() => result.current.setFilterColors(['blue', 'white']))

    expect(result.current.filtered).toHaveLength(2)
  })

  it('clears selected colors when the type filter changes', () => {
    const { result } = renderHook(() => useLibraryFilter(items))

    act(() => result.current.setFilterColors(['red']))
    act(() => result.current.setFilterType('FABRIC'))

    expect(result.current.filterColors).toEqual([])
  })

  it('shows the color filter when no type is selected', () => {
    const { result } = renderHook(() => useLibraryFilter(items))

    expect(result.current.showColorFilter).toBe(true)
  })

  it('shows the color filter for YARN and FABRIC', () => {
    const { result } = renderHook(() => useLibraryFilter(items))

    act(() => result.current.setFilterType('YARN'))
    expect(result.current.showColorFilter).toBe(true)

    act(() => result.current.setFilterType('FABRIC'))
    expect(result.current.showColorFilter).toBe(true)
  })

  it('hides the color filter for types without colors', () => {
    const { result } = renderHook(() => useLibraryFilter(items))

    act(() => result.current.setFilterType('KNITTING_NEEDLE'))
    expect(result.current.showColorFilter).toBe(false)

    act(() => result.current.setFilterType('CROCHET_HOOK'))
    expect(result.current.showColorFilter).toBe(false)
  })

  it('collects available colors from YARN and FABRIC items only', () => {
    const { result } = renderHook(() => useLibraryFilter(items))

    expect(result.current.availableColors).toEqual(expect.arrayContaining(['red', 'blue', 'white']))
    expect(result.current.availableColors).toHaveLength(3)
  })
})
