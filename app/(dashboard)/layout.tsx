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
    const { data: subscription } = await (supabase
      .from("subscriptions") as any)
      .select(`
        status,
        plan:subscription_plans(name)
      `)
      .eq("agency_id", activeAgencyId)
      .maybeSingle()

    if (subscription) {
      const status = subscription.status as string
      const planName = subscription.plan?.name as string
      
      // Si no tiene suscripción o está en estados que bloquean acceso
      if (status === 'CANCELED' || status === 'SUSPENDED' || 
          status === 'PAST_DUE' || status === 'UNPAID') {
        redirect('/paywall')
      }
      
      // Si tiene plan FREE (sin pago), bloquear acceso y redirigir al paywall
      if (planName === 'FREE' && !subscription.mp_preapproval_id) {
        redirect('/paywall')
      }
      
      // Si tiene plan FREE pero está en TRIAL sin preapproval, también bloquear
      // (esto significa que nunca completó el pago)
      if (planName === 'FREE' && status === 'TRIAL' && !subscription.mp_preapproval_id) {
        redirect('/paywall')
      }
    } else {
      // Si no tiene suscripción, redirigir al paywall
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
