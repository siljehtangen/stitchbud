import { useState } from 'react'
import type { LibraryItem, LibraryItemType } from '../types'
import { COLOR_ITEM_TYPES } from '../components/LibraryItemForm'

export function useLibraryFilter(items: LibraryItem[]) {
  const [filterType, setFilterType] = useState<LibraryItemType | null>(null)
  const [filterColors, setFilterColors] = useState<string[]>([])
  const [search, setSearch] = useState('')

  const showColorFilter = filterType === null || COLOR_ITEM_TYPES.includes(filterType)

  const colorableItems = items.filter(i => COLOR_ITEM_TYPES.includes(i.itemType as LibraryItemType))
  const availableColors = Array.from(new Set(colorableItems.flatMap(i => i.colors ?? [])))

  const q = search.toLowerCase()
  const filtered = items.filter(i => {
    if (filterType && i.itemType !== filterType) return false
    if (filterColors.length > 0 && !filterColors.some(c => (i.colors ?? []).includes(c))) return false
    if (!q) return true
    return [
      i.name,
      i.yarnBrand,
      i.yarnMaterial,
      i.needleSizeMm,
      i.hookSizeMm,
      i.fabricLengthCm != null ? String(i.fabricLengthCm) : null,
      i.fabricWidthCm != null ? String(i.fabricWidthCm) : null,
    ].some(v => v?.toLowerCase().includes(q))
  })

  function setFilterTypeAndClearColors(type: LibraryItemType | null) {
    setFilterType(type)
    setFilterColors([])
  }

  return {
    filterType, setFilterType: setFilterTypeAndClearColors,
    filterColors, setFilterColors,
    search, setSearch,
    showColorFilter, availableColors, filtered,
  }
}
