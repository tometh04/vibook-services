import { getCurrentUser } from "@/lib/auth"
import { createServerClient } from "@/lib/supabase/server"
import { LeadsKanban } from "@/components/sales/leads-kanban"
import { LeadsTable } from "@/components/sales/leads-table"
import { LeadsPageClient } from "@/components/sales/leads-page-client"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { canAccessModule } from "@/lib/permissions"
import { PaywallGate } from "@/components/billing/paywall-gate"

export default async function LeadsPage() {
  const { user } = await getCurrentUser()
  
  // Verificar permiso de acceso
  const userRole = user.role as any
  if (!canAccessModule(userRole, "leads")) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Leads</h1>
          <p className="text-muted-foreground">No tiene permiso para acceder a leads</p>
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

  const agencyIds = (userAgencies || []).map((ua: any) => ua.agency_id)

  // Get agencies for filters
  // SUPER_ADMIN (admin@vibook.ai) ve todas, ADMIN solo sus agencias
  let agenciesQuery = supabase
    .from("agencies")
    .select("id, name")
  
  if (user.role !== "SUPER_ADMIN") {
    agenciesQuery = agenciesQuery.in("id", agencyIds.length > 0 ? agencyIds : [])
  }
  
  const { data } = await agenciesQuery.order("name")
  const agencies = (data || []) as Array<{ id: string; name: string }>

  // Get sellers for filters - SOLO de las agencias del usuario (AISLAMIENTO SaaS)
  let sellers: Array<{ id: string; name: string }> = []
  
  if (user.role === "SELLER") {
    // El vendedor solo se ve a sí mismo
    sellers = [{ id: user.id, name: user.name || user.email }]
  } else if (agencyIds.length > 0) {
    // Obtener usuarios de las mismas agencias
    const { data: agencyUsers } = await supabase
      .from("user_agencies")
      .select("user_id")
      .in("agency_id", agencyIds)
    
    const userIds = [...new Set((agencyUsers || []).map((au: any) => au.user_id))]
    
    if (userIds.length > 0) {
      const { data: sellersData } = await supabase
        .from("users")
        .select("id, name")
        .in("id", userIds)
        .in("role", ["SELLER", "ADMIN", "SUPER_ADMIN"])
        .eq("is_active", true)
      
      sellers = (sellersData || []).map((s: any) => ({ id: s.id, name: s.name }))
    }
  }

  // Get operators for conversion dialog
  const { data: operators } = await supabase
    .from("operators")
    .select("id, name")
    .order("name")

  // Get leads del CRM interno
  let leads: any[] = []
  let leadsError: any = null
  const INITIAL_LIMIT = 2000

  if (user.role === "SELLER") {
    // Vendedor ve:
    // 1. Leads asignados a él
    // 2. Leads SIN asignar de sus agencias (para poder agarrarlos)
    const { data: myLeads, error: myLeadsError } = await supabase
      .from("leads")
      .select("*, agencies(name), users:assigned_seller_id(name, email)")
      .eq("assigned_seller_id", user.id)
      .eq("source", "CRM")
      .order("updated_at", { ascending: false })
      .limit(INITIAL_LIMIT)

    const { data: unassignedLeads, error: unassignedError } = await supabase
      .from("leads")
      .select("*, agencies(name), users:assigned_seller_id(name, email)")
      .is("assigned_seller_id", null)
      .eq("source", "CRM")
      .in("agency_id", agencyIds.length > 0 ? agencyIds : [])
      .order("updated_at", { ascending: false })
      .limit(INITIAL_LIMIT)

    leads = [...(myLeads || []), ...(unassignedLeads || [])]
    leadsError = myLeadsError || unassignedError
  } else {
    // Admin/otros: cargar leads iniciales
    let query = supabase
      .from("leads")
      .select("*, agencies(name), users:assigned_seller_id(name, email)")
      .eq("source", "CRM")
    
    if (agencyIds.length > 0 && user.role !== "SUPER_ADMIN") {
      query = query.in("agency_id", agencyIds)
    }

    const { data, error } = await query
      .order("updated_at", { ascending: false })
      .limit(INITIAL_LIMIT)
    
    leads = data || []
    leadsError = error
  }

  if (leadsError) {
    console.error("Error fetching leads:", leadsError)
  }

  return (
    <PaywallGate feature="crm" requiredPlan="Starter" message="El CRM está disponible en planes Starter y superiores.">
      <LeadsPageClient
      initialLeads={leads || []}
      agencies={(agencies || []) as Array<{ id: string; name: string }>}
      sellers={sellers}
      operators={(operators || []) as Array<{ id: string; name: string }>}
      defaultAgencyId={agencyIds[0] || undefined}
      defaultSellerId={user.role === "SELLER" ? user.id : undefined}
      currentUserId={user.id}
      currentUserRole={user.role}
      />
    </PaywallGate>
  )
}
