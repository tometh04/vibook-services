import { createAdminSupabaseClient } from "@/lib/supabase/admin"
import { UsersAdminClient } from "@/components/admin/users-admin-client"

export default async function AdminUsersPage() {
  // El middleware ya verifica la autenticación del admin con JWT
  // No necesitamos verificar Supabase auth aquí
  const supabase = createAdminSupabaseClient()

  // Obtener todos los usuarios con sus agencias y suscripciones
  const { data: usersData } = await (supabase
    .from("users") as any)
    .select(`
      id,
      name,
      email,
      role,
      is_active,
      created_at,
      user_agencies(
        agency_id,
        agencies(
          id,
          name,
          city,
          created_at,
          subscriptions(
            id,
            status,
            mp_preapproval_id,
            mp_status,
            current_period_start,
            current_period_end,
            trial_start,
            trial_end,
            created_at,
            plan:subscription_plans(
              name,
              display_name,
              price_monthly
            )
          )
        )
      )
    `)
    .order("created_at", { ascending: false })

  // Obtener estadísticas generales
  const { data: statsData } = await (supabase
    .from("subscriptions") as any)
    .select(`
      status,
      plan:subscription_plans(name)
    `)

  // Calcular estadísticas
  const stats = {
    total: usersData?.length || 0,
    active: usersData?.filter((u: any) => u.is_active).length || 0,
    inactive: usersData?.filter((u: any) => u.is_active === false).length || 0,
    withSubscription: usersData?.filter((u: any) => {
      if (!u.user_agencies || !Array.isArray(u.user_agencies)) return false
      return u.user_agencies.some((ua: any) => {
        const subscriptions = ua.agencies?.subscriptions
        if (!subscriptions || !Array.isArray(subscriptions)) return false
        return subscriptions.some((s: any) => 
          s.plan?.name !== 'FREE' && s.status !== 'UNPAID'
        )
      })
    }).length || 0,
    subscriptions: {
      active: statsData?.filter((s: any) => s.status === 'ACTIVE').length || 0,
      trial: statsData?.filter((s: any) => s.status === 'TRIAL').length || 0,
      canceled: statsData?.filter((s: any) => s.status === 'CANCELED').length || 0,
      unpaid: statsData?.filter((s: any) => s.status === 'UNPAID').length || 0,
    }
  }

  return <UsersAdminClient users={usersData || []} stats={stats} />
}
