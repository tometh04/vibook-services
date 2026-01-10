import { createServerClient as createSupabaseServerClient } from '@supabase/ssr'
import { Database } from './types'
import { cookies } from 'next/headers'

export async function createServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder_anon_key'
  
  // Solo lanzar error en runtime si realmente se intenta usar con placeholders
  if (supabaseUrl === 'https://placeholder.supabase.co' || supabaseAnonKey === 'placeholder_anon_key') {
    console.error('⚠️ Missing Supabase environment variables. Using placeholders (will fail on actual use)')
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

