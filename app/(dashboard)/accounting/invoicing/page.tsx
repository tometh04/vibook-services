import { getCurrentUser } from "@/lib/auth"
import { canAccessModule } from "@/lib/permissions"
import { InvoicingPageClient } from "@/components/accounting/invoicing-page-client"
import { redirect } from "next/navigation"
import { createServerClient } from "@/lib/supabase/server"

export const dynamic = 'force-dynamic'

export default async function InvoicingPage() {
  const { user } = await getCurrentUser()
  
  if (!canAccessModule(user.role as any, "accounting")) {
    redirect("/dashboard")
  }

  const supabase = await createServerClient()

  // Get user agencies
  const { data: userAgencies } = await supabase
    .from("user_agencies")
    .select("agency_id, agencies(id, name)")
    .eq("user_id", user.id)

  const agencies = (userAgencies || []).map((ua: any) => ({
    id: ua.agency_id,
    name: ua.agencies?.name || "Sin nombre",
  }))

  // Get AFIP configuration if exists
  const { data: afipConfig } = await supabase
    .from("afip_config")
    .select("*")
    .maybeSingle()

  return (
    <InvoicingPageClient 
      agencies={agencies} 
      userRole={user.role}
      afipConfig={afipConfig}
    />
  )
}
