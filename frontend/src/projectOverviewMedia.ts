import type { LibraryItem, Material, Project } from './types'

export function normalizeProject(p: Project): Project {
  return {
    ...p,
    coverImages: Array.isArray(p.coverImages) ? p.coverImages : [],
    materials: (p.materials ?? []).map(m => ({
      ...m,
      images: Array.isArray(m.images) ? m.images : [],
    })),
  }
}

export function projectCoverImageUrls(project: Project): string[] {
  const sorted = [...(project.coverImages ?? [])].sort((a, b) => (a.isMain === b.isMain ? 0 : a.isMain ? -1 : 1))
  return sorted.map(c => c.storedName).filter(Boolean)
}

export function materialImageUrls(m: Material): string[] {
  const rows = m.images ?? []
  const mainFirst = [...rows].sort((a, b) => (a.isMain === b.isMain ? 0 : a.isMain ? -1 : 1))
  return mainFirst.map(i => i.storedName).filter(Boolean)
}

export function uniqueImageUrls(urls: string[]): string[] {
  return [...new Set(urls.filter(Boolean))]
}

export function libraryItemImagesForProject(item: LibraryItem): { storedName: string; originalName: string }[] {
  const list = item.images ?? []
  if (list.length === 0) return []
  const main = list.find(i => i.isMain)
  const rest = list.filter(i => !i.isMain)
  const ordered = main ? [main, ...rest] : [...list]
  return ordered.map(i => ({
    storedName: i.storedName,
    originalName: i.originalName ?? '',
  }))
}
