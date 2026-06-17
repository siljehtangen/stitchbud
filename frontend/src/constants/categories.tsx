import { GiChopsticks, GiPirateHook, GiSewingMachine } from 'react-icons/gi'
import type { TFunction } from 'i18next'
import type { ProjectCategory } from '../types'

export const CATEGORIES: ProjectCategory[] = ['KNITTING', 'CROCHET', 'SEWING']

export const CATEGORY_ICONS: Record<ProjectCategory, React.ReactNode> = {
  KNITTING: <GiChopsticks className="text-sand-green-dark" />,
  CROCHET: <GiPirateHook className="text-sand-green-dark" />,
  SEWING: <GiSewingMachine className="text-sand-green-dark" />,
}

export function categoryLabel(cat: ProjectCategory, t: TFunction): string {
  return t(`category_${cat.toLowerCase()}` as const)
}

export function categoryBadgeClass(cat: ProjectCategory): string {
  if (cat === 'KNITTING') return 'badge-knitting'
  if (cat === 'CROCHET') return 'badge-crochet'
  return 'badge-sewing'
}

/**
 * Craft accents follow the active color palette (the `--accent` CSS variable),
 * so they re-tint when the user switches theme. The values are intentionally
 * identical across crafts. Used for category badges, dashboard stat tiles, and
 * progress bars.
 */
export type CraftAccent = {
  base: string
  bg: string
  text: string
}

const PALETTE_ACCENT: CraftAccent = {
  base: 'rgb(var(--accent))',
  bg: 'rgb(var(--accent) / 0.16)',
  text: 'rgb(var(--accent))',
}

export const CATEGORY_ACCENT: Record<ProjectCategory, CraftAccent> = {
  KNITTING: PALETTE_ACCENT,
  CROCHET: PALETTE_ACCENT,
  SEWING: PALETTE_ACCENT,
}
