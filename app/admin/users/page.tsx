import { createAdminSupabaseClient } from "@/lib/supabase/admin"
import { UsersAdminClient } from "@/components/admin/users-admin-client"

export default async function AdminUsersPage() {
  // El middleware ya verifica la autenticación del admin con JWT
  // No necesitamos verificar Supabase auth aquí
  const supabase = createAdminSupabaseClient()

  // Obtener todos los usuarios con sus agencias y suscripciones
  // IMPORTANTE: Ordenar suscripciones para que TRIAL y ACTIVE aparezcan primero
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

  // Ordenar suscripciones dentro de cada agencia para priorizar TRIAL y ACTIVE
  if (usersData && Array.isArray(usersData)) {
    usersData.forEach((user: any) => {
      if (!user.user_agencies || !Array.isArray(user.user_agencies)) return
      
      user.user_agencies.forEach((ua: any) => {
        if (!ua?.agencies) return
        
        // Normalizar subscriptions a array
        let subscriptions = ua.agencies.subscriptions
        if (!subscriptions) return
        
        // Si es un objeto único, convertirlo a array
        if (!Array.isArray(subscriptions)) {
          subscriptions = [subscriptions]
        }
        
        // Ahora sí podemos ordenar
        if (Array.isArray(subscriptions) && subscriptions.length > 0) {
          subscriptions.sort((a: any, b: any) => {
            const statusOrder: Record<string, number> = {
              'TRIAL': 1,
              'ACTIVE': 2,
              'UNPAID': 3,
              'CANCELED': 4,
              'SUSPENDED': 5,
              'PAST_DUE': 6,
            }
            const aOrder = statusOrder[a?.status] || 99
            const bOrder = statusOrder[b?.status] || 99
            return aOrder - bOrder
          })
          
          // Actualizar la referencia
          ua.agencies.subscriptions = subscriptions
        }
      })
    })
  }

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
        // Asegurarse de que agencies existe y tiene subscriptions
        if (!ua?.agencies) return false
        
        // Supabase puede devolver subscriptions como array o como objeto único
        // Normalizar siempre a array
        let subscriptions = ua.agencies.subscriptions
        if (!subscriptions) return false
        
        // Si es un objeto único, convertirlo a array
        if (!Array.isArray(subscriptions)) {
          subscriptions = [subscriptions]
        }
        
        // Ahora sí podemos usar .some() de forma segura
        return subscriptions.some((s: any) => 
          s?.plan?.name !== 'FREE' && s?.status !== 'UNPAID'
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
