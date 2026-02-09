import { ensureUserAgencyLink, getCurrentUser, getUserAgencies } from "@/lib/auth"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { createServerClient } from "@/lib/supabase/server"
import { createAdminSupabaseClient } from "@/lib/supabase/admin"
import { redirect } from "next/navigation"
import { BrandingProvider } from "@/components/branding-provider"
import { OnboardingTracker } from "@/components/onboarding/onboarding-tracker"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, session } = await getCurrentUser()
  await ensureUserAgencyLink(user, session.user)
  const userAgencies = await getUserAgencies(user.id)

  const agencies = (userAgencies || []).map((ua: any) => ({
    id: ua.agency_id,
    name: ua.agencies?.name || "Sin nombre",
  }))

  if (agencies.length === 0) {
    // Seguridad: sin agencia asignada, no permitir acceso al dashboard
    redirect('/login?error=no_agency')
  }

  // Usar cliente admin para evitar problemas de RLS
  const supabaseAdmin = createAdminSupabaseClient()

  // Seleccionar suscripción consistente con el API /subscription
  let activeAgencyId = agencies.length > 0 ? agencies[0].id : undefined
  if (agencies.length > 0) {
    const agencyIds = agencies.map((a: any) => a.id)
    const { data: subscriptions, error: subError } = await (supabaseAdmin
      .from("subscriptions") as any)
      .select(`
        id,
        agency_id,
        status,
        mp_preapproval_id,
        created_at,
        trial_end,
        plan:subscription_plans(name)
      `)
      .in("agency_id", agencyIds)
      .order("created_at", { ascending: false })

    const now = new Date()
    const testerSubscription = subscriptions?.find((s: any) => s.plan?.name === 'TESTER') || null
    const activeSubscription = subscriptions?.find((s: any) => s.status === 'ACTIVE') || null
    const trialSubscription = subscriptions?.find((s: any) => {
      if (s.status !== 'TRIAL') return false
      if (!s.trial_end) return true
      return new Date(s.trial_end) >= now
    }) || null

    const subscription = testerSubscription || activeSubscription || trialSubscription || (subscriptions?.[0] ?? null)
    if (subscription?.agency_id) {
      activeAgencyId = subscription.agency_id
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
      const trialEndRaw = subscription.trial_end as string | null | undefined
      const trialEndDate = trialEndRaw ? new Date(trialEndRaw) : null
      const trialActive = status === 'TRIAL' && (!trialEndDate || trialEndDate >= new Date())

      if (planName === 'TESTER' || status === 'ACTIVE' || trialActive) {
        console.log('[Dashboard Layout] Permitiendo acceso - suscripción válida:', { status, planName })
      } else {
        console.log('[Dashboard Layout] Bloqueando acceso - estado inválido:', { status, planName })
        redirect('/paywall')
      }
    } else {
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
      <BrandingProvider agencyId={activeAgencyId} />
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
        <OnboardingTracker />
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-background">
            {children}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
