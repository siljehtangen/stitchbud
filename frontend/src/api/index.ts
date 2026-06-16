import { supabase } from './client'

export { uploadFile, supabase } from './client'
export { projectsApi } from './projects'
export { libraryApi } from './library'
export { friendsApi } from './friends'

/** Account-level operations handled by the delete-account Edge Function
 *  (it needs the service-role key for storage cleanup and auth-admin deletion). */
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
