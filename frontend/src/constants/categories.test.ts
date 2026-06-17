import { describe, it, expect } from 'vitest'
import type { TFunction } from 'i18next'
import { categoryLabel, categoryBadgeClass } from './categories'

describe('categoryLabel', () => {
  const t = ((key: string) => `translated:${key}`) as TFunction

  it.each([
    ['KNITTING', 'category_knitting'],
    ['CROCHET', 'category_crochet'],
    ['SEWING', 'category_sewing'],
  ] as const)('translates %s', (cat, key) => {
    expect(categoryLabel(cat, t)).toBe(`translated:${key}`)
  })
})

describe('categoryBadgeClass', () => {
  it.each([
    ['KNITTING', 'badge-knitting'],
    ['CROCHET', 'badge-crochet'],
    ['SEWING', 'badge-sewing'],
  ] as const)('returns the badge class for %s', (cat, cls) => {
    expect(categoryBadgeClass(cat)).toBe(cls)
  })
})
