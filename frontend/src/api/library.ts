import type { LibraryItem } from '../types'
import { api, uploadFile } from './client'

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
