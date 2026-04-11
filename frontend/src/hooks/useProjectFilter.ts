import { useMemo, useState } from 'react'
import type { Project, ProjectCategory } from '../types'

export function useProjectFilter(projects: Project[]) {
  const [filter, setFilter] = useState<ProjectCategory | 'ALL'>('ALL')
  const [search, setSearch] = useState('')

  const q = search.toLowerCase()
  const filtered = useMemo(() => projects.filter(p => {
    if (filter !== 'ALL' && p.category !== filter) return false
    if (!q) return true
    return [p.name, p.description, p.tags].some(v => v?.toLowerCase().includes(q))
  }), [projects, filter, q])

  const counts = useMemo(() => projects.reduce(
    (acc, p) => { acc[p.category]++; return acc },
    { ALL: projects.length, KNITTING: 0, CROCHET: 0, SEWING: 0 } as Record<ProjectCategory | 'ALL', number>
  ), [projects])

  const newProjectPath = filter === 'ALL' ? '/projects/new' : `/projects/new?category=${filter}`

  return { filter, setFilter, search, setSearch, filtered, counts, newProjectPath }
}
