export { uploadFile, api } from './client'
export { projectsApi } from './projects'
export { libraryApi } from './library'
export { friendsApi } from './friends'

import { api } from './client'

export const fileUrl = (projectId: number, storedName: string) =>
  storedName.startsWith('http') ? storedName : `/api/files/${projectId}/${storedName}`

export const accountApi = {
  deleteAccount: () => api.delete('/projects/account'),
  resetData: () => api.delete('/projects/account/data'),
}

export const usersApi = {
  syncMe: () => api.put('/users/me'),
}
