import { createBrowserClient } from '@supabase/ssr'
import { Database } from './types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('placeholder')) {
  console.error('⚠️ Missing or invalid Supabase environment variables')
}

export const supabase = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)

// Exportar función createClient para compatibilidad con hooks
export function createClient() {
  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)
}
