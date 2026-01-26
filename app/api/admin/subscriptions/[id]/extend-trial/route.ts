import { NextResponse } from "next/server"
import { createAdminSupabaseClient } from "@/lib/supabase/admin"

/**
 * POST /api/admin/subscriptions/[id]/extend-trial
 * Extiende el período de trial de una suscripción
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: subscriptionId } = await params
    const body = await request.json()
    const { additionalDays } = body

    if (!subscriptionId) {
      return NextResponse.json({ error: "ID de suscripción requerido" }, { status: 400 })
    }

    if (!additionalDays || additionalDays <= 0) {
      return NextResponse.json({ error: "additionalDays debe ser un número positivo" }, { status: 400 })
    }

    const supabase = createAdminSupabaseClient()

    // Obtener suscripción actual
    const { data: subscription, error: fetchError } = await supabase
      .from("subscriptions")
      .select("id, agency_id, trial_end, status")
      .eq("id", subscriptionId)
      .single()

    if (fetchError || !subscription) {
      return NextResponse.json({ error: "Suscripción no encontrada" }, { status: 404 })
    }

    // Calcular nueva fecha de fin de trial
    const currentTrialEnd = (subscription as any).trial_end 
      ? new Date((subscription as any).trial_end)
      : new Date()
    
    const newTrialEnd = new Date(currentTrialEnd)
    newTrialEnd.setDate(newTrialEnd.getDate() + additionalDays)

    // Actualizar suscripción
    const { data: updatedSubscription, error: updateError } = await supabase
      .from("subscriptions")
      .update({
        trial_end: newTrialEnd.toISOString(),
        current_period_end: newTrialEnd.toISOString(),
        status: 'TRIAL', // Asegurar que esté en TRIAL
        updated_at: new Date().toISOString()
      })
      .eq("id", subscriptionId)
      .select(`
        *,
        plan:subscription_plans(*)
      `)
      .single()

    if (updateError) {
      console.error("Error extending trial:", updateError)
      return NextResponse.json({ error: "Error al extender trial" }, { status: 500 })
    }

    // Registrar evento
    await supabase
      .from("billing_events")
      .insert({
        agency_id: (subscription as any).agency_id,
        subscription_id: subscriptionId,
        event_type: "TRIAL_EXTENDED_BY_ADMIN",
        metadata: {
          additional_days: additionalDays,
          new_trial_end: newTrialEnd.toISOString(),
          extended_by: "admin"
        }
      })

    return NextResponse.json({
      success: true,
      subscription: updatedSubscription,
      newTrialEnd: newTrialEnd.toISOString(),
      additionalDays
    })
  } catch (error: any) {
    console.error("Error in POST /api/admin/subscriptions/[id]/extend-trial:", error)
    return NextResponse.json(
      { error: error.message || "Error al extender trial" },
      { status: 500 }
    )
  }
}
