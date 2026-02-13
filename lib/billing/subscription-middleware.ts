/**
 * Middleware para verificar suscripción en cada API call
 * CRÍTICO: Previene bypass del paywall mediante llamadas directas a API
 */

import { createAdminSupabaseClient } from "@/lib/supabase/admin"
import { getUserAgencyIds } from "@/lib/permissions-api"
import { createServerClient } from "@/lib/supabase/server"
import { checkFeatureAccess } from "@/lib/billing/limits"

export interface SubscriptionCheckResult {
  hasAccess: boolean
  message?: string
  subscription?: {
    id: string
    status: string
    planName: string
  }
}

/**
 * Verifica que el usuario tenga una suscripción válida
 * Retorna false si:
 * - No tiene suscripción
 * - Status es CANCELED, SUSPENDED, PAST_DUE, UNPAID
 * - Plan es FREE (sin pago)
 * 
 * Retorna true si:
 * - Plan es TESTER
 * - Status es ACTIVE
 * - Status es TRIAL
 */
export async function verifySubscriptionAccess(
  userId: string,
  userRole: string
): Promise<SubscriptionCheckResult> {
  try {
    const supabase = await createServerClient()
    const supabaseAdmin = createAdminSupabaseClient()

    // Obtener agencias del usuario
    const agencyIds = await getUserAgencyIds(supabase, userId, userRole as any)
    
    if (agencyIds.length === 0) {
      return {
        hasAccess: false,
        message: "No tiene agencias asignadas"
      }
    }

    // Obtener todas las suscripciones de las agencias del usuario
    const { data: subscriptions, error } = await (supabaseAdmin
      .from("subscriptions") as any)
      .select(`
        id,
        status,
        trial_end,
        plan:subscription_plans(name, display_name)
      `)
      .in("agency_id", agencyIds)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[verifySubscriptionAccess] Error fetching subscriptions:", error)
      // En caso de error, bloquear acceso por seguridad
      return {
        hasAccess: false,
        message: "Error al verificar suscripción"
      }
    }

    if (!subscriptions || subscriptions.length === 0) {
      return {
        hasAccess: false,
        message: "No tiene una suscripción activa. Por favor, elegí un plan para continuar."
      }
    }

    // Buscar la suscripción más relevante: ACTIVE > TRIAL > más reciente
    const activeSubscription = subscriptions.find((s: any) => s.status === 'ACTIVE')
    const trialSubscription = subscriptions.find((s: any) => s.status === 'TRIAL')
    const subscription = activeSubscription || trialSubscription || subscriptions[0]

    const status = subscription.status as string
    const planName = subscription.plan?.name as string

    // Plan TESTER tiene acceso completo
    if (planName === 'TESTER') {
      return {
        hasAccess: true,
        subscription: {
          id: subscription.id,
          status,
          planName
        }
      }
    }

    // Solo permitir si está ACTIVE o TRIAL (con trial vigente)
    const trialEndRaw = subscription.trial_end as string | null | undefined
    const trialEndDate = trialEndRaw ? new Date(trialEndRaw) : null
    const trialActive = status === 'TRIAL' && (!trialEndDate || trialEndDate >= new Date())

    if (status === 'ACTIVE' || trialActive) {
      return {
        hasAccess: true,
        subscription: {
          id: subscription.id,
          status,
          planName
        }
      }
    }

    // Cualquier otro estado = bloqueado
    const statusMessages: Record<string, string> = {
      CANCELED: "Tu suscripción está cancelada",
      SUSPENDED: "Tu suscripción está suspendida",
      PAST_DUE: "Tu suscripción tiene pagos pendientes",
      UNPAID: "Tu suscripción no está pagada",
    }

    return {
      hasAccess: false,
      message: statusMessages[status] || "Tu suscripción no está activa. Por favor, actualizá tu plan para continuar.",
      subscription: {
        id: subscription.id,
        status,
        planName
      }
    }
  } catch (error: any) {
    console.error("[verifySubscriptionAccess] Error:", error)
    // En caso de error, bloquear acceso por seguridad
    return {
      hasAccess: false,
      message: "Error al verificar suscripción"
    }
  }
}

export interface FeatureAccessResult {
  hasAccess: boolean
  message?: string
  agencyId?: string
}

/**
 * Verifica acceso a una feature específica por agencia
 * - Usa subscription + plan features
 * - En TRIAL permite acceso completo
 */
export async function verifyFeatureAccess(
  userId: string,
  userRole: string,
  feature: string,
  agencyId?: string
): Promise<FeatureAccessResult> {
  try {
    const supabase = await createServerClient()

    // Obtener agencias del usuario
    const agencyIds = await getUserAgencyIds(supabase, userId, userRole as any)

    if (agencyIds.length === 0) {
      return {
        hasAccess: false,
        message: "No tiene agencias asignadas",
      }
    }

    const targetAgencyId = agencyId || agencyIds[0]

    if (agencyId && !agencyIds.includes(agencyId) && userRole !== "SUPER_ADMIN") {
      return {
        hasAccess: false,
        message: "No tiene permiso para acceder a esta agencia",
      }
    }

    const access = await checkFeatureAccess(targetAgencyId, feature)
    return {
      hasAccess: access.hasAccess,
      message: access.message,
      agencyId: targetAgencyId,
    }
  } catch (error: any) {
    console.error("[verifyFeatureAccess] Error:", error)
    return {
      hasAccess: false,
      message: "Error al verificar suscripción",
    }
  }
}
