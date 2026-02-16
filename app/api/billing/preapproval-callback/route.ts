import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/auth"
import { getPreApproval } from "@/lib/mercadopago/client"
import { createAdminSupabaseClient } from "@/lib/supabase/admin"

export const runtime = 'nodejs'

/**
 * Callback para cuando el usuario completa una suscripción usando Preapproval Plan
 * Este endpoint se llama desde el botón de Mercado Pago después de que el usuario
 * completa el proceso de suscripción
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const preapprovalIdParam =
      searchParams.get('preapproval_id') ||
      searchParams.get('preapprovalId') ||
      searchParams.get('id')
    const status = searchParams.get('status') || searchParams.get('collection_status')
    const agencyIdParam = searchParams.get('agency_id') || searchParams.get('agencyId')
    const planIdParam = searchParams.get('plan_id') || searchParams.get('planId')

    const supabase = await createServerClient()
    const supabaseAdmin = createAdminSupabaseClient()

    let preapprovalId: string | null = preapprovalIdParam
    let agencyId: string | null = agencyIdParam
    let planId: string | null = planIdParam
    let userId: string | null = null

    console.log('[Preapproval Callback] Incoming params:', {
      preapprovalId: preapprovalIdParam,
      status,
      agencyId: agencyIdParam,
      planId: planIdParam
    })

    // Fallback: si no viene preapproval_id, intentar recuperar por agency_id
    if (!preapprovalId && agencyId) {
      const { data: fallbackSub } = await (supabaseAdmin
        .from("subscriptions") as any)
        .select("id, agency_id, plan_id, mp_preapproval_id, created_at")
        .eq("agency_id", agencyId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (fallbackSub?.mp_preapproval_id) {
        preapprovalId = fallbackSub.mp_preapproval_id
        planId = planId || fallbackSub.plan_id
        agencyId = agencyId || fallbackSub.agency_id
      }
    }

    if (!preapprovalId) {
      return NextResponse.redirect(new URL('/paywall?error=no_preapproval_id', request.url))
    }

    // Obtener información del preapproval de Mercado Pago
    let preapproval: any
    try {
      const preapprovalResponse = await getPreApproval(preapprovalId)
      preapproval = preapprovalResponse as any
    } catch (error: any) {
      console.error('Error obteniendo preapproval:', error)
      return NextResponse.redirect(new URL('/paywall?error=preapproval_not_found', request.url))
    }

    // IMPORTANTE: Usar external_reference del preapproval para obtener agency_id
    // Esto es más confiable que depender de la sesión del usuario

    // Intentar obtener datos del external_reference
    if (preapproval.external_reference) {
      try {
        const externalRef = JSON.parse(preapproval.external_reference)
        agencyId = externalRef.agency_id
        planId = externalRef.plan_id
        userId = externalRef.user_id
      } catch (e) {
        console.error('Error parseando external_reference:', e)
      }
    }

    // Si no se pudo obtener del external_reference, buscar en la base de datos
    if (!agencyId) {
      const { data: existingSubscription } = await (supabaseAdmin
        .from("subscriptions") as any)
        .select("agency_id, plan_id")
        .eq("mp_preapproval_id", preapprovalId)
        .maybeSingle()

      if (existingSubscription) {
        agencyId = (existingSubscription as any).agency_id
        planId = (existingSubscription as any).plan_id
      }
    }

    // Si aún no tenemos agencyId, intentar obtener del usuario actual (fallback)
    if (!agencyId) {
      try {
        const { user } = await getCurrentUser()
        const { data: userAgencies, error: userAgenciesError } = await supabase
          .from("user_agencies")
          .select("agency_id")
          .eq("user_id", user.id)
          .limit(1)
          .maybeSingle()

        if (!userAgenciesError && userAgencies) {
          agencyId = (userAgencies as any).agency_id
          userId = user.id
        }
      } catch (error) {
        console.error('Error obteniendo usuario actual:', error)
      }
    }

    if (!agencyId) {
      console.error('No se pudo determinar agency_id para preapproval:', preapprovalId)
      return NextResponse.redirect(new URL('/paywall?error=no_agency', request.url))
    }

    // Determinar el plan: usar planId del external_reference si está disponible,
    // sino determinar por el monto del preapproval buscando en la DB
    if (!planId) {
      const amount = preapproval.auto_recurring?.transaction_amount
      console.log('[Preapproval Callback] Determining plan by amount from DB:', { amount })

      // Buscar el plan que coincida con el precio mensual en la DB
      let planData: any = null
      let planError: any = null

      if (amount) {
        // Buscar plan cuyo price_monthly coincida exactamente con el monto
        const result = await (supabaseAdmin
          .from("subscription_plans") as any)
          .select("id, name, price_monthly")
          .eq("price_monthly", amount)
          .neq("name", "FREE")
          .neq("name", "TESTER")
          .limit(1)
          .maybeSingle()

        planData = result.data
        planError = result.error
      }

      // Si no se encontró por precio exacto, usar STARTER como fallback
      if (!planData) {
        console.warn('[Preapproval Callback] No plan found for amount:', amount, '- falling back to STARTER')
        const fallback = await (supabaseAdmin
          .from("subscription_plans") as any)
          .select("id, name")
          .eq("name", "STARTER")
          .single()

        planData = fallback.data
        planError = fallback.error
      }

      if (planError || !planData) {
        console.error('Error obteniendo plan:', planError)
        return NextResponse.redirect(new URL('/paywall?error=plan_not_found', request.url))
      }

      console.log('[Preapproval Callback] Matched plan:', { id: planData.id, name: planData.name, price: planData.price_monthly })
      planId = (planData as any).id
    }

    // Mapear estado de Mercado Pago a nuestro estado base (NO activar acceso aquí)
    const mpStatus = preapproval.status as string
    type SubscriptionStatus = 'TRIAL' | 'ACTIVE' | 'CANCELED' | 'PAST_DUE' | 'UNPAID' | 'SUSPENDED'
    let subscriptionStatus: SubscriptionStatus = 'UNPAID'
    
    if (mpStatus === 'cancelled') {
      subscriptionStatus = 'CANCELED'
    } else if (mpStatus === 'paused') {
      subscriptionStatus = 'SUSPENDED'
    } else if (mpStatus === 'authorized') {
      // Autorizado por MP, pero la activación real se hace vía webhook
      subscriptionStatus = 'UNPAID'
    } else if (mpStatus === 'pending') {
      subscriptionStatus = 'UNPAID'
    }

    // Verificar si ya existe una suscripción
    const { data: existingSubscription } = await (supabaseAdmin
      .from("subscriptions") as any)
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

    // Actualizar fechas del período de facturación
    // IMPORTANTE: next_payment_date es la fecha del próximo cobro (= fin del período actual)
    // auto_recurring.start_date/end_date son las fechas de la suscripción completa, NO del período
    subscriptionData.current_period_start = new Date().toISOString()

    if (preapproval.next_payment_date) {
      subscriptionData.current_period_end = new Date(preapproval.next_payment_date).toISOString()
    } else {
      // Fallback: calcular próximo período basado en frequency (30 días por defecto)
      const frequency = preapproval.auto_recurring?.frequency || 30
      subscriptionData.current_period_end = new Date(Date.now() + frequency * 24 * 60 * 60 * 1000).toISOString()
    }

    console.log('[Preapproval Callback] Fechas calculadas:', {
      next_payment_date: preapproval.next_payment_date,
      current_period_start: subscriptionData.current_period_start,
      current_period_end: subscriptionData.current_period_end,
    })

    // Verificar si es upgrade durante trial o si ya usó trial
    let isUpgrade = false
    let hasUsedTrial = false
    
    if (preapproval.external_reference) {
      try {
        const externalRef = JSON.parse(preapproval.external_reference)
        isUpgrade = externalRef.is_upgrade || false
        hasUsedTrial = externalRef.has_used_trial || false
      } catch (e) {
        console.error('Error parseando external_reference:', e)
      }
    }

    // Obtener información de la agencia
    const { data: agencyData } = await (supabaseAdmin
      .from("agencies") as any)
      .select("has_used_trial")
      .eq("id", agencyId)
      .single()

    hasUsedTrial = hasUsedTrial || agencyData?.has_used_trial || false

    // Definir status final (webhook es la fuente de activación)
    const existingStatus = (existingSubscription as any)?.status as SubscriptionStatus | undefined
    const shouldKeepStatus = existingStatus === 'ACTIVE' || existingStatus === 'TRIAL'
    const finalStatus = shouldKeepStatus
      ? existingStatus!
      : (subscriptionStatus === 'CANCELED' || subscriptionStatus === 'SUSPENDED' ? subscriptionStatus : 'UNPAID')

    subscriptionData.status = finalStatus

    // Configurar trial (sin activarlo)
    if (isUpgrade || hasUsedTrial) {
      subscriptionData.trial_start = null
      subscriptionData.trial_end = null
      // Calcular período desde ahora (30 días)
      subscriptionData.current_period_start = new Date().toISOString()
      subscriptionData.current_period_end = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    } else {
      // Obtener configuración de días de trial
      const { data: trialConfig } = await (supabaseAdmin
        .from("system_config") as any)
        .select("value")
        .eq("key", "trial_days")
        .single()

      const trialDays = trialConfig ? parseInt(trialConfig.value) : 7 // Default 7 días

      // Mantener trial preparado para cuando el webhook confirme
      const existingTrialStart = (existingSubscription as any)?.trial_start as string | null | undefined
      const existingTrialEnd = (existingSubscription as any)?.trial_end as string | null | undefined
      subscriptionData.trial_start = existingTrialStart || new Date().toISOString()
      subscriptionData.trial_end = existingTrialEnd || new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000).toISOString()
    }

    let subscriptionResult: any
    if (existingSubscription) {
      // Actualizar suscripción existente
      const existingSubData = existingSubscription as any
      const { data, error } = await (supabaseAdmin
        .from("subscriptions") as any)
        .update(subscriptionData)
        .eq("id", existingSubData.id)
        .select()
        .single()
      
      if (error) {
        console.error('[Preapproval Callback] Error actualizando suscripción:', error)
        throw error
      }
      
      subscriptionResult = data
      console.log('[Preapproval Callback] Suscripción actualizada:', {
        subscriptionId: existingSubData.id,
        agencyId,
        planId,
        status: finalStatus,
        mp_preapproval_id: preapprovalId
      })
    } else {
      // Crear nueva suscripción
      subscriptionData.created_at = new Date().toISOString()
      const { data, error } = await (supabaseAdmin
        .from("subscriptions") as any)
        .insert(subscriptionData)
        .select()
        .single()
      
      if (error) {
        console.error('[Preapproval Callback] Error creando suscripción:', error)
        throw error
      }
      
      subscriptionResult = data
      console.log('[Preapproval Callback] Suscripción creada:', {
        subscriptionId: subscriptionResult.id,
        agencyId,
        planId,
        status: finalStatus,
        mp_preapproval_id: preapprovalId
      })
    }

    // Registrar evento usando el resultado de la inserción/actualización
    const subscriptionId = subscriptionResult?.id || (existingSubscription as any)?.id
    
    const { data: existingEvent } = await (supabaseAdmin
      .from("billing_events") as any)
      .select("id")
      .eq("event_type", "SUBSCRIPTION_CREATED")
      .eq("mp_notification_id", preapprovalId)
      .maybeSingle()

    if (!existingEvent) {
      await (supabaseAdmin
        .from("billing_events") as any)
        .insert({
          agency_id: agencyId,
          subscription_id: subscriptionId || null,
          event_type: 'SUBSCRIPTION_CREATED',
          mp_notification_id: preapprovalId,
          metadata: { 
            status: mpStatus, 
            mp_data: preapproval,
            user_id: userId,
            plan_id: planId,
            subscription_status: finalStatus
          }
        })
    }
    
    console.log('[Preapproval Callback] Evento registrado:', {
      agencyId,
      subscriptionId,
      preapprovalId,
      status: finalStatus
    })

    // Redirigir al paywall mientras se espera confirmación por webhook
    // Si el usuario no está autenticado, redirigir a login primero
    try {
      const { user } = await getCurrentUser()
      // Usuario autenticado, redirigir al paywall (se auto-redirect si ya está activo)
      return NextResponse.redirect(new URL(`/paywall?payment_pending=true&preapproval_id=${preapprovalId}`, request.url))
    } catch {
      // Usuario no autenticado, redirigir a login con mensaje
      return NextResponse.redirect(new URL(`/login?payment_pending=true&preapproval_id=${preapprovalId}`, request.url))
    }
  } catch (error: any) {
    console.error('Error en preapproval callback:', error)
    return NextResponse.redirect(new URL('/paywall?error=callback_error', request.url))
  }
}
