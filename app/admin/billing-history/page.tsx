import { BillingHistoryAdminClient } from "@/components/admin/billing-history-admin-client"
import { createAdminSupabaseClient } from "@/lib/supabase/admin"

export default async function BillingHistoryPage() {
  const supabase = createAdminSupabaseClient()

  // Obtener todos los eventos de billing
  const { data: events } = await (supabase
    .from("billing_events") as any)
    .select(`
      *,
      agency:agencies(
        id,
        name,
        city
      ),
      subscription:subscriptions(
        id,
        status,
        plan:subscription_plans(
          name,
          display_name
        )
      )
    `)
    .order("created_at", { ascending: false })
    .limit(200)

  return <BillingHistoryAdminClient events={events || []} />
}
