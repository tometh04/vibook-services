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
      return NextResponse.redirect(new URL('/pricing?error=no_preapproval_id', request.url))
    }

    // Obtener información del preapproval de Mercado Pago
    let preapproval: any
    try {
      const preapprovalResponse = await getPreApproval(preapprovalId)
      preapproval = preapprovalResponse as any
    } catch (error: any) {
      console.error('Error obteniendo preapproval:', error)
      return NextResponse.redirect(new URL('/pricing?error=preapproval_not_found', request.url))
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
      return NextResponse.redirect(new URL('/pricing?error=no_agency', request.url))
    }

    // Determinar el plan: usar planId del external_reference si está disponible,
    // sino determinar por el monto del preapproval (fallback)
    if (!planId) {
      const amount = preapproval.auto_recurring?.transaction_amount
      let planName = 'STARTER' // Default
      
      // Precios actualizados: Starter $79k, Pro $129k, Business $399k
      if (amount === 79000) {
        planName = 'STARTER'
      } else if (amount === 129000) {
        planName = 'PRO'
      } else if (amount === 399000) {
        planName = 'BUSINESS'
      } else {
        // Fallback para precios antiguos (por compatibilidad)
        if (amount === 15000) {
          planName = 'STARTER'
        } else if (amount === 50000) {
          planName = 'PRO'
        }
      }

      console.log('[Preapproval Callback] Determining plan by amount:', { amount, planName })

      // Obtener el plan de la base de datos
      const { data: planData, error: planError } = await (supabaseAdmin
        .from("subscription_plans") as any)
        .select("id")
        .eq("name", planName)
        .single()

      if (planError || !planData) {
        console.error('Error obteniendo plan:', planError)
        return NextResponse.redirect(new URL('/pricing?error=plan_not_found', request.url))
      }

      planId = (planData as any).id
    }

    // Mapear estado de Mercado Pago a nuestro estado base
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

    // Si es upgrade durante trial o ya usó trial, NO crear trial - pago inmediato
    if (isUpgrade || hasUsedTrial) {
      // Si MP no autorizó aún, mantener UNPAID (bloquea acceso)
      if (subscriptionStatus === 'ACTIVE') {
        subscriptionData.status = 'ACTIVE'
      } else if (subscriptionStatus === 'CANCELED') {
        subscriptionData.status = 'CANCELED'
      } else if (subscriptionStatus === 'SUSPENDED') {
        subscriptionData.status = 'SUSPENDED'
      } else {
        subscriptionData.status = 'UNPAID'
      }

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

      // Trial usando configuración
      if (subscriptionStatus === 'CANCELED') {
        subscriptionData.status = 'CANCELED'
      } else if (subscriptionStatus === 'SUSPENDED') {
        subscriptionData.status = 'SUSPENDED'
      } else {
        subscriptionData.status = 'TRIAL'
      }
      subscriptionData.trial_start = new Date().toISOString()
      subscriptionData.trial_end = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000).toISOString()
      
      // IMPORTANTE: Marcar que la agencia ya usó el trial
      await (supabaseAdmin
        .from("agencies") as any)
        .update({ has_used_trial: true })
        .eq("id", agencyId)
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
        status: subscriptionStatus,
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
        status: subscriptionStatus,
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
            subscription_status: subscriptionStatus
          }
        })
    }
    
    console.log('[Preapproval Callback] Evento registrado:', {
      agencyId,
      subscriptionId,
      preapprovalId,
      status: subscriptionStatus
    })

    // Redirigir al dashboard en lugar de billing (el usuario ya pagó, debe tener acceso)
    // Si el usuario no está autenticado, redirigir a login primero
    try {
      const { user } = await getCurrentUser()
      // Usuario autenticado, redirigir al dashboard
      return NextResponse.redirect(new URL(`/dashboard?payment_success=true&preapproval_id=${preapprovalId}`, request.url))
    } catch {
      // Usuario no autenticado, redirigir a login con mensaje
      return NextResponse.redirect(new URL(`/login?payment_success=true&preapproval_id=${preapprovalId}`, request.url))
    }
  } catch (error: any) {
    console.error('Error en preapproval callback:', error)
    return NextResponse.redirect(new URL('/pricing?error=callback_error', request.url))
  }
}
