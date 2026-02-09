import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { createServerClient } from "@/lib/supabase/server"
import { createAdminSupabaseClient } from "@/lib/supabase/admin"
import { createPreference } from "@/lib/mercadopago/client"

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const { user } = await getCurrentUser()
    
    // CRÍTICO: Rate limiting
    const { checkRateLimit } = await import("@/lib/rate-limit")
    const rateLimitCheck = checkRateLimit('/api/billing/checkout', user.id)
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
            'X-RateLimit-Limit': '5',
            'X-RateLimit-Remaining': String(rateLimitCheck.remaining),
            'X-RateLimit-Reset': String(rateLimitCheck.resetAt)
          }
        }
      )
    }
    
    const supabase = await createServerClient()
    const supabaseAdmin = createAdminSupabaseClient()
    const body = await request.json()
    const { planId, isUpgradeDuringTrial } = body

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

    // Plan ENTERPRISE no se checkout-ea (contacto manual)
    if (plan.name === 'ENTERPRISE' || plan.price_monthly === 0) {
      const whatsappNumber = '5493417417442'
      const whatsappMessage = encodeURIComponent('Hola! Quiero el plan Enterprise de Vibook.')
      const contactUrl = `https://wa.me/${whatsappNumber}?text=${whatsappMessage}`
      return NextResponse.json(
        { error: "El plan Enterprise requiere contacto con el equipo comercial.", contactUrl },
        { status: 400 }
      )
    }

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

    // Obtener información de la agencia para verificar si ya usó trial
    const { data: agencyData } = await supabase
      .from("agencies")
      .select("has_used_trial")
      .eq("id", agencyId)
      .single()

    // CRÍTICO: Verificar a nivel de usuario (no solo agencia) para prevenir múltiples trials
    const { data: userData } = await supabase
      .from("users")
      .select("has_used_trial")
      .eq("id", user.id)
      .single()

    // Obtener configuración de días de trial
    const { data: trialConfig } = await supabase
      .from("system_config")
      .select("value")
      .eq("key", "trial_days")
      .single()

    const trialDays = trialConfig ? parseInt(trialConfig.value) : 7 // Default 7 días

    // Verificar si ya tiene una suscripción activa
    const { data: existingSubscription } = await supabase
      .from("subscriptions")
      .select("id, status, trial_end, plan_id")
      .eq("agency_id", agencyId)
      .maybeSingle()

    // URGENTE: Si ya usó trial (a nivel de usuario o agencia), NO permitir otro trial - solo pago inmediato
    const hasUsedTrial = (userData?.has_used_trial || false) || (agencyData?.has_used_trial || false)
    
    // Si está haciendo upgrade durante trial, debe perder días y pagar inmediatamente
    const isUpgrade = isUpgradeDuringTrial && existingSubscription?.status === 'TRIAL'
    
    if (hasUsedTrial && !isUpgrade) {
      // Si ya usó trial y NO es upgrade, debe pagar inmediatamente (sin trial)
      return NextResponse.json(
        { 
          error: "Ya utilizaste tu período de prueba gratuito. Por favor, elegí un plan para continuar.",
          requiresImmediatePayment: true
        },
        { status: 400 }
      )
    }

    // Si es upgrade durante trial, mostrar advertencia
    if (isUpgrade) {
      const trialEndDate = existingSubscription?.trial_end ? new Date(existingSubscription.trial_end) : null
      const daysRemaining = trialEndDate ? Math.ceil((trialEndDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0
      
      return NextResponse.json({
        warning: `⚠️ Al actualizar perderás los ${daysRemaining} días restantes de tu prueba gratuita y se te cobrará inmediatamente.`,
        requiresConfirmation: true,
        proceedUrl: `/api/billing/checkout-immediate?planId=${planId}`
      })
    }

    // Crear Preapproval dinámicamente usando la API de Mercado Pago
    // Esto evita problemas de autorización de dominio
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.vibook.ai'
    const backUrl = new URL('/api/billing/preapproval-callback', appUrl)
    backUrl.searchParams.set('agency_id', agencyId)
    backUrl.searchParams.set('plan_id', planId)
    backUrl.searchParams.set('source', 'checkout')
    const { createPreApproval } = await import('@/lib/mercadopago/client')
    
    // Si ya usó trial o es upgrade durante trial, cobrar inmediatamente (sin trial)
    // Si no, crear trial usando configuración
    let startDate: Date
    if (hasUsedTrial || isUpgrade) {
      // Pago inmediato - comenzar hoy
      startDate = new Date()
      startDate.setDate(startDate.getDate() + 1) // Mañana para dar tiempo al procesamiento
    } else {
      // Trial - comenzar después de trialDays días
      startDate = new Date()
      startDate.setDate(startDate.getDate() + trialDays)
    }
    
    // Crear Preapproval
    const preapproval = await createPreApproval({
      reason: `Suscripción ${plan.display_name} - Vibook Gestión`,
      auto_recurring: {
        frequency: 30, // Mensual
        frequency_type: 'days',
        transaction_amount: plan.price_monthly,
        currency_id: 'ARS',
        start_date: startDate.toISOString()
      },
      payer_email: user.email,
      external_reference: JSON.stringify({
        agency_id: agencyId,
        plan_id: planId,
        user_id: user.id,
        is_upgrade: isUpgrade || false,
        has_used_trial: hasUsedTrial
      }),
      back_url: backUrl.toString()
    })

    // Guardar preapproval_id en la suscripción (si existe) o crear una nueva
    if (existingSubscription) {
      const existingStatus = (existingSubscription as any).status as string | undefined
      const keepStatus = existingStatus === 'TRIAL' || existingStatus === 'ACTIVE'
      const { error: updateError } = await (supabaseAdmin
        .from("subscriptions") as any)
        .update({
          mp_preapproval_id: preapproval.id,
          mp_status: preapproval.status,
          // IMPORTANTE: no activar trial acá. Esperar confirmación MP (callback/webhook).
          // Mantener en UNPAID hasta que MP confirme, salvo que ya esté ACTIVE/TRIAL.
          status: keepStatus ? existingStatus : 'UNPAID',
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
    } else {
      // Crear suscripción inicial en estado bloqueado.
      // Regla: NUNCA habilitar acceso desde checkout sin confirmación MP.
      const { error: insertError } = await (supabaseAdmin
        .from("subscriptions") as any)
        .insert({
          agency_id: agencyId,
          plan_id: planId,
          mp_preapproval_id: preapproval.id,
          mp_status: preapproval.status,
          status: 'UNPAID',
          current_period_start: new Date().toISOString(),
          current_period_end: startDate.toISOString(),
          // Guardamos las fechas de trial, pero NO activamos hasta callback confirmado.
          trial_start: hasUsedTrial || isUpgrade ? null : new Date().toISOString(),
          trial_end: hasUsedTrial || isUpgrade ? null : startDate.toISOString(),
          billing_cycle: 'MONTHLY'
        })

      if (insertError) {
        console.error("Error creating subscription:", insertError)
        return NextResponse.json(
          { error: "Error al crear suscripción. Intenta nuevamente." },
          { status: 500 }
        )
      }
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
