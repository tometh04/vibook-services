import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { createServerClient } from "@/lib/supabase/server"
import { createAdminSupabaseClient } from "@/lib/supabase/admin"
import { ONBOARDING_STEPS } from "@/lib/onboarding/steps"
import { ONBOARDING_EVENT_SET } from "@/lib/onboarding/events"

export const runtime = "nodejs"

function isMissingTableError(error: any) {
  const message = String(error?.message || "")
  return error?.code === "PGRST205" || message.toLowerCase().includes("schema cache")
}

export async function GET() {
  try {
    const { user } = await getCurrentUser()
    const supabase = await createServerClient()
    const admin = createAdminSupabaseClient()

    const { data: userAgency, error: agencyError } = await supabase
      .from("user_agencies")
      .select("agency_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle()

    if (agencyError || !userAgency) {
      return NextResponse.json(
        { error: "No se encontró la agencia del usuario" },
        { status: 404 }
      )
    }

    const agencyId = (userAgency as any).agency_id as string

    const { data: subscriptions, error: subError } = await (admin
      .from("subscriptions") as any)
      .select(`
        id,
        agency_id,
        status,
        trial_end,
        plan:subscription_plans(name, features)
      `)
      .eq("agency_id", agencyId)
      .order("created_at", { ascending: false })

    if (subError && !isMissingTableError(subError)) {
      console.error("[Onboarding progress] Error fetching subscriptions:", subError)
    }

    const now = new Date()
    const subscription =
      subscriptions?.find((s: any) => s.plan?.name === "TESTER") ||
      subscriptions?.find((s: any) => s.status === "ACTIVE") ||
      subscriptions?.find((s: any) => {
        if (s.status !== "TRIAL") return false
        if (!s.trial_end) return true
        return new Date(s.trial_end) >= now
      }) ||
      subscriptions?.[0] ||
      null

    let planFeatures: Record<string, boolean> = {}
    if (subscription?.plan?.features) {
      if (typeof subscription.plan.features === "string") {
        try {
          planFeatures = JSON.parse(subscription.plan.features)
        } catch (e) {
          console.error("[Onboarding progress] Error parsing plan features:", e)
        }
      } else {
        planFeatures = subscription.plan.features as Record<string, boolean>
      }
    }

    // Counts principales
    const [leadsRes, operationsRes, paymentsRes, eventsRes] = await Promise.all([
      admin.from("leads").select("id", { count: "exact", head: true }).eq("agency_id", agencyId),
      admin.from("operations").select("id", { count: "exact", head: true }).eq("agency_id", agencyId),
      admin.from("payments").select("id", { count: "exact", head: true }).eq("agency_id", agencyId),
      (admin.from("onboarding_events") as any)
        .select("event_type")
        .eq("user_id", user.id)
        .eq("agency_id", agencyId),
    ])

    const leadsCount = leadsRes?.count || 0
    const operationsCount = operationsRes?.count || 0
    const paymentsCount = paymentsRes?.count || 0

    const events = new Set<string>()
    if (!eventsRes.error && Array.isArray(eventsRes.data)) {
      for (const row of eventsRes.data) {
        const eventType = row?.event_type as string | undefined
        if (eventType && ONBOARDING_EVENT_SET.has(eventType)) {
          events.add(eventType)
        }
      }
    }

    const completionMap: Record<string, boolean> = {
      lead: leadsCount > 0,
      operation: operationsCount > 0,
      payment: paymentsCount > 0,
      finance: events.has("visited_finances"),
      reports: events.has("visited_reports"),
      cerebro: events.has("used_cerebro"),
      emilia: events.has("used_emilia"),
    }

    const skipped = events.has("skipped_onboarding")

    const steps = ONBOARDING_STEPS.filter((step) => {
      if (!step.feature) return true
      return planFeatures?.[step.feature] === true
    }).map((step) => ({
      ...step,
      completed: completionMap[step.id] === true,
    }))

    const currentStep = skipped ? null : steps.find((s) => !s.completed) || null
    const completedCount = steps.filter((s) => s.completed).length

    return NextResponse.json({
      active: !skipped && Boolean(currentStep),
      steps,
      currentStep,
      completedCount,
      totalCount: steps.length,
      planName: subscription?.plan?.name || null,
      skipped,
    })
  } catch (error: any) {
    console.error("Error in GET /api/onboarding/progress:", error)
    return NextResponse.json(
      { error: error.message || "Error al obtener progreso" },
      { status: 500 }
    )
  }
}
