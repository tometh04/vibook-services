import { NextResponse } from "next/server"
import { getPreApproval } from "@/lib/mercadopago/client"
import { createClient, SupabaseClient } from "@supabase/supabase-js"
import crypto from "crypto"

// Lazy initialization para evitar errores durante el build
let supabaseAdmin: SupabaseClient | null = null

function getSupabaseAdmin(): SupabaseClient {
  if (!supabaseAdmin) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase environment variables")
    }
    
    supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
  }
  return supabaseAdmin
}

// Webhook secret de Mercado Pago (opcional pero recomendado)
const WEBHOOK_SECRET = process.env.MERCADOPAGO_WEBHOOK_SECRET || ''

export const runtime = 'nodejs'

/**
 * Verificar firma del webhook de Mercado Pago
 * Mercado Pago envía un header x-signature con ts y v1
 * El manifest se arma como: id:{data.id};request-id:{x-request-id};ts:{ts};
 *
 * SEGURIDAD: En producción, SIEMPRE debe haber un secret configurado
 */
function verifyWebhookSignature(params: {
  signatureHeader: string | null
  requestId: string | null
  dataId: string | null
  secret: string
}): boolean {
  const { signatureHeader, requestId, dataId, secret } = params

  if (!secret) {
    const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production'

    if (isProduction) {
      console.error('🚨 CRÍTICO: Webhook secret NO configurado en producción')
      return false
    }

    console.warn('⚠️ Webhook secret no configurado - solo válido en desarrollo')
    return true
  }

  if (!signatureHeader || !requestId || !dataId) {
    console.error('Webhook signature incompleta', {
      hasSignature: !!signatureHeader,
      hasRequestId: !!requestId,
      hasDataId: !!dataId,
    })
    return false
  }

  const parts = signatureHeader.split(',').reduce<Record<string, string>>((acc, item) => {
    const [key, value] = item.trim().split('=')
    if (key && value) {
      acc[key] = value
    }
    return acc
  }, {})

  const ts = parts.ts
  const v1 = parts.v1

  if (!ts || !v1) {
    console.error('Webhook signature header inválido:', signatureHeader)
    return false
  }

  try {
    const normalizedId = dataId.toLowerCase()
    const manifest = `id:${normalizedId};request-id:${requestId};ts:${ts};`
    const hash = crypto.createHmac('sha256', secret).update(manifest).digest('hex')
    return hash === v1 || `sha256=${hash}` === v1
  } catch (error) {
    console.error('Error verifying webhook signature:', error)
    return false
  }
}

// POST - Webhooks de Mercado Pago (recomendado)
// Mercado Pago envía POST con body JSON y header x-signature
export async function POST(request: Request) {
  try {
    const requestUrl = new URL(request.url)
    const dataIdFromQuery = requestUrl.searchParams.get('data.id')

    // Leer el body como texto para validar firma
    const bodyText = await request.text()
    
    // Obtener todos los headers para debug
    const headers: Record<string, string> = {}
    request.headers.forEach((value, key) => {
      headers[key] = value
    })
    console.log('📥 Webhook headers recibidos:', Object.keys(headers))
    
    // SEGURIDAD: Validación obligatoria de firma en producción
    const signature = request.headers.get('x-signature') || request.headers.get('X-Signature')
    const requestId = request.headers.get('x-request-id') || request.headers.get('X-Request-Id')
    const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production'

    // Validar firma
    console.log('🔐 Validando firma del webhook...')
    const isValid = verifyWebhookSignature({
      signatureHeader: signature,
      requestId,
      dataId: dataIdFromQuery,
      secret: WEBHOOK_SECRET,
    })

    if (!isValid) {
      if (isProduction) {
        // En producción: RECHAZAR webhooks sin firma válida
        console.error('🚨 RECHAZADO: Webhook con firma inválida o sin firma en producción')
        console.error('Signature recibida:', signature ? signature.substring(0, 20) + '...' : 'NINGUNA')
        console.error('Request ID:', requestId || 'NINGUNO')
        console.error('Data ID:', dataIdFromQuery || 'NINGUNO')
        console.error('Body length:', bodyText.length)
        return NextResponse.json(
          { error: "Invalid webhook signature" },
          { status: 401 }
        )
      } else {
        // En desarrollo: Permitir pero advertir
        console.warn('⚠️ Webhook signature inválida (permitiendo en desarrollo)')
        console.warn('Signature recibida:', signature ? signature.substring(0, 20) + '...' : 'NINGUNA')
        console.warn('Request ID:', requestId || 'NINGUNO')
        console.warn('Data ID:', dataIdFromQuery || 'NINGUNO')
        console.warn('Body length:', bodyText.length)
      }
    } else {
      console.log('✅ Webhook signature válida')
    }

    // Parsear body como JSON
    let body: any
    try {
      body = JSON.parse(bodyText)
    } catch (parseError) {
      console.error('Error parsing webhook body:', parseError)
      return NextResponse.json(
        { error: "Invalid JSON" },
        { status: 400 }
      )
    }

    const { type, data } = body

    console.log('📥 Webhook recibido de Mercado Pago:', { type, data })

    // Mercado Pago puede enviar diferentes tipos de notificaciones
    if (type === 'payment') {
      await handlePaymentNotification(data.id).catch((err: any) => {
        console.error('Error procesando payment notification:', err)
      })
    } else if (type === 'preapproval') {
      await handlePreApprovalNotification(data.id).catch((err: any) => {
        console.error('Error procesando preapproval notification:', err)
      })
    } else {
      console.log(`⚠️ Tipo de notificación no manejado: ${type}`)
    }

    // Siempre retornar 200 para evitar reenvíos
    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error("Error processing Mercado Pago webhook:", error)
    // Siempre retornar 200 para evitar reenvíos infinitos
    return NextResponse.json({ received: true, error: error.message })
  }
}

// GET - IPN de Mercado Pago (legacy, mantenido por compatibilidad)
// Mercado Pago también usa GET para verificar la URL y para IPN legacy
// SEGURIDAD: En producción, el GET legacy está deshabilitado si hay webhook secret configurado
// ya que todas las notificaciones deberían llegar por POST con firma.
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const topic = searchParams.get('topic') // 'payment' o 'preapproval'
    const id = searchParams.get('id') // ID del payment o preapproval

    // Si es una prueba de Mercado Pago (sin parámetros), solo retornar éxito
    if (!topic || !id) {
      console.log('✅ Prueba de webhook recibida (sin parámetros)')
      return NextResponse.json({ received: true, message: 'Webhook configurado correctamente' })
    }

    // SEGURIDAD: En producción, si tenemos webhook secret, rechazar GET requests
    // Las notificaciones reales de MP deberían llegar como POST con firma HMAC
    const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production'
    if (isProduction && WEBHOOK_SECRET) {
      console.warn('🚨 GET webhook rechazado en producción (usar POST con firma):', { topic, id })
      return NextResponse.json(
        { error: "Legacy IPN deshabilitado en producción. Usar webhook POST con firma." },
        { status: 403 }
      )
    }

    console.log('📥 GET webhook de Mercado Pago (IPN legacy):', { topic, id })

    // Si es un ID de prueba (123456), solo retornar éxito sin procesar
    // Mercado Pago usa este ID para verificar que la URL funciona
    if (id === '123456') {
      console.log('✅ Prueba de webhook recibida (ID de prueba)')
      return NextResponse.json({ received: true, message: 'Webhook configurado correctamente' })
    }

    // Validar formato del ID (solo alfanumérico y guiones, prevenir inyección)
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
      console.warn('⚠️ ID con formato inválido rechazado:', id)
      return NextResponse.json({ error: "Invalid ID format" }, { status: 400 })
    }

    // Procesar notificaciones reales (solo en desarrollo)
    if (topic === 'payment') {
      await handlePaymentNotification(id).catch((err: any) => {
        console.error('Error procesando payment notification:', err)
      })
    } else if (topic === 'preapproval') {
      await handlePreApprovalNotification(id).catch((err: any) => {
        console.error('Error procesando preapproval notification:', err)
      })
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error("Error processing Mercado Pago webhook (GET):", error)
    // Siempre retornar 200 para evitar reenvíos
    return NextResponse.json({ received: true, error: error.message })
  }
}

async function handlePaymentNotification(paymentId: string) {
  console.log('💳 Procesando notificación de pago:', paymentId)

  try {
    // Aquí deberías obtener el pago de Mercado Pago para ver el external_reference
    // Por simplicidad, lo registramos como evento
    const admin = getSupabaseAdmin()
    const { data: existing } = await (admin
      .from("billing_events") as any)
      .select("id")
      .eq("event_type", "PAYMENT_SUCCEEDED")
      .eq("mp_payment_id", paymentId)
      .maybeSingle()

    if (existing) {
      return
    }

    const { error } = await (admin
      .from("billing_events") as any)
      .insert({
        event_type: "PAYMENT_SUCCEEDED",
        mp_payment_id: paymentId,
        metadata: { type: 'payment' }
      })

    if (error) {
      console.error('Error insertando billing_event:', error)
      // No lanzar error, solo loggear
    }
  } catch (err: any) {
    console.error('Error en handlePaymentNotification:', err)
    // No lanzar error, solo loggear
  }
}

async function handlePreApprovalNotification(preapprovalId: string) {
  console.log('🔄 Procesando notificación de preapproval:', preapprovalId)

  try {
    // Obtener información del preapproval de Mercado Pago
    // Si el preapproval no existe (como en pruebas), manejar el error
    let preapproval: any
    try {
      const preapprovalResponse = await getPreApproval(preapprovalId)
      // @ts-ignore - El tipo de respuesta de Mercado Pago puede variar
      preapproval = preapprovalResponse as any
    } catch (mpError: any) {
      console.log('⚠️ Preapproval no encontrado en Mercado Pago (puede ser prueba):', mpError.message)
      // Si no existe, solo registrar el evento sin datos del preapproval
      const admin = getSupabaseAdmin()
      const { data: existing } = await (admin
        .from("billing_events") as any)
        .select("id")
        .eq("event_type", "PREAPPROVAL_NOT_FOUND")
        .eq("mp_notification_id", preapprovalId)
        .maybeSingle()

      if (!existing) {
        await (admin
          .from("billing_events") as any)
          .insert({
            event_type: "PREAPPROVAL_NOT_FOUND",
            mp_notification_id: preapprovalId,
            metadata: { error: mpError.message, type: 'preapproval' }
          }).catch((err: any) => {
            console.error('Error insertando evento:', err)
          })
      }
      return // Salir sin error
    }

    // Buscar la suscripción por preapproval_id
    const { data: subscription, error } = await (getSupabaseAdmin()
      .from("subscriptions") as any)
      .select("id, agency_id, status, trial_end")
      .eq("mp_preapproval_id", preapprovalId)
      .maybeSingle()

    if (error) {
      console.error("Error buscando suscripción:", error)
      return
    }

    // Mapear estados de Mercado Pago a nuestros estados
    const mpStatus = (preapproval.status as string) || ''
    type SubscriptionStatus = 'TRIAL' | 'ACTIVE' | 'CANCELED' | 'PAST_DUE' | 'UNPAID' | 'SUSPENDED'
    let status: SubscriptionStatus = 'ACTIVE' // Inicializar con valor por defecto
    
    if (mpStatus === 'cancelled' || mpStatus === 'canceled') {
      status = 'CANCELED'
    } else if (mpStatus === 'paused') {
      status = 'SUSPENDED'
    } else if (mpStatus === 'authorized') {
      // Si tiene trial vigente (aunque aún esté UNPAID), activar TRIAL
      const trialEndRaw = (subscription as any)?.trial_end as string | null | undefined
      const trialEndDate = trialEndRaw ? new Date(trialEndRaw) : null
      const hasTrial = !!trialEndDate && trialEndDate >= new Date()
      status = hasTrial ? 'TRIAL' : 'ACTIVE'
      // Resetear intentos de pago cuando hay pago exitoso
      if (subscription) {
        const subData = subscription as any
        try {
          const { error: resetError } = await getSupabaseAdmin().rpc('reset_payment_attempts', {
            subscription_id_param: subData.id
          })
          if (resetError) {
            console.error('Error reseteando payment attempts:', resetError)
          }
        } catch (err: any) {
          console.error('Error reseteando payment attempts:', err)
        }
      }
    } else if (mpStatus === 'pending') {
      const currentStatus = (subscription as any)?.status as SubscriptionStatus | undefined
      status = currentStatus === 'TRIAL' ? 'TRIAL' : 'UNPAID'
    } else if (mpStatus === 'rejected' || mpStatus === 'failed') {
      // Si el pago fue rechazado o falló, incrementar intentos
      // La función increment_payment_attempt manejará el cambio a PAST_DUE después de 3 intentos
      if (subscription) {
        const subData = subscription as any
        try {
          const { error: incrementError } = await getSupabaseAdmin().rpc('increment_payment_attempt', {
            subscription_id_param: subData.id
          })
          if (incrementError) {
            console.error('Error incrementando payment attempts:', incrementError)
          }
        } catch (err: any) {
          console.error('Error incrementando payment attempts:', err)
        }
      }
      // El status se determinará después según los intentos
      status = 'PAST_DUE' // Temporal, puede cambiar según intentos
    }
    // Si no coincide con ninguno, mantener 'ACTIVE' (ya inicializado)

    const updateData: any = {
      mp_status: mpStatus,
      status: status,
      mp_payer_id: preapproval.payer_id?.toString() || preapproval.payer_id,
      updated_at: new Date().toISOString()
    }

    // Actualizar fechas del período de facturación
    // IMPORTANTE: next_payment_date es la fecha del próximo cobro (= fin del período actual)
    // auto_recurring.start_date/end_date son las fechas de la suscripción completa, NO del período
    if (preapproval.next_payment_date) {
      // next_payment_date marca el fin del período actual y start del próximo
      updateData.current_period_end = new Date(preapproval.next_payment_date).toISOString()
      // El inicio del período actual es ahora (o la fecha del último cobro)
      if (preapproval.date_created) {
        // Si es la primera vez, usar date_created; sino, el período empieza "ahora"
        const lastPaymentDate = preapproval.last_modified || preapproval.date_created
        updateData.current_period_start = new Date(lastPaymentDate).toISOString()
      }
    } else {
      // Fallback: calcular próximo período basado en frequency (30 días por defecto)
      const frequency = preapproval.auto_recurring?.frequency || 30
      updateData.current_period_end = new Date(Date.now() + frequency * 24 * 60 * 60 * 1000).toISOString()
    }

    console.log('[Webhook] Fechas calculadas:', {
      next_payment_date: preapproval.next_payment_date,
      current_period_start: updateData.current_period_start,
      current_period_end: updateData.current_period_end,
      auto_recurring_start: preapproval.auto_recurring?.start_date,
      auto_recurring_end: preapproval.auto_recurring?.end_date,
    })

    if (subscription) {
      const subData = subscription as any
      
      // Actualizar suscripción existente
      const { error: updateError } = await (getSupabaseAdmin()
        .from("subscriptions") as any)
        .update(updateData)
        .eq("id", subData.id)

      if (updateError) {
        console.error('Error actualizando suscripción:', updateError)
      }

      // Si se activó TRIAL, marcar has_used_trial
      if (status === 'TRIAL') {
        try {
          const { error: trialError } = await (getSupabaseAdmin()
            .from("agencies") as any)
            .update({ has_used_trial: true })
            .eq("id", subData.agency_id)
          if (trialError) {
            console.error('Error marcando has_used_trial:', trialError)
          }
        } catch (err: any) {
          console.error('Error marcando has_used_trial:', err)
        }
      }

      // Registrar evento según el estado
      // Usar switch con type assertion para evitar problemas de narrowing
      const statusForSwitch = status as SubscriptionStatus
      let eventType = 'SUBSCRIPTION_UPDATED'
      switch (statusForSwitch) {
        case 'CANCELED':
          eventType = 'SUBSCRIPTION_CANCELED'
          break
        case 'PAST_DUE':
        case 'UNPAID':
          eventType = 'PAYMENT_FAILED'
          break
        case 'SUSPENDED':
          eventType = 'SUBSCRIPTION_SUSPENDED'
          break
        default:
          eventType = 'SUBSCRIPTION_UPDATED'
      }

      const admin = getSupabaseAdmin()
      const { data: existing } = await (admin
        .from("billing_events") as any)
        .select("id")
        .eq("event_type", eventType)
        .eq("mp_notification_id", preapprovalId)
        .maybeSingle()

      if (!existing) {
        await (admin
          .from("billing_events") as any)
          .insert({
            agency_id: subData.agency_id,
            subscription_id: subData.id,
            event_type: eventType,
            mp_notification_id: preapprovalId,
            metadata: { status: mpStatus, mp_data: preapproval }
          }).catch((err: any) => {
            console.error('Error insertando billing_event:', err)
          })
      }
    } else {
      // Si no existe, registrar el evento
      console.log('⚠️ Suscripción no encontrada para preapproval:', preapprovalId)
      
      const admin = getSupabaseAdmin()
      const { data: existing } = await (admin
        .from("billing_events") as any)
        .select("id")
        .eq("event_type", "SUBSCRIPTION_CREATED")
        .eq("mp_notification_id", preapprovalId)
        .maybeSingle()

      if (!existing) {
        await (admin
          .from("billing_events") as any)
          .insert({
            event_type: "SUBSCRIPTION_CREATED",
            mp_notification_id: preapprovalId,
            metadata: { status: mpStatus, mp_data: preapproval }
          }).catch((err: any) => {
            console.error('Error insertando billing_event:', err)
          })
      }
    }
  } catch (error: any) {
    console.error("Error procesando preapproval notification:", error)
    // No lanzar error, solo loggear - el webhook debe siempre retornar 200
  }
}
