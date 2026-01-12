import { getCurrentUser } from "@/lib/auth"
import { createServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { SubscriptionsAdminClient } from "@/components/admin/subscriptions-admin-client"

export default async function AdminSubscriptionsPage() {
  const { user } = await getCurrentUser()

  if (user.role !== "SUPER_ADMIN") {
    redirect('/dashboard')
  }

  const supabase = await createServerClient()

  // Obtener todas las suscripciones con detalles
  const { data: subscriptions } = await (supabase
    .from("subscriptions") as any)
    .select(`
      id,
      status,
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
        name,
        display_name,
        price_monthly
      )
    `)
    .order("created_at", { ascending: false })

  return <SubscriptionsAdminClient subscriptions={subscriptions || []} />
}
