import { createAdminSupabaseClient } from "@/lib/supabase/admin"
import { SubscriptionsAdminClient } from "@/components/admin/subscriptions-admin-client"

export default async function AdminSubscriptionsPage() {
  // El middleware ya verifica la autenticación del admin con JWT
  // No necesitamos verificar Supabase auth aquí
  const supabase = createAdminSupabaseClient()

  // Obtener todas las suscripciones con detalles
  const { data: subscriptions } = await (supabase
    .from("subscriptions") as any)
    .select(`
      id,
      status,
      plan_id,
      mp_preapproval_id,
      mp_status,
      mp_payer_id,
      current_period_start,
      current_period_end,
      trial_start,
      trial_end,
      created_at,
      updated_at,
      agency:agencies(
        id,
        name,
        city,
        users:user_agencies(
          user:users(
            id,
            name,
            email
          )
        )
      ),
      plan:subscription_plans(
        id,
        name,
        display_name,
        price_monthly
      )
    `)
    .order("created_at", { ascending: false })

  return <SubscriptionsAdminClient subscriptions={subscriptions || []} />
}
