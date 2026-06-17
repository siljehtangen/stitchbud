import type { LibraryItem, LibraryItemType } from '../types'
import type { TFunction } from 'i18next'

export function libraryItemImageUrl(item: { images?: { storedName: string; isMain: boolean }[] }): string | undefined {
  const main = item.images?.find(i => i.isMain) ?? item.images?.[0]
  return main?.storedName
}

export function isImageUrl(url: string): boolean {
  // Signed storage URLs append ?token=… so the extension is not at the end of the string.
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
