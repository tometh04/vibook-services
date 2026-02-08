import { AlertsPageClient } from "@/components/alerts/alerts-page-client"
import { AlertsFiltersState } from "@/components/alerts/alerts-filters"
import { getCurrentUser } from "@/lib/auth"
import { createServerClient } from "@/lib/supabase/server"
import { canAccessModule } from "@/lib/permissions"

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

export default async function AlertsPage() {
  const { user } = await getCurrentUser()
  
  // Verificar permiso de acceso
  if (!canAccessModule(user.role as any, "alerts")) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Alertas</h1>
          <p className="text-muted-foreground">No tiene permiso para acceder a alertas</p>
        </div>
      </div>
    )
  }

  const supabase = await createServerClient()

  // Get user agencies
  const { data: userAgencies } = await supabase
    .from("user_agencies")
    .select("agency_id, agencies(id, name)")
    .eq("user_id", user.id)

  let agencies: Array<{ id: string; name: string }> = []
  let agencyIds: string[] = []

  if (user.role === "SUPER_ADMIN") {
    const { data } = await supabase.from("agencies").select("id, name").order("name")
    agencies = data || []
    agencyIds = agencies.map((agency) => agency.id)
  } else if (userAgencies && userAgencies.length > 0) {
    agencies = (userAgencies || [])
      .map((ua: any) => ua.agencies)
      .filter(Boolean)
    agencyIds = (userAgencies || []).map((ua: any) => ua.agency_id).filter(Boolean)
  }

  // Load users for internal messages
  let users: Array<{
    id: string
    name: string
    email: string
    role: string
    agency_id: string
    agency_name?: string | null
  }> = []

  if (agencyIds.length > 0) {
    const { data: agencyUsers } = await supabase
      .from("user_agencies")
      .select("agency_id, users(id, name, email, role), agencies(id, name)")
      .in("agency_id", agencyIds)

    users = (agencyUsers || [])
      .map((ua: any) => ({
        id: ua.users?.id,
        name: ua.users?.name || ua.users?.email || "Usuario",
        email: ua.users?.email || "",
        role: ua.users?.role || "USER",
        agency_id: ua.agency_id,
        agency_name: ua.agencies?.name || null,
      }))
      .filter((u: any) => Boolean(u.id))
  }

  const dates = getDefaultDateRange()

  const defaultFilters: AlertsFiltersState = {
    type: "ALL",
    status: "ALL",
    dateFrom: dates.dateFrom,
    dateTo: dates.dateTo,
    agencyId: "ALL",
  }

  return (
    <AlertsPageClient
      agencies={agencies}
      users={users}
      userRole={user.role}
      defaultFilters={defaultFilters}
    />
  )
}
