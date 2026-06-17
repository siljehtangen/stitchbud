// Signed-URL resolution for the private storage bucket.
//
// `stored_name` holds a Supabase "public object" URL as a stable identifier
// (it encodes the object path). The bucket is private, so that URL is not
// directly fetchable — instead we mint a short-lived signed URL for every
// image/file at fetch time and swap it into the DTO. All existing render sites
// (`<img src={storedName}>`, the PDF generator, downloads) keep working
// unchanged. Owners sign their own objects; friends sign a friend's objects via
// the storage SELECT policy. Deletion still reads the raw `stored_name` from the
// DB, so swapping the in-memory value here is safe.

import type { LibraryItem, Project } from '../types'
import { supabase, STORAGE_BUCKET, storagePathFromUrl } from './client'

// Generous TTL so a long working session and PDF export never hit an expired
// link; projects/library are re-fetched (and re-signed) on navigation anyway.
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 8 // 8 hours

/** Map each stored identifier to a fresh signed URL (best-effort: unsigned
 *  entries fall back to the original value so the UI never hard-fails). */
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

/** Sign all media in a single project. */
export async function withSignedProjectMedia(project: Project): Promise<Project> {
  const names: string[] = []
  collectProjectNames(project, names)
  const signed = await signStoredNames(names)
  if (signed.size === 0) return project
  return applyProjectNames(project, s => signed.get(s) ?? s)
}

/** Sign all media across many projects in one signing round-trip. */
export async function withSignedProjectsMedia(projects: Project[]): Promise<Project[]> {
  const names: string[] = []
  for (const p of projects) collectProjectNames(p, names)
  const signed = await signStoredNames(names)
  if (signed.size === 0) return projects
  const sub = (s: string) => signed.get(s) ?? s
  return projects.map(p => applyProjectNames(p, sub))
}

/** Sign all media in a single library item. */
export async function withSignedLibraryMedia(item: LibraryItem): Promise<LibraryItem> {
  const names: string[] = []
  collectLibraryNames(item, names)
  const signed = await signStoredNames(names)
  if (signed.size === 0) return item
  return applyLibraryNames(item, s => signed.get(s) ?? s)
}

/** Sign all media across many library items in one signing round-trip. */
export async function withSignedLibraryItemsMedia(items: LibraryItem[]): Promise<LibraryItem[]> {
  const names: string[] = []
  for (const it of items) collectLibraryNames(it, names)
  const signed = await signStoredNames(names)
  if (signed.size === 0) return items
  const sub = (s: string) => signed.get(s) ?? s
  return items.map(it => applyLibraryNames(it, sub))
}
