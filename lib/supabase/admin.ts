import { createClient } from '@supabase/supabase-js'

/**
 * Cliente de Supabase con Service Role Key para operaciones de admin
 * Este cliente tiene acceso completo a la base de datos sin restricciones RLS
 * SOLO debe usarse en el panel de admin
 */
export function createAdminSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  // Durante el build, las variables pueden no estar disponibles
  if (!supabaseUrl || !serviceRoleKey) {
    console.warn('⚠️ Missing Supabase admin credentials (normal during build)')
    // Retornar un cliente mock para el build
    return {
      auth: {
        admin: {
          createUser: async () => ({ data: null, error: null }),
          deleteUser: async () => ({ data: null, error: null }),
          listUsers: async () => ({ data: { users: [] }, error: null }),
        },
        getUser: async () => ({ data: { user: null }, error: null }),
      },
      from: () => ({
        select: () => ({ data: null, error: null }),
        insert: () => ({ data: null, error: null }),
        update: () => ({ data: null, error: null }),
        delete: () => ({ data: null, error: null }),
        eq: () => ({ data: null, error: null }),
        single: () => ({ data: null, error: null }),
      }),
    } as any
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
