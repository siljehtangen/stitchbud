import { GiChopsticks, GiPirateHook, GiSewingMachine } from 'react-icons/gi'
import type { TFunction } from 'i18next'
import type { ProjectCategory } from '../types'

export const CATEGORIES: ProjectCategory[] = ['KNITTING', 'CROCHET', 'SEWING']

export const CATEGORY_ICONS: Record<ProjectCategory, React.ReactNode> = {
  KNITTING: <GiChopsticks className="text-sand-green-dark" />,
  CROCHET: <GiPirateHook className="text-sand-blue-deep" />,
  SEWING: <GiSewingMachine className="text-warm-gray" />,
}

export function categoryLabel(cat: ProjectCategory, t: TFunction): string {
  return t(`category_${cat.toLowerCase()}` as const)
}

export function categoryBadgeClass(cat: ProjectCategory): string {
  if (cat === 'KNITTING') return 'badge-knitting'
  if (cat === 'CROCHET') return 'badge-crochet'
  return 'badge-sewing'
}
