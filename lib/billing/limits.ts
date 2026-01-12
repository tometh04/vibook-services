import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabaseAdmin = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null

/**
 * Verifica si una agencia puede realizar una acción basado en su plan
 * @returns { limitReached: boolean, limit: number | null, current: number, message?: string }
 */
export async function checkSubscriptionLimit(
  agencyId: string,
  limitType: "users" | "operations" | "integrations"
): Promise<{
  limitReached: boolean
  limit: number | null
  current: number
  message?: string
}> {
  // Los checks de límites están habilitados para producción
  // (DISABLE_SUBSCRIPTION_LIMITS removido - paywall completo implementado)

  if (!supabaseAdmin) {
    // Si no hay admin client, permitir todo (para desarrollo)
    return { limitReached: false, limit: null, current: 0 }
  }

  try {
    // Obtener la suscripción con el plan
    const { data: subscription } = await (supabaseAdmin
      .from("subscriptions") as any)
      .select(`
        *,
        plan:subscription_plans(*)
      `)
      .eq("agency_id", agencyId)
      .maybeSingle()

    let subscriptionData = subscription
    if (!subscriptionData || !subscriptionData.plan) {
      // Si no hay suscripción, asumir plan FREE
      const { data: freePlan } = await (supabaseAdmin
        .from("subscription_plans") as any)
        .select("*")
        .eq("name", "FREE")
        .single()

      if (!freePlan) {
        return { limitReached: false, limit: null, current: 0 }
      }

      subscriptionData = { plan: freePlan, status: "TRIAL" }
    }

    // Bloquear si la suscripción está cancelada, suspendida o sin pagar
    const subscriptionStatus = subscriptionData.status as string
    if (subscriptionStatus === 'CANCELED' || subscriptionStatus === 'SUSPENDED' || 
        subscriptionStatus === 'PAST_DUE' || subscriptionStatus === 'UNPAID') {
      return {
        limitReached: true,
        limit: null,
        current: 0,
        message: `Tu suscripción está ${subscriptionStatus === 'CANCELED' ? 'cancelada' : subscriptionStatus === 'SUSPENDED' ? 'suspendida' : 'pendiente de pago'}. Por favor, actualizá tu plan para continuar.`,
      }
    }

    const plan = subscriptionData.plan
    const limits = {
      users: plan.max_users,
      operations: plan.max_operations_per_month,
      integrations: plan.max_integrations,
    }

    const limit = limits[limitType]

    // Si el límite es null, significa ilimitado
    if (limit === null) {
      return { limitReached: false, limit: null, current: 0 }
    }

    // Obtener métricas de uso del mes actual
    const currentMonthStart = new Date()
    currentMonthStart.setDate(1)
    currentMonthStart.setHours(0, 0, 0, 0)

    const { data: usageData } = await (supabaseAdmin
      .from("usage_metrics") as any)
      .select("*")
      .eq("agency_id", agencyId)
      .eq("period_start", currentMonthStart.toISOString().split("T")[0])
      .maybeSingle()

    const current = usageData
      ? usageData[`${limitType}_count`] || 0
      : 0

    const limitReached = current >= limit

    const planNames: Record<string, string> = {
      FREE: "Free",
      STARTER: "Starter",
      PRO: "Pro",
      ENTERPRISE: "Enterprise",
    }

    const limitMessages: Record<string, string> = {
      users: "usuarios",
      operations: "operaciones por mes",
      integrations: "integraciones",
    }

    const message = limitReached
      ? `Has alcanzado el límite de ${limit} ${limitMessages[limitType]} de tu plan ${planNames[plan.name] || plan.name}. Por favor, actualizá tu plan para continuar.`
      : undefined

    return {
      limitReached,
      limit,
      current,
      message,
    }
  } catch (error: any) {
    console.error("Error checking subscription limit:", error)
    // En caso de error, permitir la acción (fallback seguro)
    return { limitReached: false, limit: null, current: 0 }
  }
}

/**
 * Verifica si una agencia puede usar una feature basado en su plan
 */
export async function checkFeatureAccess(
  agencyId: string,
  feature: string
): Promise<{ hasAccess: boolean; message?: string }> {
  // Los checks de features están habilitados para producción
  // (DISABLE_SUBSCRIPTION_LIMITS removido - paywall completo implementado)

  if (!supabaseAdmin) {
    return { hasAccess: true }
  }

  try {
    // Obtener la suscripción con el plan
    const { data: subscription } = await (supabaseAdmin
      .from("subscriptions") as any)
      .select(`
        *,
        plan:subscription_plans(*)
      `)
      .eq("agency_id", agencyId)
      .maybeSingle()

    if (!subscription || !subscription.plan) {
      // Si no hay suscripción, asumir plan FREE (no tiene features premium)
      return {
        hasAccess: false,
        message: `Esta funcionalidad requiere un plan superior. Por favor, actualizá tu plan para acceder.`,
      }
    }

    // Bloquear acceso si la suscripción está cancelada, suspendida o sin pagar
    const subscriptionStatus = subscription.status as string
    if (subscriptionStatus === 'CANCELED' || subscriptionStatus === 'SUSPENDED' || 
        subscriptionStatus === 'PAST_DUE' || subscriptionStatus === 'UNPAID') {
      return {
        hasAccess: false,
        message: `Tu suscripción está ${subscriptionStatus === 'CANCELED' ? 'cancelada' : subscriptionStatus === 'SUSPENDED' ? 'suspendida' : 'pendiente de pago'}. Por favor, actualizá tu plan para continuar usando el servicio.`,
      }
    }

    const plan = subscription.plan
    const features = plan.features || {}

    // Durante el período de prueba (TRIAL), permitir acceso a todas las features
    if (subscriptionStatus === 'TRIAL') {
      return { hasAccess: true }
    }

    const hasAccess = features[feature] === true

    const planNames: Record<string, string> = {
      FREE: "Free",
      STARTER: "Starter",
      PRO: "Pro",
      ENTERPRISE: "Enterprise",
    }

    const featureNames: Record<string, string> = {
      trello: "Trello",
      manychat: "Manychat",
      emilia: "Emilia (IA)",
      whatsapp: "WhatsApp",
      reports: "Reportes avanzados",
    }

    const message = !hasAccess
      ? `La integración con ${featureNames[feature] || feature} está disponible en planes superiores. Por favor, actualizá tu plan ${planNames[plan.name] || plan.name} para acceder.`
      : undefined

    return { hasAccess, message }
  } catch (error: any) {
    console.error("Error checking feature access:", error)
    // En caso de error, denegar acceso (fallback seguro)
    return { hasAccess: false, message: "Error al verificar el acceso" }
  }
}
