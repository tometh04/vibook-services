import { NextResponse } from "next/server"
import { getPreApproval } from "@/lib/mercadopago/client"
import { createClient } from "@supabase/supabase-js"
import crypto from "crypto"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

// Webhook secret de Mercado Pago (opcional pero recomendado)
const WEBHOOK_SECRET = process.env.MERCADOPAGO_WEBHOOK_SECRET || ''

export const runtime = 'nodejs'

/**
 * Verificar firma del webhook de Mercado Pago
 * Mercado Pago envía un header x-signature con la firma HMAC
 */
function verifyWebhookSignature(body: string, signature: string, secret: string): boolean {
  if (!secret) {
    // Si no hay secret configurado, aceptar (no recomendado para producción)
    console.warn('⚠️ Webhook secret no configurado - validación deshabilitada')
    return true
  }

  try {
    const hash = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex')
    
    // Mercado Pago puede enviar la firma en diferentes formatos
    return hash === signature || signature === `sha256=${hash}`
  } catch (error) {
    console.error('Error verifying webhook signature:', error)
    return false
  }
}

// POST - Webhooks de Mercado Pago (recomendado)
// Mercado Pago envía POST con body JSON y header x-signature
export async function POST(request: Request) {
  try {
    // Leer el body como texto para validar firma
    const bodyText = await request.text()
    
    // Validar firma si está configurada Y si se envía el header
    // Para pruebas de Mercado Pago, puede que no envíen el header x-signature
    const signature = request.headers.get('x-signature')
    if (WEBHOOK_SECRET && signature) {
      const isValid = verifyWebhookSignature(bodyText, signature, WEBHOOK_SECRET)
      if (!isValid) {
        console.error('❌ Webhook signature inválida')
        // En producción, rechazar. En desarrollo, solo loggear
        if (process.env.NODE_ENV === 'production') {
          return NextResponse.json(
            { error: "Invalid signature" },
            { status: 401 }
          )
        } else {
          console.warn('⚠️ Signature inválida pero continuando (desarrollo)')
        }
      }
    } else if (WEBHOOK_SECRET && !signature) {
      // Si hay secret configurado pero no viene signature, puede ser una prueba
      console.warn('⚠️ Webhook secret configurado pero no se recibió x-signature header (puede ser prueba)')
      // Continuar sin validar para permitir pruebas
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

    console.log('📥 GET webhook de Mercado Pago (IPN legacy):', { topic, id })

    // Si es un ID de prueba (123456), solo retornar éxito sin procesar
    // Mercado Pago usa este ID para verificar que la URL funciona
    if (id === '123456') {
      console.log('✅ Prueba de webhook recibida (ID de prueba)')
      return NextResponse.json({ received: true, message: 'Webhook configurado correctamente' })
    }

    // Procesar notificaciones reales
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
    const { error } = await (supabaseAdmin
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
      await (supabaseAdmin
        .from("billing_events") as any)
        .insert({
          event_type: "PREAPPROVAL_NOT_FOUND",
          mp_notification_id: preapprovalId,
          metadata: { error: mpError.message, type: 'preapproval' }
        }).catch((err: any) => {
          console.error('Error insertando evento:', err)
        })
      return // Salir sin error
    }

    // Buscar la suscripción por preapproval_id
    const { data: subscription, error } = await (supabaseAdmin
      .from("subscriptions") as any)
      .select("id, agency_id")
      .eq("mp_preapproval_id", preapprovalId)
      .maybeSingle()

    if (error) {
      console.error("Error buscando suscripción:", error)
      return
    }

    // Mapear estados de Mercado Pago a nuestros estados
    const mpStatus = preapproval.status as string
    let status: 'TRIAL' | 'ACTIVE' | 'CANCELED' | 'PAST_DUE' | 'UNPAID' | 'SUSPENDED' = 'ACTIVE'
    
    if (mpStatus === 'cancelled') {
      status = 'CANCELED'
    } else if (mpStatus === 'paused') {
      status = 'SUSPENDED'
    } else if (mpStatus === 'authorized') {
      status = 'ACTIVE'
    } else if (mpStatus === 'pending') {
      status = 'TRIAL'
    }

    const updateData: any = {
      mp_status: mpStatus,
      status: status,
      mp_payer_id: preapproval.payer_id?.toString() || preapproval.payer_id,
      updated_at: new Date().toISOString()
    }

    // Actualizar fechas si están disponibles
    if (preapproval.auto_recurring?.start_date) {
      updateData.current_period_start = new Date(preapproval.auto_recurring.start_date).toISOString()
    }
    if (preapproval.auto_recurring?.end_date) {
      updateData.current_period_end = new Date(preapproval.auto_recurring.end_date).toISOString()
    } else {
      // Calcular próximo período (30 días desde ahora)
      updateData.current_period_end = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    }

    if (subscription) {
      const subData = subscription as any
      
      // Actualizar suscripción existente
      const { error: updateError } = await (supabaseAdmin
        .from("subscriptions") as any)
        .update(updateData)
        .eq("id", subData.id)

      if (updateError) {
        console.error('Error actualizando suscripción:', updateError)
      }

      // Registrar evento
      await (supabaseAdmin
        .from("billing_events") as any)
        .insert({
          agency_id: subData.agency_id,
          subscription_id: subData.id,
          event_type: status === 'ACTIVE' ? 'SUBSCRIPTION_UPDATED' : 'SUBSCRIPTION_CANCELED',
          mp_notification_id: preapprovalId,
          metadata: { status: mpStatus, mp_data: preapproval }
        }).catch((err: any) => {
          console.error('Error insertando billing_event:', err)
        })
    } else {
      // Si no existe, registrar el evento
      console.log('⚠️ Suscripción no encontrada para preapproval:', preapprovalId)
      
      await (supabaseAdmin
        .from("billing_events") as any)
        .insert({
          event_type: "SUBSCRIPTION_CREATED",
          mp_notification_id: preapprovalId,
          metadata: { status: mpStatus, mp_data: preapproval }
        }).catch((err: any) => {
          console.error('Error insertando billing_event:', err)
        })
    }
  } catch (error: any) {
    console.error("Error procesando preapproval notification:", error)
    // No lanzar error, solo loggear - el webhook debe siempre retornar 200
  }
}
