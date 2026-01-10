import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { createServerClient } from "@/lib/supabase/server"
import { cancelPreApproval, updatePreApproval } from "@/lib/mercadopago/client"

export const runtime = 'nodejs'

// Mercado Pago no tiene un customer portal como Stripe
// Este endpoint permite cancelar o pausar la suscripción
export async function POST(request: Request) {
  try {
    const { user } = await getCurrentUser()
    const supabase = await createServerClient()
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
    const { data: subscription, error: subscriptionError } = await (supabase
      .from("subscriptions") as any)
      .select("id, mp_preapproval_id, status")
      .eq("agency_id", agencyId)
      .maybeSingle()

    if (subscriptionError || !subscription) {
      return NextResponse.json(
        { error: "No se encontró una suscripción activa" },
        { status: 404 }
      )
    }

    const subData = subscription as any

    if (!subData.mp_preapproval_id) {
      return NextResponse.json(
        { error: "Esta suscripción no tiene un preapproval de Mercado Pago asociado" },
        { status: 400 }
      )
    }

    if (action === 'cancel') {
      // Cancelar preapproval en Mercado Pago
      await cancelPreApproval(subData.mp_preapproval_id)

      // Actualizar suscripción
      // subscriptions table no está en tipos generados todavía
      await (supabase
        .from("subscriptions") as any)
        .update({
          status: 'CANCELED',
          canceled_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq("id", subData.id)

      // Registrar evento
      // billing_events table no está en tipos generados todavía
      await (supabase
        .from("billing_events") as any)
        .insert({
          agency_id: agencyId,
          subscription_id: subData.id,
          event_type: 'SUBSCRIPTION_CANCELED',
          mp_notification_id: subData.mp_preapproval_id
        })

      return NextResponse.json({ 
        success: true,
        message: "Suscripción cancelada exitosamente"
      })
    } else if (action === 'pause') {
      // Pausar preapproval en Mercado Pago
      await updatePreApproval(subData.mp_preapproval_id, {
        status: 'paused'
      })

      // Actualizar suscripción
      // subscriptions table no está en tipos generados todavía
      await (supabase
        .from("subscriptions") as any)
        .update({
          status: 'SUSPENDED',
          updated_at: new Date().toISOString()
        })
        .eq("id", subData.id)

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
