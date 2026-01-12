import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { createServerClient } from "@/lib/supabase/server"
import { createPreference } from "@/lib/mercadopago/client"

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const { user } = await getCurrentUser()
    const supabase = await createServerClient()
    const body = await request.json()
    const { planId } = body

    if (!planId) {
      return NextResponse.json(
        { error: "Plan ID es requerido" },
        { status: 400 }
      )
    }

    // Obtener el plan
    // @ts-ignore - subscription_plans no está en los tipos generados todavía
    const { data: planData, error: planError } = await supabase
      .from("subscription_plans")
      .select("*")
      .eq("id", planId)
      .single()

    if (planError || !planData) {
      return NextResponse.json(
        { error: "Plan no encontrado" },
        { status: 404 }
      )
    }

    const plan = planData as any // Cast porque los tipos no están generados todavía

    // Plan FREE no requiere pago
    if (plan.name === 'FREE') {
      return NextResponse.json(
        { error: "El plan FREE ya está activo" },
        { status: 400 }
      )
    }

    // Obtener la agencia del usuario
    const { data: userAgencies, error: userAgenciesError } = await supabase
      .from("user_agencies")
      .select("agency_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle()

    if (userAgenciesError || !userAgencies) {
      return NextResponse.json(
        { error: "No se encontró la agencia del usuario" },
        { status: 404 }
      )
    }

    const agencyId = (userAgencies as any).agency_id

    // Verificar si ya tiene una suscripción activa
    const { data: existingSubscription } = await supabase
      .from("subscriptions")
      .select("id, status")
      .eq("agency_id", agencyId)
      .maybeSingle()

    // Crear Preapproval dinámicamente usando la API de Mercado Pago
    // Esto evita problemas de autorización de dominio
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.vibook.ai'
    const { createPreApproval } = await import('@/lib/mercadopago/client')
    
    // Calcular fecha de inicio (7 días desde ahora para el trial)
    const trialStartDate = new Date()
    trialStartDate.setDate(trialStartDate.getDate() + 7)
    
    // Crear Preapproval con trial de 7 días
    const preapproval = await createPreApproval({
      reason: `Suscripción ${plan.display_name} - Vibook Gestión`,
      auto_recurring: {
        frequency: 30, // Mensual
        frequency_type: 'days',
        transaction_amount: plan.price_monthly,
        currency_id: 'ARS',
        start_date: trialStartDate.toISOString() // Comienza después del trial
      },
      payer_email: user.email,
      external_reference: JSON.stringify({
        agency_id: agencyId,
        plan_id: planId,
        user_id: user.id
      }),
      back_url: `${appUrl}/api/billing/preapproval-callback`
    })

    // Guardar preapproval_id en la suscripción (si existe) o crear una nueva
    if (existingSubscription) {
      await (supabase
        .from("subscriptions") as any)
        .update({
          mp_preapproval_id: preapproval.id,
          mp_status: preapproval.status,
          updated_at: new Date().toISOString()
        })
        .eq("id", (existingSubscription as any).id)
    } else {
      // Crear suscripción pendiente
      await (supabase
        .from("subscriptions") as any)
        .insert({
          agency_id: agencyId,
          plan_id: planId,
          mp_preapproval_id: preapproval.id,
          mp_status: preapproval.status,
          status: 'TRIAL',
          current_period_start: new Date().toISOString(),
          current_period_end: trialStartDate.toISOString(),
          trial_start: new Date().toISOString(),
          trial_end: trialStartDate.toISOString(),
          billing_cycle: 'MONTHLY'
        })
    }

    // Retornar la URL de checkout del preapproval
    // Mercado Pago genera automáticamente una URL de checkout
    const checkoutUrl = preapproval.init_point || preapproval.sandbox_init_point

    if (!checkoutUrl) {
      throw new Error('No se pudo obtener la URL de checkout del preapproval')
    }

    return NextResponse.json({ 
      preapprovalId: preapproval.id,
      checkoutUrl: checkoutUrl,
      initPoint: checkoutUrl,
      sandboxInitPoint: checkoutUrl
    })
  } catch (error: any) {
    console.error("Error in POST /api/billing/checkout:", error)
    return NextResponse.json(
      { error: error.message || "Error al crear la preferencia de pago" },
      { status: 500 }
    )
  }
}
