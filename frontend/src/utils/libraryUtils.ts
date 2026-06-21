import type { LibraryItem, LibraryItemType } from '../types'
import type { TFunction } from 'i18next'

export const COLOR_ITEM_TYPES: LibraryItemType[] = ['YARN', 'FABRIC']

export type LibraryFormFields = {
  name: string
  colors: string[]
  yarnBrand: string
  yarnMaterial: string
  yarnAmountG: string
  yarnAmountM: string
  fabricLength: string
  fabricWidth: string
  needleSize: string
  circularLength: string
  hookSize: string
}

export function parseOptionalInt(value: string): number | undefined {
  if (!value.trim()) return undefined
  const n = parseInt(value, 10)
  return Number.isFinite(n) ? n : undefined
}

export function libraryFieldsToPayload(itemType: LibraryItemType, fields: LibraryFormFields, fallbackName?: string) {
  const hasColors = COLOR_ITEM_TYPES.includes(itemType)
  return {
    name: fields.name.trim() || fallbackName || fields.name,
    colors: hasColors ? fields.colors : undefined,
    yarnBrand: itemType === 'YARN' ? fields.yarnBrand || undefined : undefined,
    yarnMaterial: itemType === 'YARN' ? fields.yarnMaterial || undefined : undefined,
    yarnAmountG: itemType === 'YARN' ? parseOptionalInt(fields.yarnAmountG) : undefined,
    yarnAmountM: itemType === 'YARN' ? parseOptionalInt(fields.yarnAmountM) : undefined,
    fabricLengthCm: itemType === 'FABRIC' ? parseOptionalInt(fields.fabricLength) : undefined,
    fabricWidthCm: itemType === 'FABRIC' ? parseOptionalInt(fields.fabricWidth) : undefined,
    needleSizeMm: itemType === 'KNITTING_NEEDLE' ? fields.needleSize || undefined : undefined,
    circularLengthCm: itemType === 'KNITTING_NEEDLE' ? parseOptionalInt(fields.circularLength) : undefined,
    hookSizeMm: itemType === 'CROCHET_HOOK' ? fields.hookSize || undefined : undefined,
  }
}

export function libraryItemImageUrl(item: { images?: { storedName: string; isMain: boolean }[] }): string | undefined {
  const main = item.images?.find(i => i.isMain) ?? item.images?.[0]
  return main?.storedName
}

export function isImageUrl(url: string): boolean {
  const path = url.split(/[?#]/)[0]
  return /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(path)
}

export function itemSummary(item: LibraryItem): string {
  if (item.itemType === 'YARN') {
    const parts = [item.yarnBrand, item.yarnMaterial].filter(Boolean).join(', ')
    const amounts = [item.yarnAmountG && `${item.yarnAmountG}g`, item.yarnAmountM && `${item.yarnAmountM}m`]
      .filter(Boolean)
      .join(' / ')
    return [parts, amounts].filter(Boolean).join(' · ')
  }
  if (item.itemType === 'FABRIC')
    return [item.fabricLengthCm && `${item.fabricLengthCm}cm`, item.fabricWidthCm && `${item.fabricWidthCm}cm`]
      .filter(Boolean)
      .join(' × ')
  if (item.itemType === 'KNITTING_NEEDLE')
    return [item.needleSizeMm && `${item.needleSizeMm} mm`, item.circularLengthCm && `${item.circularLengthCm} cm`]
      .filter(Boolean)
      .join(', ')
  if (item.itemType === 'CROCHET_HOOK') return item.hookSizeMm ? `${item.hookSizeMm} mm` : ''
  return ''
}

export function typeLabel(type: LibraryItemType, t: TFunction): string {
  if (type === 'YARN') return t('lib_yarn')
  if (type === 'FABRIC') return t('lib_fabric')
  if (type === 'KNITTING_NEEDLE') return t('lib_knitting_needle')
  if (type === 'CROCHET_HOOK') return t('lib_crochet_hook')
  return type
}
