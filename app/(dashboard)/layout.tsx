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
      const mpPreapprovalId = subscription.mp_preapproval_id
      
      // Si está en estados que bloquean acceso
      if (status === 'CANCELED' || status === 'SUSPENDED' || 
          status === 'PAST_DUE' || status === 'UNPAID') {
        console.log('[Dashboard Layout] Bloqueando acceso - estado inválido:', status)
        redirect('/paywall')
      }
      
      // Si tiene plan FREE (sin pago), bloquear acceso y redirigir al paywall
      if (planName === 'FREE' && !mpPreapprovalId) {
        console.log('[Dashboard Layout] Bloqueando acceso - plan FREE sin pago')
        redirect('/paywall')
      }
      
      // Si tiene plan FREE pero está en TRIAL sin preapproval, también bloquear
      if (planName === 'FREE' && status === 'TRIAL' && !mpPreapprovalId) {
        console.log('[Dashboard Layout] Bloqueando acceso - plan FREE en TRIAL sin pago')
        redirect('/paywall')
      }

      // PERMITIR acceso si:
      // - Plan es TESTER (acceso completo sin pago)
      // - Status es ACTIVE (con cualquier plan)
      // - Status es TRIAL con plan de pago (STARTER, PRO, etc.)
      // - Status es TRIAL con plan FREE pero tiene mp_preapproval_id (pagó)
      if (planName === 'TESTER' ||
          status === 'ACTIVE' || 
          (status === 'TRIAL' && planName !== 'FREE') ||
          (status === 'TRIAL' && planName === 'FREE' && mpPreapprovalId)) {
        console.log('[Dashboard Layout] Permitiendo acceso - suscripción válida')
        // Continuar al dashboard
      } else {
        console.log('[Dashboard Layout] Bloqueando acceso - condición no cumplida')
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
