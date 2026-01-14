import { createBrowserClient } from '@supabase/ssr'
import { Database } from './types'

// Lazy initialization para evitar errores durante el build
let _supabaseClient: ReturnType<typeof createBrowserClient<Database>> | null = null

function getSupabaseConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase environment variables. Please configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel settings.'
    )
  }
  
  return { supabaseUrl, supabaseAnonKey }
}

// Getter que crea el cliente solo cuando se necesita
export function getSupabase() {
  if (!_supabaseClient) {
    const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig()
    _supabaseClient = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)
  }
  return _supabaseClient
}

// Alias para compatibilidad - DEPRECATED: usar getSupabase() en su lugar
export const supabase = new Proxy({} as ReturnType<typeof createBrowserClient<Database>>, {
  get(_, prop) {
    return (getSupabase() as any)[prop]
  }
})

// Exportar función createClient para compatibilidad con hooks
export function createClient() {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig()
  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)
}
