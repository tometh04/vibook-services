import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { createServerClient } from "@/lib/supabase/server"
import { getPreApproval } from "@/lib/mercadopago/client"
import { createAdminSupabaseClient } from "@/lib/supabase/admin"

/**
 * POST /api/billing/verify-payment
 * Verifica manualmente el estado del pago en Mercado Pago
 * Útil cuando el webhook está retrasado
 */
export async function POST() {
  try {
    const { user } = await getCurrentUser()
    const supabase = await createServerClient()
    const supabaseAdmin = createAdminSupabaseClient()

    // Obtener agencias del usuario
    const { getUserAgencyIds } = await import("@/lib/permissions-api")
    const agencyIds = await getUserAgencyIds(supabase, user.id, user.role as any)

    if (agencyIds.length === 0) {
      return NextResponse.json(
        { error: "No tiene agencias asignadas" },
        { status: 403 }
      )
    }

    // Obtener suscripción de la primera agencia
    const { data: subscription, error: subError } = await (supabaseAdmin
      .from("subscriptions") as any)
      .select(`
        id,
        agency_id,
        mp_preapproval_id,
        status,
        plan:subscription_plans(name)
      `)
      .eq("agency_id", agencyIds[0])
      .maybeSingle()

    if (subError || !subscription) {
      return NextResponse.json(
        { error: "No se encontró una suscripción" },
        { status: 404 }
      )
    }

    const subData = subscription as any

    // Si no tiene preapproval_id, no hay nada que verificar
    if (!subData.mp_preapproval_id) {
      return NextResponse.json({
        success: false,
        message: "No hay un preapproval de Mercado Pago asociado a esta suscripción",
        status: subData.status
      })
    }

    // Verificar estado en Mercado Pago
    try {
      const preapproval = await getPreApproval(subData.mp_preapproval_id)
      const mpStatus = (preapproval as any).status

      // Si el estado en Mercado Pago es diferente al nuestro, actualizar
      if (mpStatus === 'authorized' && subData.status !== 'ACTIVE') {
        // Actualizar a ACTIVE
        await (supabaseAdmin.from("subscriptions") as any)
          .update({
            status: 'ACTIVE',
            mp_status: mpStatus,
            updated_at: new Date().toISOString()
          })
          .eq("id", subData.id)

        // Registrar evento
        await (supabaseAdmin.from("billing_events") as any).insert({
          agency_id: subData.agency_id,
          subscription_id: subData.id,
          event_type: "PAYMENT_VERIFIED_MANUALLY",
          metadata: {
            mp_status: mpStatus,
            previous_status: subData.status,
            verified_by: user.id
          }
        })

        return NextResponse.json({
          success: true,
          message: "Pago verificado. Tu suscripción ha sido activada.",
          mpStatus,
          previousStatus: subData.status,
          newStatus: 'ACTIVE'
        })
      } else if (mpStatus === 'pending' && subData.status !== 'TRIAL') {
        // Mantener en TRIAL si está pendiente
        return NextResponse.json({
          success: true,
          message: "El pago está pendiente en Mercado Pago. Tu suscripción permanece en período de prueba.",
          mpStatus,
          currentStatus: subData.status
        })
      } else if (mpStatus === 'cancelled' && subData.status !== 'CANCELED') {
        // Actualizar a CANCELED
        await (supabaseAdmin.from("subscriptions") as any)
          .update({
            status: 'CANCELED',
            mp_status: mpStatus,
            updated_at: new Date().toISOString()
          })
          .eq("id", subData.id)

        return NextResponse.json({
          success: true,
          message: "El preapproval fue cancelado en Mercado Pago. Tu suscripción ha sido cancelada.",
          mpStatus,
          previousStatus: subData.status,
          newStatus: 'CANCELED'
        })
      } else {
        return NextResponse.json({
          success: true,
          message: "El estado del pago está sincronizado correctamente.",
          mpStatus,
          currentStatus: subData.status
        })
      }
    } catch (mpError: any) {
      console.error("Error verificando preapproval en Mercado Pago:", mpError)
      return NextResponse.json(
        {
          success: false,
          error: "Error al verificar el pago en Mercado Pago",
          details: mpError.message
        },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error("Error in POST /api/billing/verify-payment:", error)
    return NextResponse.json(
      { error: error.message || "Error al verificar pago" },
      { status: 500 }
    )
  }
}
