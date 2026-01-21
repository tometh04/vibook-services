import { OperatorPaymentsPageClient } from "@/components/accounting/operator-payments-page-client"
import { getCurrentUser } from "@/lib/auth"
import { createServerClient } from "@/lib/supabase/server"

export const dynamic = 'force-dynamic'

export default async function OperatorPaymentsPage() {
  const { user } = await getCurrentUser()
  const supabase = await createServerClient()

  // Get user agencies
  const { data: userAgencies } = await supabase
    .from("user_agencies")
    .select("agency_id")
    .eq("user_id", user.id)

  let agencies: Array<{ id: string; name: string }> = []

  if (user.role === "SUPER_ADMIN") {
    const { data } = await supabase.from("agencies").select("id, name").order("name")
    agencies = data || []
  } else if (userAgencies && userAgencies.length > 0) {
    const agencyIds = userAgencies.map((ua: any) => ua.agency_id)
    const { data } = await supabase.from("agencies").select("id, name").in("id", agencyIds)
    agencies = data || []
  }

  // Get operators
  const { data: operatorsData } = await supabase
    .from("operators")
    .select("id, name")
    .eq("is_active", true)
    .order("name")
  const operators = operatorsData || []

  return <OperatorPaymentsPageClient agencies={agencies} operators={operators} />
}

