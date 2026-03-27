import axios from 'axios'
import type { Project, ProjectCategory } from './types'

const api = axios.create({ baseURL: '/api' })

export const projectsApi = {
  getAll: (category?: ProjectCategory) =>
    api.get<Project[]>('/projects', { params: category ? { category } : {} }).then(r => r.data),

  getOne: (id: number) =>
    api.get<Project>(`/projects/${id}`).then(r => r.data),

  create: (data: { name: string; description: string; category: ProjectCategory; tags: string }) =>
    api.post<Project>('/projects', data).then(r => r.data),

  update: (id: number, data: Partial<{ name: string; description: string; tags: string; imageUrl: string; notes: string; recipeText: string; craftDetails: string }>) =>
    api.put<Project>(`/projects/${id}`, data).then(r => r.data),

  delete: (id: number) =>
    api.delete(`/projects/${id}`),

  addMaterial: (id: number, data: { type: string; color: string; colorHex: string; amount: string; unit: string }) =>
    api.post<Project>(`/projects/${id}/materials`, data).then(r => r.data),

  deleteMaterial: (id: number, materialId: number) =>
    api.delete<Project>(`/projects/${id}/materials/${materialId}`).then(r => r.data),

  updateRowCounter: (id: number, data: { stitchesPerRound: number; totalRounds: number; checkedStitches: string }) =>
    api.put<Project>(`/projects/${id}/row-counter`, data).then(r => r.data),

  updatePatternGrid: (id: number, data: { rows: number; cols: number; cellData: string }) =>
    api.put<Project>(`/projects/${id}/pattern-grid`, data).then(r => r.data),

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

export const fileUrl = (projectId: number, storedName: string) =>
  `/api/files/${projectId}/${storedName}`
