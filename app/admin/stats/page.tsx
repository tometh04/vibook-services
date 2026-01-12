import { createAdminSupabaseClient } from "@/lib/supabase/admin"
import { StatsAdminClient } from "@/components/admin/stats-admin-client"

export default async function AdminStatsPage() {
  // El middleware ya verifica la autenticación del admin con JWT
  // No necesitamos verificar Supabase auth aquí
  const supabase = createAdminSupabaseClient()

  // Obtener estadísticas de suscripciones por plan
  const { data: subscriptionsByPlan } = await (supabase
    .from("subscriptions") as any)
    .select(`
      status,
      plan:subscription_plans(name, display_name, price_monthly)
    `)

  // Obtener estadísticas de usuarios por mes
  const { data: usersByMonth } = await (supabase
    .from("users") as any)
    .select("created_at")
    .order("created_at", { ascending: false })

  // Obtener estadísticas de agencias
  const { data: agencies } = await (supabase
    .from("agencies") as any)
    .select("id, created_at")

  // Calcular estadísticas
  const stats = {
    subscriptions: {
      byPlan: subscriptionsByPlan?.reduce((acc: any, sub: any) => {
        const planName = sub.plan?.name || 'FREE'
        if (!acc[planName]) {
          acc[planName] = { total: 0, active: 0, trial: 0, canceled: 0, unpaid: 0 }
        }
        acc[planName].total++
        if (sub.status === 'ACTIVE') acc[planName].active++
        if (sub.status === 'TRIAL') acc[planName].trial++
        if (sub.status === 'CANCELED') acc[planName].canceled++
        if (sub.status === 'UNPAID') acc[planName].unpaid++
        return acc
      }, {}) || {},
      byStatus: {
        active: subscriptionsByPlan?.filter((s: any) => s.status === 'ACTIVE').length || 0,
        trial: subscriptionsByPlan?.filter((s: any) => s.status === 'TRIAL').length || 0,
        canceled: subscriptionsByPlan?.filter((s: any) => s.status === 'CANCELED').length || 0,
        unpaid: subscriptionsByPlan?.filter((s: any) => s.status === 'UNPAID').length || 0,
        suspended: subscriptionsByPlan?.filter((s: any) => s.status === 'SUSPENDED').length || 0,
      }
    },
    users: {
      total: usersByMonth?.length || 0,
      thisMonth: usersByMonth?.filter((u: any) => {
        const created = new Date(u.created_at)
        const now = new Date()
        return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear()
      }).length || 0,
    },
    agencies: {
      total: agencies?.length || 0,
    }
  }

  return <StatsAdminClient stats={stats} />
}
