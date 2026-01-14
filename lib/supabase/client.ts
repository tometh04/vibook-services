import { createBrowserClient } from '@supabase/ssr'
import { Database } from './types'

// Lazy initialization para evitar errores durante el build
let _supabaseClient: ReturnType<typeof createBrowserClient<Database>> | null = null

function getSupabaseConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  // Durante el build, las variables pueden no estar disponibles
  // No lanzar error, solo advertir
  if (!supabaseUrl || !supabaseAnonKey) {
    if (typeof window !== 'undefined') {
      // Solo en cliente real, no durante build
      console.error('❌ Missing Supabase environment variables')
    }
    return null
  }
  
  return { supabaseUrl, supabaseAnonKey }
}

// Getter que crea el cliente solo cuando se necesita
export function getSupabase() {
  if (!_supabaseClient) {
    const config = getSupabaseConfig()
    if (!config) {
      // Retornar un cliente mock que no hace nada durante el build
      return null as any
    }
    _supabaseClient = createBrowserClient<Database>(config.supabaseUrl, config.supabaseAnonKey)
  }
  return _supabaseClient
}

// Alias para compatibilidad
export const supabase = new Proxy({} as ReturnType<typeof createBrowserClient<Database>>, {
  get(_, prop) {
    const client = getSupabase()
    if (!client) return () => Promise.resolve({ data: null, error: null })
    return (client as any)[prop]
  }
})

// Exportar función createClient para compatibilidad con hooks
export function createClient() {
  const config = getSupabaseConfig()
  if (!config) {
    // Durante build, retornar null
    return null as any
  }
  return createBrowserClient<Database>(config.supabaseUrl, config.supabaseAnonKey)
}
