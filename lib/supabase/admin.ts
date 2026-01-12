import { createClient } from '@supabase/supabase-js'

/**
 * Cliente de Supabase con Service Role Key para operaciones de admin
 * Este cliente tiene acceso completo a la base de datos sin restricciones RLS
 * SOLO debe usarse en el panel de admin
 */
export function createAdminSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase admin credentials')
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
