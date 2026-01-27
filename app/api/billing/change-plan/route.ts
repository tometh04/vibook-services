import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { createServerClient } from "@/lib/supabase/server"
import { getUserAgencyIds } from "@/lib/permissions-api"

export const dynamic = 'force-dynamic'

/**
 * POST /api/billing/change-plan
 * Cambia el plan de una suscripción con prorrateo
 * - Si upgrade: cobra diferencia prorrateada inmediatamente
 * - Si downgrade: muestra advertencia y borra datos
 */
export async function POST(request: Request) {
  try {
    const { user } = await getCurrentUser()
    const supabase = await createServerClient()
    const body = await request.json()
    const { newPlanId, confirmedDowngrade } = body

    if (!newPlanId) {
      return NextResponse.json(
        { error: "Plan ID es requerido" },
        { status: 400 }
      )
    }

    // Obtener agencias del usuario
    const agencyIds = await getUserAgencyIds(supabase, user.id, user.role as any)
    
    if (agencyIds.length === 0) {
      return NextResponse.json(
        { error: "No tiene agencias asignadas" },
        { status: 403 }
      )
    }

    const agencyId = agencyIds[0]

    // Obtener suscripción actual
    const { data: currentSubscription, error: subError } = await supabase
      .from("subscriptions")
      .select(`
        *,
        plan:subscription_plans(*)
      `)
      .eq("agency_id", agencyId)
      .maybeSingle()

    if (subError || !currentSubscription) {
      return NextResponse.json(
        { error: "No se encontró la suscripción actual" },
        { status: 404 }
      )
    }

    // Obtener nuevo plan
    const { data: newPlan, error: planError } = await supabase
      .from("subscription_plans")
      .select("*")
      .eq("id", newPlanId)
      .single()

    if (planError || !newPlan) {
      return NextResponse.json(
        { error: "Plan no encontrado" },
        { status: 404 }
      )
    }

    const currentPlan = (currentSubscription as any).plan
    const isUpgrade = (newPlan as any).price_monthly > currentPlan.price_monthly
    const isDowngrade = (newPlan as any).price_monthly < currentPlan.price_monthly
    const isTrial = (currentSubscription as any).status === 'TRIAL'

    // Si está en trial y cambia de plan, mostrar advertencia
    if (isTrial && !body.confirmedTrialChange) {
      const trialEndDate = (currentSubscription as any).trial_end ? new Date((currentSubscription as any).trial_end) : null
      const daysRemaining = trialEndDate ? Math.ceil((trialEndDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0
      
      return NextResponse.json({
        requiresConfirmation: true,
        warning: `⚠️ Estás en período de prueba. Al cambiar de plan perderás los ${daysRemaining} días restantes de tu prueba gratuita y se te cobrará inmediatamente.`,
        isTrialChange: true,
        daysRemaining,
        currentPlan: currentPlan.display_name,
        newPlan: (newPlan as any).display_name
      })
    }

    // Si es downgrade, verificar confirmación
    if (isDowngrade && !confirmedDowngrade) {
      // Obtener features que se perderán
      const lostFeatures: string[] = []
      const currentFeatures = currentPlan.features || {}
      const newFeatures = (newPlan as any).features || {}

      Object.keys(currentFeatures).forEach((feature) => {
        if (currentFeatures[feature] && !newFeatures[feature]) {
          lostFeatures.push(feature)
        }
      })

      return NextResponse.json({
        requiresConfirmation: true,
        warning: `⚠️ Al hacer downgrade a ${(newPlan as any).display_name}, perderás acceso a: ${lostFeatures.join(', ')}. TODOS los datos relacionados con estas funcionalidades se eliminarán permanentemente.`,
        lostFeatures,
        currentPlan: currentPlan.display_name,
        newPlan: (newPlan as any).display_name
      })
    }

    // Si es downgrade confirmado, borrar datos
    if (isDowngrade && confirmedDowngrade) {
      const lostFeatures = body.lostFeatures || []
      
      // Borrar datos según features perdidas
      if (lostFeatures.includes('cerebro')) {
        // TODO: Borrar datos de Cerebro
        console.log('[Change Plan] Borrando datos de Cerebro')
      }
      if (lostFeatures.includes('emilia')) {
        // TODO: Borrar datos de Emilia
        console.log('[Change Plan] Borrando datos de Emilia')
      }
      // Agregar más según sea necesario
    }

    // Calcular prorrateo
    const now = new Date()
    const periodStart = new Date((currentSubscription as any).current_period_start)
    const periodEnd = new Date((currentSubscription as any).current_period_end)
    const daysInPeriod = Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24))
    const daysRemaining = Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    
    const currentPrice = currentPlan.price_monthly || 0
    const newPrice = (newPlan as any).price_monthly || 0
    
    // Calcular crédito del plan actual (días restantes)
    const credit = (currentPrice / daysInPeriod) * daysRemaining
    
    // Calcular costo del nuevo plan (días restantes)
    const newCost = (newPrice / daysInPeriod) * daysRemaining
    
    // Diferencia a cobrar (si es upgrade) o crédito (si es downgrade)
    const proratedAmount = isUpgrade ? newCost - credit : 0

    // Actualizar suscripción
    const updateData: any = {
      plan_id: newPlanId,
      current_period_start: now.toISOString(),
      current_period_end: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(), // Nuevo período de 30 días
      updated_at: now.toISOString()
    }

    // Si está en trial, cancelar trial al cambiar de plan (solo si ya confirmó)
    if (isTrial && body.confirmedTrialChange) {
      updateData.trial_start = null
      updateData.trial_end = null
      updateData.status = 'ACTIVE'
    }

    const { data: updatedSubscription, error: updateError } = await supabase
      .from("subscriptions")
      .update(updateData)
      .eq("id", (currentSubscription as any).id)
      .select(`
        *,
        plan:subscription_plans(*)
      `)
      .single()

    if (updateError) {
      console.error("Error updating subscription:", updateError)
      return NextResponse.json(
        { error: "Error al actualizar suscripción" },
        { status: 500 }
      )
    }

    // Si es upgrade y hay diferencia a cobrar, crear pago inmediato
    if (isUpgrade && proratedAmount > 0) {
      // TODO: Crear pago inmediato en Mercado Pago por el prorrateo
      console.log('[Change Plan] Upgrade - cobrar prorrateo:', proratedAmount)
    }

    // Registrar evento
    await supabase
      .from("billing_events")
      .insert({
        agency_id: agencyId,
        subscription_id: (currentSubscription as any).id,
        event_type: 'SUBSCRIPTION_PLAN_CHANGED',
        metadata: {
          from_plan: currentPlan.name,
          to_plan: (newPlan as any).name,
          is_upgrade: isUpgrade,
          is_downgrade: isDowngrade,
          prorated_amount: proratedAmount,
          days_remaining: daysRemaining
        }
      })

    return NextResponse.json({
      success: true,
      subscription: updatedSubscription,
      proratedAmount,
      message: isUpgrade 
        ? `Plan actualizado. Se te cobrará ${proratedAmount.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })} por el prorrateo.`
        : `Plan actualizado a ${(newPlan as any).display_name}.`
    })
  } catch (error: any) {
    console.error("Error in POST /api/billing/change-plan:", error)
    return NextResponse.json(
      { error: error.message || "Error al cambiar plan" },
      { status: 500 }
    )
  }
}
