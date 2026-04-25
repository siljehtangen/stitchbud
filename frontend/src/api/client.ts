import axios from 'axios'
import { supabase } from '../supabase'

const STORAGE_BUCKET = 'stitchbud-files'

export const api = axios.create({ baseURL: '/api', timeout: 15000 })

api.interceptors.request.use(async config => {
  try {
    const { data } = await supabase.auth.getSession()
    if (data.session?.access_token) {
      config.headers.Authorization = `Bearer ${data.session.access_token}`
    }
  } catch {
    // proceed without auth token; server will 401
  }
  return config
})

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
        // fall through to sign-out
      }
      await supabase.auth.signOut()
    }
    return Promise.reject(error)
  }
)

export async function uploadFile(file: File, folder: string): Promise<string> {
  const dotIdx = file.name.lastIndexOf('.')
  const ext = dotIdx !== -1 ? file.name.slice(dotIdx) : ''
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`
  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, { upsert: true })
  if (error) throw error
  return supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path).data.publicUrl
}
