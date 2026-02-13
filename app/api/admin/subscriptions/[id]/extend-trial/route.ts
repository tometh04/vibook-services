import { NextResponse } from "next/server"
import { createAdminSupabaseClient } from "@/lib/supabase/admin"
import { verifyAdminAuth } from "@/lib/admin/verify-admin-auth"

/**
 * POST /api/admin/subscriptions/[id]/extend-trial
 * Extiende el período de trial de una suscripción
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // CRÍTICO: Verificar autenticación admin directamente
    const adminAuth = await verifyAdminAuth(request)
    if (!adminAuth.valid) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

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

    // Validar límites de extensión
    const { data: extensionCheck, error: extensionError } = await supabase.rpc('check_trial_extension_limits', {
      subscription_id_param: subscriptionId,
      additional_days: additionalDays
    })

    if (extensionError) {
      console.error("Error checking trial extension limits:", extensionError)
      return NextResponse.json(
        { error: extensionError.message || "No se puede extender el trial más allá de los límites permitidos" },
        { status: 400 }
      )
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

    // CRÍTICO: Registrar en auditoría admin
    try {
      const requestHeaders = request.headers
      const adminId = requestHeaders.get('x-admin-id') || 'unknown'
      const adminEmail = requestHeaders.get('x-admin-email') || 'unknown'
      const ipAddress = requestHeaders.get('x-forwarded-for') || requestHeaders.get('x-real-ip') || 'unknown'
      const userAgent = requestHeaders.get('user-agent') || 'unknown'

      await supabase.rpc('log_admin_action', {
        admin_user_id_param: adminId, // ✅ RESUELTO: Obtenido del JWT del admin via middleware
        admin_email_param: adminEmail, // ✅ RESUELTO: Obtenido del JWT del admin via middleware
        action_type_param: 'TRIAL_EXTENDED',
        entity_type_param: 'subscription',
        entity_id_param: subscriptionId,
        old_values_param: { trial_end: (subscription as any).trial_end } as any,
        new_values_param: { trial_end: newTrialEnd.toISOString(), additional_days: additionalDays } as any,
        reason_param: body.reason || `Extensión de trial por ${additionalDays} días`,
        ip_address_param: ipAddress,
        user_agent_param: userAgent
      })
    } catch (e) {
      console.error("Error registrando auditoría admin:", e)
    }

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
