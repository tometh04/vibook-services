import { getCurrentUser, getUserAgencies } from "@/lib/auth"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { CommandMenu } from "@/components/command-menu"
import { createServerClient } from "@/lib/supabase/server"
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

  // Usar la primera agencia del usuario como agencia activa
  const activeAgencyId = agencies.length > 0 ? agencies[0].id : undefined

  // Verificar estado de suscripción y bloquear acceso si no tiene plan de pago activo
  if (activeAgencyId) {
    const supabase = await createServerClient()
    const { data: subscription, error: subError } = await (supabase
      .from("subscriptions") as any)
      .select(`
        status,
        mp_preapproval_id,
        plan:subscription_plans(name)
      `)
      .eq("agency_id", activeAgencyId)
      .maybeSingle()

    // Log para debugging
    console.log('[Dashboard Layout] Subscription check:', {
      agencyId: activeAgencyId,
      subscription: subscription ? {
        status: subscription.status,
        planName: subscription.plan?.name,
        mp_preapproval_id: subscription.mp_preapproval_id
      } : null,
      error: subError
    })

    if (subscription) {
      const status = subscription.status as string
      const planName = subscription.plan?.name as string
      
      // LÓGICA SIMPLIFICADA: Respetar los cambios manuales del admin
      // Si el admin cambió el estado manualmente, respetarlo sin importar el plan
      
      // BLOQUEAR acceso solo si:
      // - Status es CANCELED, SUSPENDED, PAST_DUE, o UNPAID
      if (status === 'CANCELED' || status === 'SUSPENDED' || 
          status === 'PAST_DUE' || status === 'UNPAID') {
        console.log('[Dashboard Layout] Bloqueando acceso - estado inválido:', status)
        redirect('/paywall')
      }
      
      // PERMITIR acceso si:
      // - Plan es TESTER (acceso completo sin pago)
      // - Status es ACTIVE (con CUALQUIER plan - respeta cambios manuales del admin)
      // - Status es TRIAL (con CUALQUIER plan - respeta cambios manuales del admin)
      if (planName === 'TESTER' || status === 'ACTIVE' || status === 'TRIAL') {
        console.log('[Dashboard Layout] Permitiendo acceso - suscripción válida:', { status, planName })
        // Continuar al dashboard
      } else {
        // Si no cumple ninguna condición, bloquear
        console.log('[Dashboard Layout] Bloqueando acceso - condición no cumplida:', { status, planName })
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
