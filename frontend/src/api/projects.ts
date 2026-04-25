import type { Project, ProjectCategory } from '../types'
import { normalizeProject } from '../projectOverviewMedia'
import { api, uploadFile } from './client'

const projectRes = normalizeProject

export const projectsApi = {
  getAll: async (category?: ProjectCategory): Promise<Project[]> => {
    const r = await api.get<Project[]>('/projects', { params: { category } })
    return r.data.map(projectRes)
  },

  getOne: async (id: number): Promise<Project> => {
    const r = await api.get<Project>(`/projects/${id}`)
    return projectRes(r.data)
  },

  create: async (data: { name: string; startDate: number; category: ProjectCategory; description?: string; tags?: string }): Promise<Project> => {
    const r = await api.post<Project>('/projects', data)
    return projectRes(r.data)
  },

  update: async (id: number, data: Partial<{ name: string; description: string; tags: string; notes: string; recipeText: string; craftDetails: string; startDate: number; endDate: number; clearEndDate: boolean; isPublic: boolean }>): Promise<Project> => {
    const r = await api.put<Project>(`/projects/${id}`, data)
    return projectRes(r.data)
  },

  uploadCoverImage: async (id: number, file: File): Promise<Project> => {
    const publicUrl = await uploadFile(file, `project-covers/${id}`)
    const r = await api.post<Project>(`/projects/${id}/cover-images/register`, { originalName: file.name, fileUrl: publicUrl })
    return projectRes(r.data)
  },

  setCoverImageMain: async (id: number, imageId: number): Promise<Project> => {
    const r = await api.put<Project>(`/projects/${id}/cover-images/${imageId}/main`)
    return projectRes(r.data)
  },

  deleteCoverImage: async (id: number, imageId: number): Promise<Project> => {
    const r = await api.delete<Project>(`/projects/${id}/cover-images/${imageId}`)
    return projectRes(r.data)
  },

  uploadMaterialImage: async (id: number, materialId: number, file: File): Promise<Project> => {
    const publicUrl = await uploadFile(file, `project-materials/${id}/${materialId}`)
    const r = await api.post<Project>(`/projects/${id}/material-images/register`, { originalName: file.name, fileUrl: publicUrl, materialId })
    return projectRes(r.data)
  },

  registerMaterialImageByUrl: async (id: number, materialId: number, fileUrl: string, originalName: string): Promise<Project> => {
    const r = await api.post<Project>(`/projects/${id}/material-images/register`, { originalName: originalName || 'image', fileUrl, materialId })
    return projectRes(r.data)
  },

  setMaterialImageMain: async (id: number, imageId: number): Promise<Project> => {
    const r = await api.put<Project>(`/projects/${id}/material-images/${imageId}/main`)
    return projectRes(r.data)
  },

  deleteMaterialImage: async (id: number, imageId: number): Promise<Project> => {
    const r = await api.delete<Project>(`/projects/${id}/material-images/${imageId}`)
    return projectRes(r.data)
  },

  delete: (id: number) => api.delete(`/projects/${id}`),

  addMaterial: async (id: number, data: { name: string; type: string; itemType?: string; color?: string; colorHex?: string; amount?: string; unit?: string }): Promise<Project> => {
    const r = await api.post<Project>(`/projects/${id}/materials`, data)
    return projectRes(r.data)
  },

  deleteMaterial: async (id: number, materialId: number): Promise<Project> => {
    const r = await api.delete<Project>(`/projects/${id}/materials/${materialId}`)
    return projectRes(r.data)
  },

  updateRowCounter: async (id: number, data: { stitchesPerRound: number; totalRounds: number; checkedStitches: string }): Promise<Project> => {
    const r = await api.put<Project>(`/projects/${id}/row-counter`, data)
    return projectRes(r.data)
  },

  createPatternGrid: async (id: number): Promise<Project> => {
    const r = await api.post<Project>(`/projects/${id}/pattern-grids`)
    return projectRes(r.data)
  },

  updatePatternGrid: async (id: number, gridId: number, data: { rows: number; cols: number; cellData: string }): Promise<Project> => {
    const r = await api.put<Project>(`/projects/${id}/pattern-grids/${gridId}`, data)
    return projectRes(r.data)
  },

  deletePatternGrid: async (id: number, gridId: number): Promise<Project> => {
    const r = await api.delete<Project>(`/projects/${id}/pattern-grids/${gridId}`)
    return projectRes(r.data)
  },

  uploadProjectFile: async (id: number, file: File): Promise<Project> => {
    const publicUrl = await uploadFile(file, `project-files/${id}`)
    const r = await api.post<Project>(`/projects/${id}/files/register`, {
      originalName: file.name,
      fileUrl: publicUrl,
      mimeType: file.type || 'application/octet-stream',
    })
    return projectRes(r.data)
  },

  deleteFile: async (id: number, fileId: number): Promise<Project> => {
    const r = await api.delete<Project>(`/projects/${id}/files/${fileId}`)
    return projectRes(r.data)
  },

  replaceFile: async (id: number, fileId: number, file: File): Promise<Project> => {
    await projectsApi.uploadProjectFile(id, file)
    return projectsApi.deleteFile(id, fileId)
  },
}
