import { getCurrentUser } from "@/lib/auth"
import { createServerClient } from "@/lib/supabase/server"
import { OperationsPageClient } from "@/components/operations/operations-page-client"
import { canAccessModule } from "@/lib/permissions"

// Forzar renderizado dinámico para evitar caché
export const dynamic = 'force-dynamic'

export default async function OperationsPage() {
  const { user } = await getCurrentUser()
  
  // Verificar permiso de acceso
  if (!canAccessModule(user.role as any, "operations")) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Operaciones</h1>
          <p className="text-muted-foreground">No tiene permiso para acceder a operaciones</p>
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

  const agencies = (userAgencies || []).map((ua: any) => ({
    id: ua.agency_id,
    name: ua.agencies?.name || "Sin nombre",
  }))
  
  const agencyIds = agencies.map((a: any) => a.id)
  
  console.log(`[Operations Page] User: ${user.id} (${user.email}), Role: ${user.role}`)
  console.log(`[Operations Page] User agencies:`, agencyIds)

  // Get sellers SOLO de las agencias del usuario (AISLAMIENTO SaaS ESTRICTO)
  let sellers: Array<{ id: string; name: string }> = []
  
  if (agencyIds.length > 0) {
    // CRÍTICO: Solo obtener usuarios de las agencias del usuario actual
    const { data: agencyUsers } = await supabase
      .from("user_agencies")
      .select("user_id")
      .in("agency_id", agencyIds)
    
    const userIds = Array.from(new Set((agencyUsers || []).map((au: any) => au.user_id)))
    console.log(`[Operations Page] Users in agencies (${agencyIds.length} agencies):`, userIds.length)
    
    if (userIds.length > 0) {
      const { data: sellersData } = await supabase
        .from("users")
        .select("id, name, email, role")
        .in("id", userIds)
        .in("role", ["SELLER", "ADMIN", "SUPER_ADMIN"])
        .eq("is_active", true)
      
      console.log(`[Operations Page] Sellers found:`, sellersData?.map((s: any) => `${s.name} (${s.email}, ${s.role})`))
      sellers = (sellersData || []).map((s: any) => ({ id: s.id, name: s.name }))
    }
  }

  // Get operators (los operadores son globales, no están aislados por agencia)
  const { data: operators } = await supabase.from("operators").select("id, name").order("name")

  return (
    <OperationsPageClient
      sellers={sellers}
      agencies={agencies}
      operators={(operators || []).map((o: any) => ({ id: o.id, name: o.name }))}
      userRole={user.role}
      userId={user.id}
      userAgencyIds={agencyIds}
      defaultAgencyId={agencies[0]?.id}
      defaultSellerId={user.role === "SELLER" ? user.id : undefined}
    />
  )
}
