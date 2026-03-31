import axios from 'axios'
import type { Project, ProjectCategory, LibraryItem } from './types'
import { supabase } from './supabase'

const api = axios.create({ baseURL: '/api' })

api.interceptors.request.use(async config => {
  const { data } = await supabase.auth.getSession()
  console.log('[api] session:', data.session ? 'present' : 'null', 'token:', data.session?.access_token?.slice(0, 20))
  if (data.session?.access_token) {
    config.headers.Authorization = `Bearer ${data.session.access_token}`
  }
  return config
})

export const projectsApi = {
  getAll: (category?: ProjectCategory) =>
    api.get<Project[]>('/projects', { params: category ? { category } : {} }).then(r => r.data),

  getOne: (id: number) =>
    api.get<Project>(`/projects/${id}`).then(r => r.data),

  create: (data: { name: string; startDate: number; category: ProjectCategory; description?: string; tags?: string }) =>
    api.post<Project>('/projects', data).then(r => r.data),

  update: (id: number, data: Partial<{ name: string; description: string; tags: string; imageUrl: string; notes: string; recipeText: string; craftDetails: string; startDate: number; endDate: number; clearEndDate: boolean }>) =>
    api.put<Project>(`/projects/${id}`, data).then(r => r.data),

  uploadCoverImage: (id: number, file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api.post<Project>(`/projects/${id}/cover-image`, form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(r => r.data)
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

  uploadFile: (id: number, file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api.post<Project>(`/projects/${id}/files`, form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(r => r.data)
  },

  deleteFile: (id: number, fileId: number) =>
    api.delete<Project>(`/projects/${id}/files/${fileId}`).then(r => r.data),
}

export const libraryApi = {
  getAll: () =>
    api.get<LibraryItem[]>('/library').then(r => r.data),

  create: (data: {
    itemType: string; name: string
    yarnMaterial?: string; yarnBrand?: string; yarnAmountG?: number; yarnAmountM?: number
    fabricWidthCm?: number; fabricLengthCm?: number
    needleSizeMm?: string; circularLengthCm?: number
    hookSizeMm?: string
  }) =>
    api.post<LibraryItem>('/library', data).then(r => r.data),

  uploadImage: (id: number, file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api.post<LibraryItem>(`/library/${id}/image`, form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(r => r.data)
  },

  update: (id: number, data: {
    name?: string
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
  `/api/files/${projectId}/${storedName}`

export const accountApi = {
  deleteAccount: () => api.delete('/projects/account'),
}
