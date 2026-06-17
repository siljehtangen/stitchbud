import type { LibraryItem, Project } from '../types'
import { supabase, STORAGE_BUCKET, storagePathFromUrl } from './client'

const SIGNED_URL_TTL_SECONDS = 60 * 60 * 8

async function signStoredNames(storedNames: string[]): Promise<Map<string, string>> {
  const pathByStored = new Map<string, string>()
  for (const name of storedNames) {
    const path = storagePathFromUrl(name)
    if (path) pathByStored.set(name, path)
  }
  const uniquePaths = [...new Set(pathByStored.values())]
  if (uniquePaths.length === 0) return new Map()

  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrls(uniquePaths, SIGNED_URL_TTL_SECONDS)
  if (error || !data) {
    console.warn('Failed to sign storage URLs:', error?.message)
    return new Map()
  }

  const urlByPath = new Map<string, string>()
  for (const row of data) {
    if (row.path && row.signedUrl) urlByPath.set(row.path, row.signedUrl)
  }
  const result = new Map<string, string>()
  for (const [stored, path] of pathByStored) {
    const signed = urlByPath.get(path)
    if (signed) result.set(stored, signed)
  }
  return result
}

function collectProjectNames(project: Project, into: string[]): void {
  for (const img of project.coverImages) if (img.storedName) into.push(img.storedName)
  for (const m of project.materials) for (const img of m.images) if (img.storedName) into.push(img.storedName)
  for (const f of project.files) if (f.storedName) into.push(f.storedName)
}

function applyProjectNames(project: Project, sub: (s: string) => string): Project {
  return {
    ...project,
    coverImages: project.coverImages.map(i => ({ ...i, storedName: sub(i.storedName) })),
    materials: project.materials.map(m => ({
      ...m,
      images: m.images.map(i => ({ ...i, storedName: sub(i.storedName) })),
    })),
    files: project.files.map(f => ({ ...f, storedName: sub(f.storedName) })),
  }
}

function collectLibraryNames(item: LibraryItem, into: string[]): void {
  for (const img of item.images ?? []) if (img.storedName) into.push(img.storedName)
}

function applyLibraryNames(item: LibraryItem, sub: (s: string) => string): LibraryItem {
  if (!item.images) return item
  return { ...item, images: item.images.map(i => ({ ...i, storedName: sub(i.storedName) })) }
}

export async function withSignedProjectMedia(project: Project): Promise<Project> {
  const names: string[] = []
  collectProjectNames(project, names)
  const signed = await signStoredNames(names)
  if (signed.size === 0) return project
  return applyProjectNames(project, s => signed.get(s) ?? s)
}

export async function withSignedProjectsMedia(projects: Project[]): Promise<Project[]> {
  const names: string[] = []
  for (const p of projects) collectProjectNames(p, names)
  const signed = await signStoredNames(names)
  if (signed.size === 0) return projects
  const sub = (s: string) => signed.get(s) ?? s
  return projects.map(p => applyProjectNames(p, sub))
}

export async function withSignedLibraryMedia(item: LibraryItem): Promise<LibraryItem> {
  const names: string[] = []
  collectLibraryNames(item, names)
  const signed = await signStoredNames(names)
  if (signed.size === 0) return item
  return applyLibraryNames(item, s => signed.get(s) ?? s)
}

export async function withSignedLibraryItemsMedia(items: LibraryItem[]): Promise<LibraryItem[]> {
  const names: string[] = []
  for (const it of items) collectLibraryNames(it, names)
  const signed = await signStoredNames(names)
  if (signed.size === 0) return items
  const sub = (s: string) => signed.get(s) ?? s
  return items.map(it => applyLibraryNames(it, sub))
}
