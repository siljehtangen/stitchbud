import { describe, it, expect, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useProjectTabs } from './useProjectTabs'
import type { Project } from '../types'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 1,
    name: 'Test',
    description: '',
    category: 'KNITTING',
    tags: '',
    coverImages: [],
    notes: '',
    recipeText: '',
    pinterestBoardUrls: [],
    craftDetails: '',
    materials: [],
    files: [],
    patternGrids: [],
    isPublic: false,
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  }
}

describe('useProjectTabs', () => {
  it('returns empty array when project is null', () => {
    const { result } = renderHook(() => useProjectTabs(null))
    expect(result.current).toHaveLength(0)
  })

  it('returns 5 tabs for a knitting project', () => {
    const { result } = renderHook(() => useProjectTabs(makeProject({ category: 'KNITTING' })))
    expect(result.current).toHaveLength(5)
  })

  it('returns 5 tabs for a crochet project', () => {
    const { result } = renderHook(() => useProjectTabs(makeProject({ category: 'CROCHET' })))
    expect(result.current).toHaveLength(5)
  })

  it('returns 4 tabs for a sewing project (no knit/crochet tab)', () => {
    const { result } = renderHook(() => useProjectTabs(makeProject({ category: 'SEWING' })))
    expect(result.current).toHaveLength(4)
  })

  it('always includes info, materials, recipe, and overview tabs', () => {
    const { result } = renderHook(() => useProjectTabs(makeProject({ category: 'SEWING' })))
    const ids = result.current.map(t => t.id)
    expect(ids).toContain('info')
    expect(ids).toContain('materials')
    expect(ids).toContain('recipe')
    expect(ids).toContain('overview')
  })

  it('includes knit tab for KNITTING with label from translation key', () => {
    const { result } = renderHook(() => useProjectTabs(makeProject({ category: 'KNITTING' })))
    const knitTab = result.current.find(t => t.id === 'knit')
    expect(knitTab).toBeDefined()
    expect(knitTab?.label).toBe('tab_knit')
  })

  it('includes crochet tab for CROCHET with label from translation key', () => {
    const { result } = renderHook(() => useProjectTabs(makeProject({ category: 'CROCHET' })))
    const knitTab = result.current.find(t => t.id === 'knit')
    expect(knitTab).toBeDefined()
    expect(knitTab?.label).toBe('tab_crochet')
  })

  it('does not include knit tab for SEWING', () => {
    const { result } = renderHook(() => useProjectTabs(makeProject({ category: 'SEWING' })))
    const ids = result.current.map(t => t.id)
    expect(ids).not.toContain('knit')
  })

  it('each tab has an id, label, and icon', () => {
    const { result } = renderHook(() => useProjectTabs(makeProject()))
    for (const tab of result.current) {
      expect(tab.id).toBeTruthy()
      expect(tab.label).toBeTruthy()
      expect(tab.icon).toBeDefined()
    }
  })
})
