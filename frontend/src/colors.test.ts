import { describe, it, expect } from 'vitest'
import { COLORS, COLOR_MAP, COLOR_MAP_BY_HEX, getColorName, getColorNameByHex, resolveColorDisplay } from './colors'

// ──────── COLORS data integrity ────────

describe('COLORS', () => {
  it('every entry has a non-empty name, nameEn, and hex', () => {
    for (const c of COLORS) {
      expect(c.name.length).toBeGreaterThan(0)
      expect(c.nameEn.length).toBeGreaterThan(0)
      expect(c.hex.length).toBeGreaterThan(0)
    }
  })

  it('every hex is a valid CSS hex color', () => {
    for (const c of COLORS) {
      expect(c.hex).toMatch(/^#[0-9A-Fa-f]{6}$/)
    }
  })

  it('has no duplicate Norwegian names', () => {
    const names = COLORS.map(c => c.name)
    expect(new Set(names).size).toBe(names.length)
  })

  it('has no duplicate hex values', () => {
    const hexes = COLORS.map(c => c.hex)
    expect(new Set(hexes).size).toBe(hexes.length)
  })
})

// ──────── COLOR_MAP ────────

describe('COLOR_MAP', () => {
  it('maps Norwegian name to hex for every color', () => {
    for (const c of COLORS) {
      expect(COLOR_MAP[c.name]).toBe(c.hex)
    }
  })

  it('returns undefined for an unknown name', () => {
    expect(COLOR_MAP['NotAColor']).toBeUndefined()
  })
})

// ──────── COLOR_MAP_BY_HEX ────────

describe('COLOR_MAP_BY_HEX', () => {
  it('maps hex to the full ColorOption for every color', () => {
    for (const c of COLORS) {
      expect(COLOR_MAP_BY_HEX[c.hex]).toEqual(c)
    }
  })

  it('returns undefined for an unknown hex', () => {
    expect(COLOR_MAP_BY_HEX['#123456']).toBeUndefined()
  })
})

// ──────── getColorName ────────

describe('getColorName', () => {
  const sample = COLORS[0]

  it('returns the English name when lang is "en"', () => {
    expect(getColorName(sample, 'en')).toBe(sample.nameEn)
  })

  it('returns the Norwegian name for any other lang', () => {
    expect(getColorName(sample, 'no')).toBe(sample.name)
    expect(getColorName(sample, 'fr')).toBe(sample.name)
  })
})

// ──────── getColorNameByHex ────────

describe('getColorNameByHex', () => {
  it('returns the Norwegian name for a known hex in Norwegian', () => {
    const color = COLORS[0]
    expect(getColorNameByHex(color.hex, 'no')).toBe(color.name)
  })

  it('returns the English name for a known hex in English', () => {
    const color = COLORS[0]
    expect(getColorNameByHex(color.hex, 'en')).toBe(color.nameEn)
  })

  it('returns the hex itself for an unknown hex', () => {
    expect(getColorNameByHex('#ABCDEF', 'no')).toBe('#ABCDEF')
    expect(getColorNameByHex('#ABCDEF', 'en')).toBe('#ABCDEF')
  })
})

// ──────── resolveColorDisplay ────────

describe('resolveColorDisplay', () => {
  it('resolves a known Norwegian color name to its hex and display name', () => {
    const color = COLORS[0]
    const result = resolveColorDisplay(color.name, 'no')
    expect(result.hex).toBe(color.hex)
    expect(result.displayName).toBe(color.name)
  })

  it('uses English displayName when lang is "en"', () => {
    const color = COLORS[0]
    const result = resolveColorDisplay(color.name, 'en')
    expect(result.displayName).toBe(color.nameEn)
  })

  it('returns #ccc and the raw name for an unknown color', () => {
    const result = resolveColorDisplay('UnknownColor', 'no')
    expect(result.hex).toBe('#ccc')
    expect(result.displayName).toBe('UnknownColor')
  })

  it('falls back to raw name as displayName when hex has no matching entry', () => {
    // Use a hex that is not in COLOR_MAP_BY_HEX (unknown color name → #ccc fallback)
    const result = resolveColorDisplay('Ghost', 'en')
    expect(result.displayName).toBe('Ghost')
  })
})
