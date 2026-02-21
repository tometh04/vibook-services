import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { createServerClient } from "@/lib/supabase/server"
import { createAdminSupabaseClient } from "@/lib/supabase/admin"

export const runtime = 'nodejs'

/**
 * POST /api/billing/checkout-immediate
 * Endpoint para upgrade durante trial - cobra inmediatamente (sin período de prueba).
 * Se llama cuando el usuario confirma que quiere perder los días de trial restantes.
 */
export async function POST(request: Request) {
  try {
    const { user } = await getCurrentUser()

    // Rate limiting
    const { checkRateLimit } = await import("@/lib/rate-limit")
    const rateLimitCheck = checkRateLimit('/api/billing/checkout-immediate', user.id)
    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        {
          error: "Demasiadas solicitudes. Por favor, intentá nuevamente más tarde.",
          retryAfter: Math.ceil((rateLimitCheck.resetAt - Date.now()) / 1000)
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((rateLimitCheck.resetAt - Date.now()) / 1000)),
          }
        }
      )
    }

    const supabase = await createServerClient()
    const supabaseAdmin = createAdminSupabaseClient()
    const body = await request.json()
    const { planId } = body

    if (!planId) {
      return NextResponse.json({ error: "Plan ID es requerido" }, { status: 400 })
    }

    // Obtener el plan
    const { data: planData, error: planError } = await supabase
      .from("subscription_plans")
      .select("*")
      .eq("id", planId)
      .single()

    if (planError || !planData) {
      return NextResponse.json({ error: "Plan no encontrado" }, { status: 404 })
    }

    const plan = planData as any

    if (plan.name === 'ENTERPRISE' || plan.price_monthly === 0 || plan.name === 'FREE') {
      return NextResponse.json({ error: "Plan no válido para checkout inmediato" }, { status: 400 })
    }

    // Obtener agencia del usuario
    const { data: userAgencies } = await supabase
      .from("user_agencies")
      .select("agency_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle()

    if (!userAgencies) {
      return NextResponse.json({ error: "No se encontró la agencia del usuario" }, { status: 404 })
    }

    const agencyId = (userAgencies as any).agency_id

    // Verificar que tiene suscripción en TRIAL
    const { data: existingSubscription } = await supabase
      .from("subscriptions")
      .select("id, status, trial_end, plan_id")
      .eq("agency_id", agencyId)
      .maybeSingle()

    if (!existingSubscription || (existingSubscription as any).status !== 'TRIAL') {
      return NextResponse.json(
        { error: "No hay un período de prueba activo para actualizar" },
        { status: 400 }
      )
    }

    // Crear Preapproval con pago inmediato (sin trial)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.vibook.ai'
    const backUrl = new URL('/api/billing/preapproval-callback', appUrl)
    backUrl.searchParams.set('agency_id', agencyId)
    backUrl.searchParams.set('plan_id', planId)
    backUrl.searchParams.set('source', 'checkout-immediate')

    const { createPreApproval } = await import('@/lib/mercadopago/client')

    // Pago inmediato - comenzar mañana para dar tiempo al procesamiento
    const startDate = new Date()
    startDate.setDate(startDate.getDate() + 1)

    const preapproval = await createPreApproval({
      reason: `Suscripción ${plan.display_name} - Vibook Gestión (Upgrade)`,
      auto_recurring: {
        frequency: 30,
        frequency_type: 'days',
        transaction_amount: plan.price_monthly,
        currency_id: 'ARS',
        start_date: startDate.toISOString()
      },
      external_reference: JSON.stringify({
        agency_id: agencyId,
        plan_id: planId,
        user_id: user.id,
        is_upgrade: true,
        has_used_trial: true
      }),
      back_url: backUrl.toString()
    })

    // Actualizar suscripción existente
    const { error: updateError } = await (supabaseAdmin
      .from("subscriptions") as any)
      .update({
        plan_id: planId,
        mp_preapproval_id: preapproval.id,
        mp_status: preapproval.status,
        trial_end: new Date().toISOString(), // Terminar trial ahora
        updated_at: new Date().toISOString()
      })
      .eq("id", (existingSubscription as any).id)

    if (updateError) {
      console.error("Error updating subscription:", updateError)
      return NextResponse.json(
        { error: "Error al actualizar suscripción. Intenta nuevamente." },
        { status: 500 }
      )
    }

    // Marcar trial como usado
    await (supabaseAdmin.from("agencies") as any)
      .update({ has_used_trial: true })
      .eq("id", agencyId)

    await (supabaseAdmin.from("users") as any)
      .update({ has_used_trial: true })
      .eq("id", user.id)

    const checkoutUrl = preapproval.init_point || preapproval.sandbox_init_point

    if (!checkoutUrl) {
      throw new Error('No se pudo obtener la URL de checkout del preapproval')
    }

    return NextResponse.json({
      preapprovalId: preapproval.id,
      checkoutUrl,
    })
  } catch (error: any) {
    console.error("Error in POST /api/billing/checkout-immediate:", error)
    return NextResponse.json(
      { error: error.message || "Error al crear checkout inmediato" },
      { status: 500 }
    )
  }
}
