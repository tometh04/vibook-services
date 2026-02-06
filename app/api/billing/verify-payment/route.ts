import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { createServerClient } from "@/lib/supabase/server"
import { createAdminSupabaseClient } from "@/lib/supabase/admin"
import { getPreApproval } from "@/lib/mercadopago/client"

export const runtime = 'nodejs'

function isTrialActive(trialEnd: string | null | undefined) {
  if (!trialEnd) return false
  const end = new Date(trialEnd)
  return end >= new Date()
}

export async function POST() {
  try {
    const { user } = await getCurrentUser()
    const supabase = await createServerClient()
    const supabaseAdmin = createAdminSupabaseClient()

    // Obtener agencia del usuario
    const { data: userAgencies } = await supabase
      .from("user_agencies")
      .select("agency_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle()

    if (!userAgencies) {
      return NextResponse.json({
        success: false,
        error: "No se encontró la agencia del usuario"
      }, { status: 404 })
    }

    const agencyId = (userAgencies as any).agency_id

    // Buscar la suscripción más reciente
    const { data: subscription } = await (supabaseAdmin
      .from("subscriptions") as any)
      .select(`id, status, mp_preapproval_id, trial_end, plan:subscription_plans(name)`)
      .eq("agency_id", agencyId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!subscription) {
      return NextResponse.json({
        success: false,
        error: "No se encontró suscripción para esta agencia"
      }, { status: 404 })
    }

    const planName = subscription.plan?.name as string | undefined
    if (planName === 'TESTER') {
      return NextResponse.json({
        success: true,
        newStatus: 'ACTIVE',
        mpStatus: 'authorized',
        message: 'Plan tester activo'
      })
    }

    if (!subscription.mp_preapproval_id) {
      return NextResponse.json({
        success: false,
        error: "No hay preapproval asociado a la suscripción"
      }, { status: 400 })
    }

    // Consultar estado en Mercado Pago
    const preapproval = await getPreApproval(subscription.mp_preapproval_id)
    const mpStatus = (preapproval as any).status as string

    let newStatus: 'TRIAL' | 'ACTIVE' | 'CANCELED' | 'PAST_DUE' | 'UNPAID' | 'SUSPENDED' = 'UNPAID'

    if (mpStatus === 'cancelled' || mpStatus === 'canceled') {
      newStatus = 'CANCELED'
    } else if (mpStatus === 'paused') {
      newStatus = 'SUSPENDED'
    } else if (mpStatus === 'authorized') {
      newStatus = isTrialActive(subscription.trial_end) ? 'TRIAL' : 'ACTIVE'
    } else if (mpStatus === 'pending') {
      newStatus = isTrialActive(subscription.trial_end) ? 'TRIAL' : 'UNPAID'
    }

    // Actualizar suscripción
    await (supabaseAdmin
      .from("subscriptions") as any)
      .update({
        status: newStatus,
        mp_status: mpStatus,
        updated_at: new Date().toISOString()
      })
      .eq("id", subscription.id)

    // Si se activó trial, marcar has_used_trial
    if (newStatus === 'TRIAL') {
      await (supabaseAdmin
        .from("agencies") as any)
        .update({ has_used_trial: true })
        .eq("id", agencyId)
    }

    return NextResponse.json({
      success: true,
      newStatus,
      mpStatus,
      message: newStatus === 'ACTIVE'
        ? 'Pago confirmado. Tu suscripción está activa.'
        : newStatus === 'TRIAL'
          ? 'Pago confirmado. Tu prueba gratuita está activa.'
          : 'Estado de pago verificado.'
    })
  } catch (error: any) {
    console.error("Error in POST /api/billing/verify-payment:", error)
    return NextResponse.json({
      success: false,
      error: error.message || "Error al verificar el pago"
    }, { status: 500 })
  }
}
