import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { createServerClient } from "@/lib/supabase/server"
import { createAdminSupabaseClient } from "@/lib/supabase/admin"
import { cancelPreApproval, getPreApproval, updatePreApproval } from "@/lib/mercadopago/client"

export const runtime = 'nodejs'

// Mercado Pago no tiene un customer portal como Stripe
// Este endpoint permite cancelar o pausar la suscripción
export async function POST(request: Request) {
  try {
    const { user } = await getCurrentUser()
    const supabase = await createServerClient()
    const supabaseAdmin = createAdminSupabaseClient()
    const body = await request.json()
    const { action } = body // 'cancel' o 'pause'

    if (!action || !['cancel', 'pause'].includes(action)) {
      return NextResponse.json(
        { error: "Acción inválida. Debe ser 'cancel' o 'pause'" },
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

    // Obtener la suscripción
    // subscriptions table no está en tipos generados todavía
    const { data: subscription, error: subscriptionError } = await (supabaseAdmin
      .from("subscriptions") as any)
      .select("id, mp_preapproval_id, status")
      .eq("agency_id", agencyId)
      .maybeSingle()

    if (subscriptionError) {
      console.error("Error buscando suscripción:", subscriptionError)
      return NextResponse.json(
        { error: "Error al buscar la suscripción" },
        { status: 500 }
      )
    }

    if (!subscription) {
      return NextResponse.json(
        { error: "No se encontró una suscripción activa" },
        { status: 404 }
      )
    }

    const subData = subscription as any

    if (!subData.mp_preapproval_id) {
      return NextResponse.json(
        {
          error: "No encontramos el vínculo con Mercado Pago para esta suscripción.",
          code: "MP_PREAPPROVAL_MISSING",
        },
        { status: 400 }
      )
    }

    if (action === 'cancel') {
      // Protección contra doble cancelación
      if (subData.status === 'CANCELED') {
        return NextResponse.json({
          success: true,
          message: "La suscripción ya fue cancelada anteriormente."
        })
      }

      // Cancelar preapproval en Mercado Pago con verificación
      let mpConfirmedCancelled = false
      try {
        await cancelPreApproval(subData.mp_preapproval_id)
        console.log("✅ Preapproval cancelado exitosamente en MP:", subData.mp_preapproval_id)
        mpConfirmedCancelled = true
      } catch (error: any) {
        console.error("Error cancelando preapproval en MP:", error)
        // Verificar el estado actual en MP para confirmar si ya estaba cancelado
        try {
          const currentState = await getPreApproval(subData.mp_preapproval_id)
          const mpCurrentStatus = (currentState as any)?.status
          console.log("Estado actual del preapproval en MP:", mpCurrentStatus)
          if (mpCurrentStatus === 'cancelled' || mpCurrentStatus === 'canceled') {
            console.warn("✓ Preapproval ya estaba cancelado en MP")
            mpConfirmedCancelled = true
          } else {
            console.error("✗ Preapproval NO está cancelado en MP. Estado:", mpCurrentStatus)
          }
        } catch (checkErr: any) {
          console.error("Error verificando estado del preapproval:", checkErr)
        }
      }

      // Si MP no confirmó la cancelación, no actualizar DB y retornar error
      if (!mpConfirmedCancelled) {
        // Registrar evento de fallo
        try {
          await (supabaseAdmin.from("billing_events") as any).insert({
            agency_id: agencyId,
            subscription_id: subData.id,
            event_type: 'CANCELLATION_FAILED',
            mp_notification_id: subData.mp_preapproval_id,
          })
        } catch (_) { /* no fallar por log */ }

        return NextResponse.json(
          { error: "No se pudo cancelar la suscripción en Mercado Pago. Por favor, intentá nuevamente o contactá a soporte." },
          { status: 502 }
        )
      }

      // Actualizar suscripción
      // subscriptions table no está en tipos generados todavía
      const { error: updateError } = await (supabaseAdmin
        .from("subscriptions") as any)
        .update({
          status: 'CANCELED',
          mp_status: 'cancelled',
          canceled_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq("id", subData.id)

      if (updateError) {
        console.error("Error actualizando suscripción:", updateError)
        return NextResponse.json(
          { error: "Error al actualizar la suscripción" },
          { status: 500 }
        )
      }

      // Registrar evento
      // billing_events table no está en tipos generados todavía
      const { error: eventError } = await (supabaseAdmin
        .from("billing_events") as any)
        .insert({
          agency_id: agencyId,
          subscription_id: subData.id,
          event_type: 'SUBSCRIPTION_CANCELED',
          mp_notification_id: subData.mp_preapproval_id
        })

      if (eventError) {
        console.error("Error registrando billing_event:", eventError)
      }

      return NextResponse.json({ 
        success: true,
        message: "Suscripción cancelada exitosamente"
      })
    } else if (action === 'pause') {
      // Protección contra doble pausa
      if (subData.status === 'SUSPENDED') {
        return NextResponse.json({
          success: true,
          message: "La suscripción ya fue pausada anteriormente."
        })
      }

      // Pausar preapproval en Mercado Pago con verificación
      let mpConfirmedPaused = false
      try {
        await updatePreApproval(subData.mp_preapproval_id, {
          status: 'paused'
        })
        console.log("✅ Preapproval pausado exitosamente en MP:", subData.mp_preapproval_id)
        mpConfirmedPaused = true
      } catch (error: any) {
        console.error("Error pausando preapproval en MP:", error)
        // Verificar estado actual
        try {
          const currentState = await getPreApproval(subData.mp_preapproval_id)
          const mpCurrentStatus = (currentState as any)?.status
          console.log("Estado actual del preapproval en MP:", mpCurrentStatus)
          if (mpCurrentStatus === 'paused') {
            console.warn("✓ Preapproval ya estaba pausado en MP")
            mpConfirmedPaused = true
          }
        } catch (checkErr: any) {
          console.error("Error verificando estado del preapproval:", checkErr)
        }
      }

      if (!mpConfirmedPaused) {
        return NextResponse.json(
          { error: "No se pudo pausar la suscripción en Mercado Pago. Por favor, intentá nuevamente." },
          { status: 502 }
        )
      }

      // Actualizar suscripción
      // subscriptions table no está en tipos generados todavía
      const { error: updateError } = await (supabaseAdmin
        .from("subscriptions") as any)
        .update({
          status: 'SUSPENDED',
          mp_status: 'paused',
          updated_at: new Date().toISOString()
        })
        .eq("id", subData.id)

      if (updateError) {
        console.error("Error actualizando suscripción:", updateError)
        return NextResponse.json(
          { error: "Error al actualizar la suscripción" },
          { status: 500 }
        )
      }

      return NextResponse.json({ 
        success: true,
        message: "Suscripción pausada exitosamente"
      })
    }
  } catch (error: any) {
    console.error("Error in POST /api/billing/portal:", error)
    return NextResponse.json(
      { error: error.message || "Error al gestionar la suscripción" },
      { status: 500 }
    )
  }
}
