import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/auth"
import { getPreApproval } from "@/lib/mercadopago/client"

export const runtime = 'nodejs'

/**
 * Callback para cuando el usuario completa una suscripción usando Preapproval Plan
 * Este endpoint se llama desde el botón de Mercado Pago después de que el usuario
 * completa el proceso de suscripción
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const preapprovalId = searchParams.get('preapproval_id')
    const status = searchParams.get('status')

    if (!preapprovalId) {
      return NextResponse.redirect(new URL('/pricing?error=no_preapproval_id', request.url))
    }

    // Obtener información del usuario actual
    const { user } = await getCurrentUser()
    const supabase = await createServerClient()

    // Obtener información del preapproval de Mercado Pago
    let preapproval: any
    try {
      const preapprovalResponse = await getPreApproval(preapprovalId)
      preapproval = preapprovalResponse as any
    } catch (error: any) {
      console.error('Error obteniendo preapproval:', error)
      return NextResponse.redirect(new URL('/pricing?error=preapproval_not_found', request.url))
    }

    // Obtener la agencia del usuario
    const { data: userAgencies, error: userAgenciesError } = await supabase
      .from("user_agencies")
      .select("agency_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle()

    if (userAgenciesError || !userAgencies) {
      return NextResponse.redirect(new URL('/pricing?error=no_agency', request.url))
    }

    const agencyId = (userAgencies as any).agency_id

    // Determinar el plan basado en el monto del preapproval
    // STARTER: $15,000 ARS
    let planName = 'STARTER'
    if (preapproval.auto_recurring?.transaction_amount === 15000) {
      planName = 'STARTER'
    } else if (preapproval.auto_recurring?.transaction_amount === 50000) {
      planName = 'PRO'
    }

    // Obtener el plan de la base de datos
    const { data: planData, error: planError } = await supabase
      .from("subscription_plans")
      .select("id")
      .eq("name", planName)
      .single()

    if (planError || !planData) {
      console.error('Error obteniendo plan:', planError)
      return NextResponse.redirect(new URL('/pricing?error=plan_not_found', request.url))
    }

    const planId = planData.id

    // Mapear estado de Mercado Pago a nuestro estado
    const mpStatus = preapproval.status as string
    let subscriptionStatus: 'TRIAL' | 'ACTIVE' | 'CANCELED' | 'PAST_DUE' | 'UNPAID' | 'SUSPENDED' = 'TRIAL'
    
    if (mpStatus === 'cancelled') {
      subscriptionStatus = 'CANCELED'
    } else if (mpStatus === 'paused') {
      subscriptionStatus = 'SUSPENDED'
    } else if (mpStatus === 'authorized') {
      subscriptionStatus = 'ACTIVE'
    } else if (mpStatus === 'pending') {
      subscriptionStatus = 'TRIAL'
    }

    // Verificar si ya existe una suscripción
    const { data: existingSubscription } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("agency_id", agencyId)
      .maybeSingle()

    const subscriptionData: any = {
      agency_id: agencyId,
      plan_id: planId,
      mp_preapproval_id: preapprovalId,
      mp_status: mpStatus,
      mp_payer_id: preapproval.payer_id?.toString() || preapproval.payer_id,
      status: subscriptionStatus,
      billing_cycle: 'MONTHLY',
      updated_at: new Date().toISOString()
    }

    // Actualizar fechas si están disponibles
    if (preapproval.auto_recurring?.start_date) {
      subscriptionData.current_period_start = new Date(preapproval.auto_recurring.start_date).toISOString()
    } else {
      subscriptionData.current_period_start = new Date().toISOString()
    }

    if (preapproval.auto_recurring?.end_date) {
      subscriptionData.current_period_end = new Date(preapproval.auto_recurring.end_date).toISOString()
    } else {
      // Calcular próximo período (30 días desde ahora)
      subscriptionData.current_period_end = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    }

    // Trial de 30 días
    subscriptionData.trial_start = new Date().toISOString()
    subscriptionData.trial_end = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

    if (existingSubscription) {
      // Actualizar suscripción existente
      await (supabase
        .from("subscriptions") as any)
        .update(subscriptionData)
        .eq("id", existingSubscription.id)
    } else {
      // Crear nueva suscripción
      subscriptionData.created_at = new Date().toISOString()
      await (supabase
        .from("subscriptions") as any)
        .insert(subscriptionData)
    }

    // Registrar evento
    await (supabase
      .from("billing_events") as any)
      .insert({
        agency_id: agencyId,
        subscription_id: existingSubscription?.id || null,
        event_type: 'SUBSCRIPTION_CREATED',
        mp_notification_id: preapprovalId,
        metadata: { status: mpStatus, mp_data: preapproval }
      })

    // Redirigir a billing con éxito
    return NextResponse.redirect(new URL(`/settings/billing?status=success&preapproval_id=${preapprovalId}`, request.url))
  } catch (error: any) {
    console.error('Error en preapproval callback:', error)
    return NextResponse.redirect(new URL('/pricing?error=callback_error', request.url))
  }
}
