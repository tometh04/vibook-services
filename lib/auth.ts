import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Database } from '@/lib/supabase/types'

type User = Database['public']['Tables']['users']['Row']

export async function getCurrentUser(): Promise<{ user: User; session: { user: any } }> {
  const supabase = await createServerClient()
  
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !authUser) {
    redirect('/login')
  }

  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('auth_id', authUser.id)
    .maybeSingle()

  if (error || !user || !(user as any).is_active) {
    redirect('/login')
  }

  return { user: user as User, session: { user: authUser } }
}

export async function getUserAgencies(userId: string): Promise<Array<{ agency_id: string; agencies: { name: string; city: string; timezone: string } | null }>> {
  const supabase = await createServerClient()
  
  const { data, error } = await supabase
    .from('user_agencies')
    .select('agency_id, agencies(*)')
    .eq('user_id', userId)

  if (error) {
    console.error('Error fetching user agencies:', error)
    return []
  }

  return (data || []) as Array<{ agency_id: string; agencies: { name: string; city: string; timezone: string } | null }>
}

// Helper functions para verificación de roles
export function hasRole(userRole: string, requiredRole: string): boolean {
  const roleHierarchy: Record<string, number> = {
    VIEWER: 1,
    SELLER: 2,
    ADMIN: 3,
    SUPER_ADMIN: 4,
  }

  return (roleHierarchy[userRole] || 0) >= (roleHierarchy[requiredRole] || 0)
}

// NOTA: La función canAccess() fue eliminada - usar canAccessModule() de lib/permissions.ts en su lugar
