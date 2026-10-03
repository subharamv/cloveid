import { createClient } from '@supabase/supabase-js'
import { SUPABASE_URL, supabaseFetch } from './supabaseFetch'

const supabaseUrl = SUPABASE_URL
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRteWd5bGNra2JvY2d1bmx1YmlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwNTEyODAsImV4cCI6MjA4MTYyNzI4MH0.SYo3IcVUBGfHs1PZGgP8wtPhvmtQQ6ytW9_H7NW20SE'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    sessionRefreshThreshold: 50
  },
  global: { fetch: supabaseFetch }
})

export const supabaseAdmin = createClient(supabaseUrl, import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY as string, {
  auth: { autoRefreshToken: false, persistSession: false },
  global: { fetch: supabaseFetch }
})