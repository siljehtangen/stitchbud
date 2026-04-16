import axios from 'axios'
import type { Project, ProjectCategory, LibraryItem, Friend, FriendRequest } from './types'
import { normalizeProject } from './projectOverviewMedia'
import { supabase } from './supabase'

const STORAGE_BUCKET = 'stitchbud-files'

const api = axios.create({ baseURL: '/api', timeout: 15000 })

const projectRes = normalizeProject

api.interceptors.request.use(async config => {
  try {
    const { data } = await supabase.auth.getSession()
    if (data.session?.access_token) {
      config.headers.Authorization = `Bearer ${data.session.access_token}`
    }
  } catch {
    // Session retrieval failed — proceed without auth token; server will 401
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
      try {
        const { data } = await supabase.auth.refreshSession()
        if (data.session?.access_token) {
          original.headers.Authorization = `Bearer ${data.session.access_token}`
          return api(original)
        }
      } catch {
        // Refresh threw — fall through to sign-out
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

  /** Register an existing image URL (e.g. from library) without uploading a new file. */
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
    await api.delete(`/projects/${id}/files/${fileId}`)
    return projectsApi.uploadProjectFile(id, file)
  },
}

export const libraryApi = {
  getAll: async (): Promise<LibraryItem[]> => {
    const r = await api.get<LibraryItem[]>('/library')
    return r.data
  },

  create: async (data: {
    itemType: string; name: string; colors?: string[]
    yarnMaterial?: string; yarnBrand?: string; yarnAmountG?: number; yarnAmountM?: number
    fabricWidthCm?: number; fabricLengthCm?: number
    needleSizeMm?: string; circularLengthCm?: number
    hookSizeMm?: string
  }): Promise<LibraryItem> => {
    const r = await api.post<LibraryItem>('/library', data)
    return r.data
  },

  registerLibraryImage: async (id: number, file: File): Promise<LibraryItem> => {
    const publicUrl = await uploadFile(file, `library/${id}`)
    const r = await api.post<LibraryItem>(`/library/${id}/images/register`, { originalName: file.name, fileUrl: publicUrl })
    return r.data
  },

  setLibraryImageMain: async (libraryItemId: number, imageId: number): Promise<LibraryItem> => {
    const r = await api.put<LibraryItem>(`/library/${libraryItemId}/images/${imageId}/main`)
    return r.data
  },

  deleteLibraryImage: async (libraryItemId: number, imageId: number): Promise<LibraryItem> => {
    const r = await api.delete<LibraryItem>(`/library/${libraryItemId}/images/${imageId}`)
    return r.data
  },

  update: async (id: number, data: {
    name?: string; colors?: string[]
    yarnMaterial?: string; yarnBrand?: string; yarnAmountG?: number; yarnAmountM?: number
    fabricWidthCm?: number; fabricLengthCm?: number
    needleSizeMm?: string; circularLengthCm?: number
    hookSizeMm?: string
  }): Promise<LibraryItem> => {
    const r = await api.put<LibraryItem>(`/library/${id}`, data)
    return r.data
  },

  delete: (id: number) => api.delete(`/library/${id}`),
}

export const fileUrl = (projectId: number, storedName: string) =>
  storedName.startsWith('http') ? storedName : `/api/files/${projectId}/${storedName}`

export const accountApi = {
  deleteAccount: () => api.delete('/projects/account'),
  resetData: () => api.delete('/projects/account/data'),
}

export const usersApi = {
  syncMe: () => api.put('/users/me'),
}

export const friendsApi = {
  getFriends: async (): Promise<Friend[]> => {
    const r = await api.get<Friend[]>('/friends')
    return r.data
  },
  getPendingRequests: async (): Promise<FriendRequest[]> => {
    const r = await api.get<FriendRequest[]>('/friends/requests')
    return r.data
  },
  sendRequest: async (email: string): Promise<Friend> => {
    const r = await api.post<Friend>('/friends/request', { email })
    return r.data
  },
  acceptRequest: async (friendshipId: number): Promise<Friend> => {
    const r = await api.put<Friend>(`/friends/${friendshipId}/accept`)
    return r.data
  },
  remove: (friendshipId: number) => api.delete(`/friends/${friendshipId}`),
  getFriendProjects: async (friendUserId: string): Promise<Project[]> => {
    const r = await api.get<Project[]>(`/friends/${friendUserId}/projects`)
    return r.data.map(p => normalizeProject(p))
  },
  getFriendProject: async (friendUserId: string, projectId: number): Promise<Project> => {
    const r = await api.get<Project>(`/friends/${friendUserId}/projects/${projectId}`)
    return normalizeProject(r.data)
  },
}
