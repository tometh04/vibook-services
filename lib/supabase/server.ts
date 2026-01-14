import { createServerClient as createSupabaseServerClient } from '@supabase/ssr'
import { Database } from './types'
import { cookies } from 'next/headers'

export async function createServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  // Durante el build, las variables pueden no estar disponibles
  // No lanzar error para permitir que el build continúe
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('⚠️ Missing or invalid Supabase environment variables')
    // Retornar un cliente mock que no hace nada
    return {
      auth: {
        getUser: async () => ({ data: { user: null }, error: null }),
        getSession: async () => ({ data: { session: null }, error: null }),
        signOut: async () => ({ error: null }),
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
  
  const cookieStore = await cookies()
  
  return createSupabaseServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      set(name: string, value: string, options: any) {
        try {
          cookieStore.set({ name, value, ...options })
        } catch (error) {
          // Called from Server Component - ignored
        }
      },
      remove(name: string, options: any) {
        try {
          cookieStore.set({ name, value: '', ...options })
        } catch (error) {
          // Called from Server Component - ignored
        }
      },
    },
  })
}
