import { NextResponse } from "next/server"
import { createAdminSupabaseClient } from "@/lib/supabase/admin"

/**
 * POST /api/admin/subscriptions/create
 * Crea una nueva suscripción para una agencia (solo desde admin subdomain)
 */
export async function POST(request: Request) {
  try {
    // El middleware ya verifica que viene del subdominio admin
    const body = await request.json()
    const { agency_id, plan_id } = body

    if (!agency_id || !plan_id) {
      return NextResponse.json(
        { error: "agency_id y plan_id son requeridos" },
        { status: 400 }
      )
    }

    const supabase = createAdminSupabaseClient()

    // Verificar que el plan existe
    const { data: plan, error: planError } = await supabase
      .from("subscription_plans")
      .select("id, name")
      .eq("id", plan_id)
      .single()

    if (planError || !plan) {
      return NextResponse.json({ error: "Plan no encontrado" }, { status: 404 })
    }

    // Verificar que la agencia existe
    const { data: agency, error: agencyError } = await supabase
      .from("agencies")
      .select("id")
      .eq("id", agency_id)
      .single()

    if (agencyError || !agency) {
      return NextResponse.json({ error: "Agencia no encontrada" }, { status: 404 })
    }

    // Si el plan es TESTER, crear con status ACTIVE
    // Si es otro plan, crear con status TRIAL y 7 días de prueba
    const isTester = (plan as any).name === 'TESTER'
    const now = new Date()
    const trialEnd = new Date(now)
    trialEnd.setDate(trialEnd.getDate() + 7)

    const subscriptionData: any = {
      agency_id,
      plan_id,
      status: isTester ? 'ACTIVE' : 'TRIAL',
      current_period_start: now.toISOString(),
      current_period_end: isTester ? new Date(now.getFullYear(), now.getMonth() + 1, now.getDate()).toISOString() : trialEnd.toISOString(),
      billing_cycle: 'MONTHLY',
    }

    if (!isTester) {
      subscriptionData.trial_start = now.toISOString()
      subscriptionData.trial_end = trialEnd.toISOString()
    }

    // Crear suscripción
    const { data: newSubscription, error: createError } = await (supabase
      .from("subscriptions") as any)
      .insert(subscriptionData)
      .select(`
        *,
        plan:subscription_plans(*)
      `)
      .single()

    if (createError) {
      console.error("Error creating subscription:", createError)
      return NextResponse.json({ error: "Error al crear suscripción" }, { status: 500 })
    }

    // Registrar evento de billing
    try {
      await (supabase.from("billing_events") as any).insert({
        agency_id,
        subscription_id: newSubscription.id,
        event_type: "SUBSCRIPTION_CREATED_BY_ADMIN",
        metadata: { 
          created_by: "admin",
          plan_name: (plan as any).name
        }
      })
    } catch (e) {
      console.error("Error registrando evento:", e)
    }

    return NextResponse.json({ success: true, subscription: newSubscription })
  } catch (error: any) {
    console.error("Error in create subscription:", error)
    return NextResponse.json({ error: error.message || "Error al crear suscripción" }, { status: 500 })
  }
}
