import axios from 'axios'
import type { Project, ProjectCategory, LibraryItem } from './types'
import { normalizeProject } from './projectOverviewMedia'
import { supabase } from './supabase'

const STORAGE_BUCKET = 'stitchbud-files'

const api = axios.create({ baseURL: '/api' })

const projectRes = (p: Project) => normalizeProject(p)

api.interceptors.request.use(async config => {
  const { data } = await supabase.auth.getSession()
  if (data.session?.access_token) {
    config.headers.Authorization = `Bearer ${data.session.access_token}`
  }
  return config
})

// On 401, try to refresh the session once and retry the request.
api.interceptors.response.use(
  res => res,
  async error => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      const { data } = await supabase.auth.refreshSession()
      if (data.session?.access_token) {
        original.headers.Authorization = `Bearer ${data.session.access_token}`
        return api(original)
      }
      // Refresh failed — sign the user out so they land on the login page
      await supabase.auth.signOut()
    }
    return Promise.reject(error)
  }
)

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
    api.get<Project[]>('/projects', { params: { category } }).then(r => r.data.map(projectRes)),

  getOne: (id: number) =>
    api.get<Project>(`/projects/${id}`).then(r => projectRes(r.data)),

  create: (data: { name: string; startDate: number; category: ProjectCategory; description?: string; tags?: string }) =>
    api.post<Project>('/projects', data).then(r => projectRes(r.data)),

  update: (id: number, data: Partial<{ name: string; description: string; tags: string; notes: string; recipeText: string; craftDetails: string; startDate: number; endDate: number; clearEndDate: boolean }>) =>
    api.put<Project>(`/projects/${id}`, data).then(r => projectRes(r.data)),

  uploadCoverImage: async (id: number, file: File): Promise<Project> => {
    const publicUrl = await uploadFile(file, `project-covers/${id}`)
    return api.post<Project>(`/projects/${id}/cover-images/register`, {
      originalName: file.name,
      fileUrl: publicUrl,
    }).then(r => projectRes(r.data))
  },

  setCoverImageMain: (id: number, imageId: number): Promise<Project> =>
    api.put<Project>(`/projects/${id}/cover-images/${imageId}/main`).then(r => projectRes(r.data)),

  deleteCoverImage: (id: number, imageId: number): Promise<Project> =>
    api.delete<Project>(`/projects/${id}/cover-images/${imageId}`).then(r => projectRes(r.data)),

  uploadMaterialImage: async (id: number, materialId: number, file: File): Promise<Project> => {
    const publicUrl = await uploadFile(file, `project-materials/${id}/${materialId}`)
    return api.post<Project>(`/projects/${id}/material-images/register`, {
      originalName: file.name,
      fileUrl: publicUrl,
      materialId,
    }).then(r => projectRes(r.data))
  },

  /** Register an existing image URL (e.g. from library) without uploading a new file. */
  registerMaterialImageByUrl: (id: number, materialId: number, fileUrl: string, originalName: string): Promise<Project> =>
    api.post<Project>(`/projects/${id}/material-images/register`, {
      originalName: originalName || 'image',
      fileUrl,
      materialId,
    }).then(r => projectRes(r.data)),

  setMaterialImageMain: (id: number, imageId: number): Promise<Project> =>
    api.put<Project>(`/projects/${id}/material-images/${imageId}/main`).then(r => projectRes(r.data)),

  deleteMaterialImage: (id: number, imageId: number): Promise<Project> =>
    api.delete<Project>(`/projects/${id}/material-images/${imageId}`).then(r => projectRes(r.data)),

  delete: (id: number) =>
    api.delete(`/projects/${id}`),

  addMaterial: (id: number, data: { name: string; type: string; itemType?: string; color?: string; colorHex?: string; amount?: string; unit?: string }) =>
    api.post<Project>(`/projects/${id}/materials`, data).then(r => projectRes(r.data)),

  deleteMaterial: (id: number, materialId: number) =>
    api.delete<Project>(`/projects/${id}/materials/${materialId}`).then(r => projectRes(r.data)),

  updateRowCounter: (id: number, data: { stitchesPerRound: number; totalRounds: number; checkedStitches: string }) =>
    api.put<Project>(`/projects/${id}/row-counter`, data).then(r => projectRes(r.data)),

  createPatternGrid: (id: number) =>
    api.post<Project>(`/projects/${id}/pattern-grids`).then(r => projectRes(r.data)),

  updatePatternGrid: (id: number, gridId: number, data: { rows: number; cols: number; cellData: string }) =>
    api.put<Project>(`/projects/${id}/pattern-grids/${gridId}`, data).then(r => projectRes(r.data)),

  deletePatternGrid: (id: number, gridId: number) =>
    api.delete<Project>(`/projects/${id}/pattern-grids/${gridId}`).then(r => projectRes(r.data)),

  uploadProjectFile: async (id: number, file: File): Promise<Project> => {
    const publicUrl = await uploadFile(file, `project-files/${id}`)
    return api.post<Project>(`/projects/${id}/files/register`, {
      originalName: file.name,
      fileUrl: publicUrl,
      mimeType: file.type || 'application/octet-stream'
    }).then(r => projectRes(r.data))
  },

  deleteFile: (id: number, fileId: number) =>
    api.delete<Project>(`/projects/${id}/files/${fileId}`).then(r => projectRes(r.data)),

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

  registerLibraryImage: async (id: number, file: File): Promise<LibraryItem> => {
    const publicUrl = await uploadFile(file, `library/${id}`)
    return api.post<LibraryItem>(`/library/${id}/images/register`, {
      originalName: file.name,
      fileUrl: publicUrl,
    }).then(r => r.data)
  },

  setLibraryImageMain: (libraryItemId: number, imageId: number): Promise<LibraryItem> =>
    api.put<LibraryItem>(`/library/${libraryItemId}/images/${imageId}/main`).then(r => r.data),

  deleteLibraryImage: (libraryItemId: number, imageId: number): Promise<LibraryItem> =>
    api.delete<LibraryItem>(`/library/${libraryItemId}/images/${imageId}`).then(r => r.data),

  update: (id: number, data: {
    name?: string; colors?: string[]
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
