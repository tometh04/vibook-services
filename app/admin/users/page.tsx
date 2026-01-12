import { getCurrentUser } from "@/lib/auth"
import { createServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { UsersAdminClient } from "@/components/admin/users-admin-client"

export default async function AdminUsersPage() {
  const { user } = await getCurrentUser()

  // Solo SUPER_ADMIN puede acceder
  if (user.role !== "SUPER_ADMIN") {
    redirect('/dashboard')
  }

  const supabase = await createServerClient()

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
    withSubscription: usersData?.filter((u: any) => 
      u.user_agencies?.some((ua: any) => 
        ua.agencies?.subscriptions?.some((s: any) => 
          s.plan?.name !== 'FREE' && s.status !== 'UNPAID'
        )
      )
    ).length || 0,
    subscriptions: {
      active: statsData?.filter((s: any) => s.status === 'ACTIVE').length || 0,
      trial: statsData?.filter((s: any) => s.status === 'TRIAL').length || 0,
      canceled: statsData?.filter((s: any) => s.status === 'CANCELED').length || 0,
      unpaid: statsData?.filter((s: any) => s.status === 'UNPAID').length || 0,
    }
  }

  return <UsersAdminClient users={usersData || []} stats={stats} />
}
