import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://tmygylckkbocgunlubik.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRteWd5bGNra2JvY2d1bmx1YmlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwNTEyODAsImV4cCI6MjA4MTYyNzI4MH0.SYo3IcVUBGfHs1PZGgP8wtPhvmtQQ6ytW9_H7NW20SE'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    sessionRefreshThreshold: 50
  }
})

export const supabaseAdmin = createClient(supabaseUrl, import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY as string, {
  auth: { autoRefreshToken: false, persistSession: false }
})