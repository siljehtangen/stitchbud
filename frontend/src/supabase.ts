import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase configuration: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in the environment.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
