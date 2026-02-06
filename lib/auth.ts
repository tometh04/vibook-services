import { createServerClient } from '@/lib/supabase/server'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
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

  if (error || !data || data.length === 0) {
    if (error) {
      console.error('Error fetching user agencies:', error)
    }
    try {
      const supabaseAdmin = createAdminSupabaseClient()
      const { data: adminData, error: adminError } = await (supabaseAdmin
        .from('user_agencies') as any)
        .select('agency_id, agencies(*)')
        .eq('user_id', userId)
      if (adminError) {
        console.error('Error fetching user agencies (admin):', adminError)
        return []
      }
      return (adminData || []) as Array<{ agency_id: string; agencies: { name: string; city: string; timezone: string } | null }>
    } catch (adminFallbackError) {
      console.error('Error in admin fallback for user agencies:', adminFallbackError)
      return []
    }
  }

  return data as Array<{ agency_id: string; agencies: { name: string; city: string; timezone: string } | null }>
}

export async function ensureUserAgencyLink(user: User, authUser: any): Promise<void> {
  try {
    const supabaseAdmin = createAdminSupabaseClient()
    const { data: existing } = await (supabaseAdmin
      .from('user_agencies') as any)
      .select('agency_id')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle()

    if (existing?.agency_id) {
      return
    }

    let agencyId = authUser?.user_metadata?.agency_id as string | undefined

    if (!agencyId) {
      const invitedBy = authUser?.user_metadata?.invited_by as string | undefined
      if (invitedBy) {
        const { data: inviter } = await (supabaseAdmin
          .from('users') as any)
          .select('id')
          .eq('email', invitedBy)
          .maybeSingle()

        if (inviter?.id) {
          const { data: inviterAgency } = await (supabaseAdmin
            .from('user_agencies') as any)
            .select('agency_id')
            .eq('user_id', inviter.id)
            .limit(1)
            .maybeSingle()
          agencyId = inviterAgency?.agency_id
        }
      }
    }

    if (!agencyId) {
      return
    }

    const { error: insertError } = await (supabaseAdmin
      .from('user_agencies') as any)
      .insert({
        user_id: user.id,
        agency_id: agencyId,
      })

    if (insertError) {
      console.error('Error auto-linking user to agency:', insertError)
    }
  } catch (error) {
    console.error('Error ensuring user agency link:', error)
  }
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
