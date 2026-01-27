import { NextResponse } from "next/server"
import { createAdminSupabaseClient } from "@/lib/supabase/admin"

/**
 * PATCH /api/admin/subscriptions/[id]
 * Actualiza una suscripción (solo desde admin subdomain)
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // El middleware ya verifica que viene del subdominio admin
    const { id: subscriptionId } = await params
    const body = await request.json()

    if (!subscriptionId) {
      return NextResponse.json({ error: "ID de suscripción requerido" }, { status: 400 })
    }

    const supabase = createAdminSupabaseClient()

    // Campos permitidos para actualizar
    const allowedFields = ["status", "plan_id", "current_period_start", "current_period_end", "trial_start", "trial_end"]
    const updateData: Record<string, any> = {}

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    }

    // CRÍTICO: Validar que si se cambia status a ACTIVE, hay mp_preapproval_id
    if (updateData.status === 'ACTIVE') {
      const { data: currentSub } = await supabase
        .from("subscriptions")
        .select("mp_preapproval_id, plan_id, plan:subscription_plans(name)")
        .eq("id", subscriptionId)
        .single()

      if (currentSub) {
        const planName = (currentSub as any).plan?.name
        // TESTER no requiere preapproval, pero otros planes sí
        if (planName !== 'TESTER' && (!(currentSub as any).mp_preapproval_id || (currentSub as any).mp_preapproval_id === '')) {
          return NextResponse.json(
            { error: "No se puede cambiar status a ACTIVE sin mp_preapproval_id válido (excepto plan TESTER)" },
            { status: 400 }
          )
        }
      }
    }

    // Si se está cambiando el plan, verificar que existe
    if (updateData.plan_id) {
      const { data: plan, error: planError } = await supabase
        .from("subscription_plans")
        .select("id, name")
        .eq("id", updateData.plan_id)
        .single()

      if (planError || !plan) {
        return NextResponse.json({ error: "Plan no encontrado" }, { status: 404 })
      }

      // Si el plan es TESTER, asegurar que el status sea ACTIVE
      if ((plan as any).name === 'TESTER') {
        updateData.status = 'ACTIVE'
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No hay campos para actualizar" }, { status: 400 })
    }

    updateData.updated_at = new Date().toISOString()

    // Verificar que la suscripción existe
    const { data: existingSubscription, error: fetchError } = await supabase
      .from("subscriptions")
      .select("id, agency_id")
      .eq("id", subscriptionId)
      .single()

    if (fetchError || !existingSubscription) {
      return NextResponse.json({ error: "Suscripción no encontrada" }, { status: 404 })
    }

    // Actualizar suscripción
    const { data: updatedSubscription, error: updateError } = await (supabase
      .from("subscriptions") as any)
      .update(updateData)
      .eq("id", subscriptionId)
      .select(`
        *,
        plan:subscription_plans(*)
      `)
      .single()

    if (updateError) {
      console.error("Error updating subscription:", updateError)
      return NextResponse.json({ error: "Error al actualizar suscripción" }, { status: 500 })
    }

    // Registrar evento de billing
    try {
      await (supabase.from("billing_events") as any).insert({
        agency_id: (existingSubscription as any).agency_id,
        subscription_id: subscriptionId,
        event_type: "SUBSCRIPTION_UPDATED_BY_ADMIN",
        metadata: { 
          updated_by: "admin",
          changes: updateData
        }
      })
    } catch (e) {
      console.error("Error registrando evento:", e)
    }

    // CRÍTICO: Registrar en auditoría admin
    try {
      // Obtener valores anteriores para auditoría
      const { data: oldSubscription } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("id", subscriptionId)
        .single()

      // Obtener IP y user agent del request (si está disponible)
      const requestHeaders = request.headers
      const ipAddress = requestHeaders.get('x-forwarded-for') || requestHeaders.get('x-real-ip') || 'unknown'
      const userAgent = requestHeaders.get('user-agent') || 'unknown'

      await supabase.rpc('log_admin_action', {
        admin_user_id_param: null, // TODO: Obtener del JWT del admin
        admin_email_param: 'admin@vibook.ai', // TODO: Obtener del JWT del admin
        action_type_param: 'SUBSCRIPTION_UPDATED',
        entity_type_param: 'subscription',
        entity_id_param: subscriptionId,
        old_values_param: oldSubscription ? (oldSubscription as any) : null,
        new_values_param: updateData as any,
        reason_param: body.reason || 'Cambio realizado desde admin panel',
        ip_address_param: ipAddress,
        user_agent_param: userAgent
      })
    } catch (e) {
      console.error("Error registrando auditoría admin:", e)
      // No fallar si falla la auditoría, pero loggear
    }

    return NextResponse.json({ success: true, subscription: updatedSubscription })
  } catch (error: any) {
    console.error("Error in update subscription:", error)
    return NextResponse.json({ error: error.message || "Error al actualizar suscripción" }, { status: 500 })
  }
}
