import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/auth"
import { createAdminSupabaseClient } from "@/lib/supabase/admin"

export const dynamic = 'force-dynamic'

function isMissingTableError(error: any) {
  const message = String(error?.message || "")
  return error?.code === "PGRST205" || message.toLowerCase().includes("schema cache")
}

/**
 * GET /api/subscription
 * Obtiene la suscripción del usuario actual (usa admin client para bypasear RLS)
 */
export async function GET() {
  try {
    const { user } = await getCurrentUser()
    const supabase = await createServerClient()
    const adminSupabase = createAdminSupabaseClient()
    
    // 1. Obtener agencias del usuario
    const { data: userAgencies } = await supabase
      .from("user_agencies")
      .select("agency_id")
      .eq("user_id", user.id)
    
    if (!userAgencies || userAgencies.length === 0) {
      return NextResponse.json({ 
        subscription: null, 
        usage: null,
        message: "Usuario sin agencia asignada" 
      })
    }
    
    const agencyIds = userAgencies.map((ua: any) => ua.agency_id)
    
    // 2. Buscar suscripciones usando ADMIN client (bypasa RLS)
    const { data: subscriptionsData, error: subError } = await (adminSupabase
      .from("subscriptions") as any)
      .select(`
        *,
        plan:subscription_plans(*)
      `)
      .in("agency_id", agencyIds)
      .order("created_at", { ascending: false })
    
    if (subError) {
      console.error("[API /subscription] Error fetching subscriptions:", subError)
      if (isMissingTableError(subError)) {
        return NextResponse.json({
          subscription: null,
          usage: null,
          agencyId: agencyIds[0],
          warning: "billing_tables_missing",
        })
      }
      return NextResponse.json({ error: "Error al obtener suscripción" }, { status: 500 })
    }
    
    // 3. Seleccionar la suscripción más relevante
    let subscription = null
    let selectedAgencyId = agencyIds[0]
    
    if (subscriptionsData && subscriptionsData.length > 0) {
      // Priorizar: TESTER > ACTIVE > TRIAL > más reciente
      subscription = subscriptionsData.find((s: any) => s.plan?.name === 'TESTER')
        || subscriptionsData.find((s: any) => s.status === 'ACTIVE')
        || subscriptionsData.find((s: any) => s.status === 'TRIAL')
        || subscriptionsData[0]
      
      if (subscription) {
        selectedAgencyId = subscription.agency_id
        
        // Parsear features si es string
        if (subscription.plan && typeof subscription.plan.features === 'string') {
          try {
            subscription.plan.features = JSON.parse(subscription.plan.features)
          } catch (e) {
            console.error("[API /subscription] Error parsing features:", e)
          }
        }
      }
    }
    
    // 4. Obtener métricas de uso del mes actual
    let usage = null
    const currentMonthStart = new Date()
    currentMonthStart.setDate(1)
    currentMonthStart.setHours(0, 0, 0, 0)
    
    const { data: usageData, error: usageError } = await (adminSupabase
      .from("usage_metrics") as any)
      .select("*")
      .eq("agency_id", selectedAgencyId)
      .eq("period_start", currentMonthStart.toISOString().split('T')[0])
      .maybeSingle()
    
    if (usageError) {
      if (!isMissingTableError(usageError)) {
        console.error("[API /subscription] Error fetching usage:", usageError)
      }
    } else if (usageData) {
      usage = usageData
    }
    
    console.log("[API /subscription] Result:", {
      user: user.email,
      agencyIds,
      subscriptionFound: !!subscription,
      plan: subscription?.plan?.name,
      status: subscription?.status
    })
    
    return NextResponse.json({
      subscription,
      usage,
      agencyId: selectedAgencyId
    })
  } catch (error: any) {
    console.error("[API /subscription] Error:", error)
    if (isMissingTableError(error)) {
      return NextResponse.json({
        subscription: null,
        usage: null,
        warning: "billing_tables_missing",
      })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
