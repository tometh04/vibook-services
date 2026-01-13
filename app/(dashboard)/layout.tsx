import { getCurrentUser, getUserAgencies } from "@/lib/auth"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { CommandMenu } from "@/components/command-menu"
import { createServerClient } from "@/lib/supabase/server"
import { createAdminSupabaseClient } from "@/lib/supabase/admin"
import { redirect } from "next/navigation"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user } = await getCurrentUser()
  const userAgencies = await getUserAgencies(user.id)

  const agencies = (userAgencies || []).map((ua: any) => ({
    id: ua.agency_id,
    name: ua.agencies?.name || "Sin nombre",
  }))

  // Usar cliente admin para evitar problemas de RLS
  const supabaseAdmin = createAdminSupabaseClient()
  
  // Buscar la agencia con suscripción activa, o usar la primera disponible
  let activeAgencyId = undefined
  if (agencies.length > 0) {
    // Buscar agencia con suscripción ACTIVE o TRIAL
    for (const agency of agencies) {
      const { data: subscription } = await (supabaseAdmin
        .from("subscriptions") as any)
        .select("status, plan:subscription_plans(name)")
        .eq("agency_id", agency.id)
        .in("status", ["ACTIVE", "TRIAL"])
        .maybeSingle()
      
      if (subscription) {
        activeAgencyId = agency.id
        break
      }
    }
    
    // Si no encontró ninguna con ACTIVE/TRIAL, usar la primera
    if (!activeAgencyId) {
      activeAgencyId = agencies[0].id
    }
  }

  // Verificar estado de suscripción y bloquear acceso si no tiene plan de pago activo
  if (activeAgencyId) {
    // Obtener todas las suscripciones y tomar la más reciente o la que esté ACTIVE/TRIAL
    const { data: subscriptions, error: subError } = await (supabaseAdmin
      .from("subscriptions") as any)
      .select(`
        id,
        status,
        mp_preapproval_id,
        created_at,
        plan:subscription_plans(name)
      `)
      .eq("agency_id", activeAgencyId)
      .order("created_at", { ascending: false })
    
    // Tomar la suscripción más relevante: ACTIVE > TRIAL > más reciente
    let subscription = null
    if (subscriptions && subscriptions.length > 0) {
      subscription = subscriptions.find((s: any) => s.status === 'ACTIVE') 
        || subscriptions.find((s: any) => s.status === 'TRIAL')
        || subscriptions[0] // La más reciente
    }

    // Log para debugging
    console.log('[Dashboard Layout] Subscription check:', {
      agencyId: activeAgencyId,
      totalSubscriptions: subscriptions?.length || 0,
      subscription: subscription ? {
        id: subscription.id,
        status: subscription.status,
        planName: subscription.plan?.name,
        mp_preapproval_id: subscription.mp_preapproval_id,
        created_at: subscription.created_at
      } : null,
      error: subError
    })

    if (subscription) {
      const status = subscription.status as string
      const planName = subscription.plan?.name as string
      
      // REGLA PRINCIPAL: Contenido SIEMPRE bloqueado EXCEPTO si:
      // 1. Prueba Gratuita (TRIAL)
      // 2. Usuario "Tester" (plan TESTER)
      // 3. Ha pagado una suscripción (ACTIVE)
      
      // PERMITIR acceso solo si:
      // - Plan es TESTER (acceso completo sin pago)
      // - Status es ACTIVE (ha pagado)
      // - Status es TRIAL (prueba gratuita)
      if (planName === 'TESTER' || status === 'ACTIVE' || status === 'TRIAL') {
        console.log('[Dashboard Layout] Permitiendo acceso - suscripción válida:', { status, planName })
        // Continuar al dashboard
      } else {
        // Cualquier otro estado (CANCELED, SUSPENDED, PAST_DUE, UNPAID, FREE sin pago, etc.) = bloqueado
        console.log('[Dashboard Layout] Bloqueando acceso - estado inválido:', { status, planName })
        redirect('/paywall')
      }
    } else {
      // Si no tiene suscripción, redirigir al paywall
      console.log('[Dashboard Layout] Bloqueando acceso - no hay suscripción')
      redirect('/paywall')
    }
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "16rem",
          "--header-height": "3rem",
        } as React.CSSProperties
      }
    >
      <AppSidebar 
        variant="sidebar" 
        collapsible="icon"
        userRole={user.role as any}
        user={{
          name: user.name,
          email: user.email,
          avatar: undefined,
        }}
        agencyId={activeAgencyId}
      />
      <SidebarInset className="min-w-0">
        <SiteHeader />
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 md:p-8">
            {children}
          </div>
        </div>
      </SidebarInset>
      <CommandMenu />
    </SidebarProvider>
  )
}
