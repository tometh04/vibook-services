import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getPreApproval } from "@/lib/mercadopago/client"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

export const runtime = 'nodejs'

// Mercado Pago envía notificaciones IPN (Instant Payment Notification)
// Pueden ser de tipo "payment" o "preapproval"
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { type, data } = body

    console.log('📥 Webhook recibido de Mercado Pago:', { type, data })

    // Mercado Pago puede enviar diferentes tipos de notificaciones
    if (type === 'payment') {
      await handlePaymentNotification(data.id)
    } else if (type === 'preapproval') {
      await handlePreApprovalNotification(data.id)
    } else {
      console.log(`⚠️ Tipo de notificación no manejado: ${type}`)
      return NextResponse.json({ received: true })
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error("Error processing Mercado Pago webhook:", error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

// GET también es usado por Mercado Pago para verificar la URL
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const topic = searchParams.get('topic') // 'payment' o 'preapproval'
  const id = searchParams.get('id') // ID del payment o preapproval

  if (!topic || !id) {
    return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 })
  }

  try {
    console.log('📥 GET webhook de Mercado Pago:', { topic, id })

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
        // No fallar el webhook si hay error procesando
      })
    } else if (topic === 'preapproval') {
      await handlePreApprovalNotification(id).catch((err: any) => {
        console.error('Error procesando preapproval notification:', err)
        // No fallar el webhook si hay error procesando
      })
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error("Error processing Mercado Pago webhook (GET):", error)
    // Siempre retornar 200 para que Mercado Pago no reenvíe
    return NextResponse.json({ received: true, error: error.message })
  }
}

async function handlePaymentNotification(paymentId: string) {
  // Cuando se aprueba el primer pago, se crea automáticamente el preapproval
  // Necesitamos buscar la suscripción por preference_id o external_reference
  // Por ahora, solo registramos el evento
  console.log('💳 Procesando notificación de pago:', paymentId)

  try {
    // Aquí deberías obtener el pago de Mercado Pago para ver el external_reference
    // Por simplicidad, lo registramos como evento
    // billing_events table no está en tipos generados todavía
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
    // subscriptions table no está en tipos generados todavía
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
      // subscriptions table no está en tipos generados todavía
      const { error: updateError } = await (supabaseAdmin
        .from("subscriptions") as any)
        .update(updateData)
        .eq("id", subData.id)

      if (updateError) {
        console.error('Error actualizando suscripción:', updateError)
      }

      // Registrar evento
      // billing_events table no está en tipos generados todavía
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
      // Si no existe, buscar por external_reference en el pago inicial
      // Por ahora solo registramos el evento
      console.log('⚠️ Suscripción no encontrada para preapproval:', preapprovalId)
      
      // billing_events table no está en tipos generados todavía
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
