import { supabase } from './client'

export { projectsApi } from './projects'
export { libraryApi } from './library'
export { friendsApi } from './friends'
export { dashboardApi } from './dashboard'

export const accountApi = {
  deleteAccount: async (): Promise<void> => {
    const { error } = await supabase.functions.invoke('delete-account', { body: { action: 'delete' } })
    if (error) throw new Error(error.message || 'Failed to delete account')
  },
  resetData: async (): Promise<void> => {
    const { error } = await supabase.functions.invoke('delete-account', { body: { action: 'reset' } })
    if (error) throw new Error(error.message || 'Failed to reset data')
  },
}
