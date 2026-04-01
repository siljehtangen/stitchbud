import axios from 'axios'
import type { Project, ProjectCategory, LibraryItem } from './types'
import { supabase } from './supabase'

const STORAGE_BUCKET = 'stitchbud-files'

const api = axios.create({ baseURL: '/api' })

api.interceptors.request.use(async config => {
  const { data } = await supabase.auth.getSession()
  console.log('[api] session:', data.session ? 'present' : 'null', 'token:', data.session?.access_token?.slice(0, 20))
  if (data.session?.access_token) {
    config.headers.Authorization = `Bearer ${data.session.access_token}`
  }
  return config
})

/** Upload a file to Supabase Storage and return its public URL. */
export async function uploadFile(file: File, folder: string): Promise<string> {
  const ext = file.name.split('.').pop()
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, { upsert: true })
  if (error) throw error
  return supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path).data.publicUrl
}

export const projectsApi = {
  getAll: (category?: ProjectCategory) =>
    api.get<Project[]>('/projects', { params: category ? { category } : {} }).then(r => r.data),

  getOne: (id: number) =>
    api.get<Project>(`/projects/${id}`).then(r => r.data),

  create: (data: { name: string; startDate: number; category: ProjectCategory; description?: string; tags?: string }) =>
    api.post<Project>('/projects', data).then(r => r.data),

  update: (id: number, data: Partial<{ name: string; description: string; tags: string; imageUrl: string; notes: string; recipeText: string; craftDetails: string; startDate: number; endDate: number; clearEndDate: boolean }>) =>
    api.put<Project>(`/projects/${id}`, data).then(r => r.data),

  uploadCoverImage: async (id: number, file: File): Promise<Project> => {
    const publicUrl = await uploadFile(file, `project-covers/${id}`)
    return api.put<Project>(`/projects/${id}`, { imageUrl: publicUrl }).then(r => r.data)
  },

  delete: (id: number) =>
    api.delete(`/projects/${id}`),

  addMaterial: (id: number, data: { name: string; type: string; itemType?: string; color?: string; colorHex?: string; amount?: string; unit?: string; imageUrl?: string }) =>
    api.post<Project>(`/projects/${id}/materials`, data).then(r => r.data),

  deleteMaterial: (id: number, materialId: number) =>
    api.delete<Project>(`/projects/${id}/materials/${materialId}`).then(r => r.data),

  updateRowCounter: (id: number, data: { stitchesPerRound: number; totalRounds: number; checkedStitches: string }) =>
    api.put<Project>(`/projects/${id}/row-counter`, data).then(r => r.data),

  createPatternGrid: (id: number) =>
    api.post<Project>(`/projects/${id}/pattern-grids`).then(r => r.data),

  updatePatternGrid: (id: number, gridId: number, data: { rows: number; cols: number; cellData: string }) =>
    api.put<Project>(`/projects/${id}/pattern-grids/${gridId}`, data).then(r => r.data),

  deletePatternGrid: (id: number, gridId: number) =>
    api.delete<Project>(`/projects/${id}/pattern-grids/${gridId}`).then(r => r.data),

  uploadProjectFile: async (id: number, file: File): Promise<Project> => {
    const publicUrl = await uploadFile(file, `project-files/${id}`)
    return api.post<Project>(`/projects/${id}/files/register`, {
      originalName: file.name,
      fileUrl: publicUrl,
      mimeType: file.type || 'application/octet-stream'
    }).then(r => r.data)
  },

  deleteFile: (id: number, fileId: number) =>
    api.delete<Project>(`/projects/${id}/files/${fileId}`).then(r => r.data),

  replaceFile: async (id: number, fileId: number, file: File): Promise<Project> => {
    await api.delete(`/projects/${id}/files/${fileId}`)
    return projectsApi.uploadProjectFile(id, file)
  },
}

export const libraryApi = {
  getAll: () =>
    api.get<LibraryItem[]>('/library').then(r => r.data),

  create: (data: {
    itemType: string; name: string; colors?: string[]
    yarnMaterial?: string; yarnBrand?: string; yarnAmountG?: number; yarnAmountM?: number
    fabricWidthCm?: number; fabricLengthCm?: number
    needleSizeMm?: string; circularLengthCm?: number
    hookSizeMm?: string
  }) =>
    api.post<LibraryItem>('/library', data).then(r => r.data),

  uploadImage: async (id: number, file: File): Promise<LibraryItem> => {
    const publicUrl = await uploadFile(file, `library/${id}`)
    return api.put<LibraryItem>(`/library/${id}`, { imageUrl: publicUrl }).then(r => r.data)
  },

  update: (id: number, data: {
    name?: string; imageUrl?: string; colors?: string[]
    yarnMaterial?: string; yarnBrand?: string; yarnAmountG?: number; yarnAmountM?: number
    fabricWidthCm?: number; fabricLengthCm?: number
    needleSizeMm?: string; circularLengthCm?: number
    hookSizeMm?: string
  }) =>
    api.put<LibraryItem>(`/library/${id}`, data).then(r => r.data),

  delete: (id: number) =>
    api.delete(`/library/${id}`),
}

export const fileUrl = (projectId: number, storedName: string) =>
  storedName.startsWith('http') ? storedName : `/api/files/${projectId}/${storedName}`

export const accountApi = {
  deleteAccount: () => api.delete('/projects/account'),
}
