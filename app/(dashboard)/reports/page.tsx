import { getCurrentUser } from "@/lib/auth"
import { createServerClient } from "@/lib/supabase/server"
import { ReportsPageClient } from "@/components/reports/reports-page-client"
import { PaywallGate } from "@/components/billing/paywall-gate"
import { verifyFeatureAccess } from "@/lib/billing/subscription-middleware"

export const dynamic = 'force-dynamic'

export default async function ReportsPage() {
  const { user } = await getCurrentUser()
  
  const featureAccess = await verifyFeatureAccess(user.id, user.role, "reports")
  if (!featureAccess.hasAccess) {
    return (
      <PaywallGate feature="reports" requiredPlan="Starter" message="Los reportes avanzados están disponibles en planes Starter y superiores.">
        <div className="h-64 rounded-lg border border-dashed border-muted-foreground/30" />
      </PaywallGate>
    )
  }

  const supabase = await createServerClient()

  // Obtener vendedores para el filtro
  const { data: sellers } = await supabase
    .from("users")
    .select("id, name")
    .in("role", ["SELLER", "ADMIN", "SUPER_ADMIN"])
    .order("name")

  // Obtener agencias para el filtro
  const { data: agencies } = await supabase
    .from("agencies")
    .select("id, name")
    .order("name")

  return (
    <PaywallGate feature="reports" requiredPlan="Starter" message="Los reportes avanzados están disponibles en planes Starter y superiores.">
      <ReportsPageClient
        userRole={user.role}
        userId={user.id}
        sellers={sellers || []}
        agencies={agencies || []}
      />
    </PaywallGate>
  )
}
