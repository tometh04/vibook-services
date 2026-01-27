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
    // SEGURIDAD: Sin admin client, denegar en producción (deny-by-default)
    const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production'

    if (isProduction) {
      console.error('🚨 CRÍTICO: Supabase admin client no disponible en producción')
      return {
        limitReached: true,
        limit: null,
        current: 0,
        message: "Error de configuración del sistema. Contacta soporte.",
      }
    }

    // En desarrollo, permitir pero advertir
    console.warn('⚠️ Supabase admin client no disponible - permitiendo en desarrollo')
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
      // Si no hay suscripción, bloquear acceso
      return {
        limitReached: true,
        limit: null,
        current: 0,
        message: "No tenés una suscripción activa. Por favor, elegí un plan para continuar.",
      }
    }

    // Plan TESTER tiene acceso completo sin límites
    if (subscriptionData.plan.name === 'TESTER') {
      return { limitReached: false, limit: null, current: 0 }
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
    
    // Si está en TRIAL o ACTIVE, permitir acceso (respeta cambios manuales del admin)
    if (subscriptionStatus === 'TRIAL' || subscriptionStatus === 'ACTIVE') {
      // Continuar con la verificación de límites
    } else {
      // Si no está en TRIAL o ACTIVE, bloquear
      return {
        limitReached: true,
        limit: null,
        current: 0,
        message: "No tenés una suscripción activa. Por favor, elegí un plan para continuar.",
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
      ? `Has alcanzado el límite de ${limit} ${limitMessages[limitType]} de tu plan ${planNames[plan.name] || plan.name}. Podés seguir viendo tus datos, pero no podés crear nuevos. ${limitType === 'users' ? 'Eliminá usuarios existentes o actualizá tu plan para continuar.' : 'Actualizá tu plan para continuar.'}`
      : undefined

    return {
      limitReached,
      limit,
      current,
      message,
    }
  } catch (error: any) {
    console.error("Error checking subscription limit:", error)
    // SEGURIDAD: En caso de error, DENEGAR (deny-by-default)
    const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production'

    if (isProduction) {
      console.error('🚨 Error verificando límites - DENEGANDO acceso en producción')
      return {
        limitReached: true,
        limit: null,
        current: 0,
        message: "Error al verificar tu suscripción. Por favor, intenta nuevamente.",
      }
    }

    // En desarrollo, permitir pero advertir
    console.warn('⚠️ Error verificando límites - permitiendo en desarrollo')
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
    // SEGURIDAD: Sin admin client, denegar en producción (deny-by-default)
    const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production'

    if (isProduction) {
      console.error('🚨 CRÍTICO: Supabase admin client no disponible en producción')
      return {
        hasAccess: false,
        message: "Error de configuración del sistema. Contacta soporte.",
      }
    }

    // En desarrollo, permitir pero advertir
    console.warn('⚠️ Supabase admin client no disponible - permitiendo en desarrollo')
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
      // Si no hay suscripción, bloquear acceso
      return {
        hasAccess: false,
        message: `No tenés una suscripción activa. Por favor, elegí un plan para continuar.`,
      }
    }
    
    // Plan TESTER tiene acceso completo sin pago
    if (subscription.plan.name === 'TESTER') {
      return { hasAccess: true }
    }

    const subscriptionStatus = subscription.status as string
    
    // Bloquear acceso si la suscripción está cancelada, suspendida o sin pagar
    if (subscriptionStatus === 'CANCELED' || subscriptionStatus === 'SUSPENDED' || 
        subscriptionStatus === 'PAST_DUE' || subscriptionStatus === 'UNPAID') {
      return {
        hasAccess: false,
        message: `Tu suscripción está ${subscriptionStatus === 'CANCELED' ? 'cancelada' : subscriptionStatus === 'SUSPENDED' ? 'suspendida' : 'pendiente de pago'}. Por favor, actualizá tu plan para continuar usando el servicio.`,
      }
    }

    const plan = subscription.plan
    const features = plan.features || {}

    // Durante el período de prueba (TRIAL) o si está ACTIVE, permitir acceso a todas las features
    // Esto respeta los cambios manuales del admin
    if (subscriptionStatus === 'TRIAL' || subscriptionStatus === 'ACTIVE') {
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
      cerebro: "Cerebro",
      emilia: "Emilia (IA)",
      whatsapp: "WhatsApp",
      reports: "Reportes avanzados",
      crm: "CRM",
      marketing_ads: "Marketing y Ads",
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
