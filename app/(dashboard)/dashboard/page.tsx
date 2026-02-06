import { DashboardPageClient } from "@/components/dashboard/dashboard-page-client"
import { DashboardFiltersState } from "@/components/dashboard/dashboard-filters"
import { getCurrentUser } from "@/lib/auth"
import { createServerClient } from "@/lib/supabase/server"

export const dynamic = 'force-dynamic'

function getDefaultDateRange() {
  const today = new Date()
  const from = new Date()
  from.setDate(today.getDate() - 30)

  return {
    dateFrom: from.toISOString().split("T")[0],
    dateTo: today.toISOString().split("T")[0],
  }
}

export default async function DashboardPage() {
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

  // Get sellers (filtrar por agencias del usuario cuando no es SUPER_ADMIN)
  const userRole = user.role as string
  let sellers: Array<{ id: string; name: string }> = []

  if (userRole === "SUPER_ADMIN") {
    const { data: sellersData } = await supabase
      .from("users")
      .select("id, name")
      .in("role", ["SELLER", "ADMIN", "SUPER_ADMIN"])
      .eq("is_active", true)
    sellers = (sellersData || []) as Array<{ id: string; name: string }>
  } else if (userRole === "SELLER") {
    sellers = [{ id: user.id, name: user.name }]
  } else if (agencies.length > 0) {
    const agencyIds = agencies.map((a) => a.id)
    const { data: agencyUsers } = await supabase
      .from("user_agencies")
      .select("user_id")
      .in("agency_id", agencyIds)

    const sellerIds = Array.from(new Set((agencyUsers || []).map((ua: any) => ua.user_id)))
    if (sellerIds.length > 0) {
      const { data: sellersData } = await supabase
        .from("users")
        .select("id, name")
        .in("id", sellerIds)
        .in("role", ["SELLER", "ADMIN"])
        .eq("is_active", true)
      sellers = (sellersData || []) as Array<{ id: string; name: string }>
    }
  }

  const dates = getDefaultDateRange()

  const defaultFilters: DashboardFiltersState = {
    dateFrom: dates.dateFrom,
    dateTo: dates.dateTo,
    agencyId: user.role === "SUPER_ADMIN" ? "ALL" : (agencies[0]?.id || "ALL"),
    sellerId: "ALL",
  }

  return (
    <DashboardPageClient
      agencies={agencies}
      sellers={sellers.map((s: any) => ({ id: s.id, name: s.name }))}
      defaultFilters={defaultFilters}
    />
  )
}
