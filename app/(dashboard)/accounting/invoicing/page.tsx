import { getCurrentUser } from "@/lib/auth"
import { canAccessModule } from "@/lib/permissions"
import { InvoicingPageClient } from "@/components/accounting/invoicing-page-client"
import { createServerClient } from "@/lib/supabase/server"

export const dynamic = 'force-dynamic'

export default async function InvoicingPage() {
  const { user } = await getCurrentUser()

  const userRole = user.role as any
  if (!canAccessModule(userRole, "accounting")) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Facturación Electrónica</h1>
          <p className="text-muted-foreground">No tiene permiso para acceder a facturación</p>
        </div>
      </div>
    )
  }

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

  return <InvoicingPageClient agencies={agencies} />
}
