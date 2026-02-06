/**
 * Middleware para verificar suscripción en cada API call
 * CRÍTICO: Previene bypass del paywall mediante llamadas directas a API
 */

import { createAdminSupabaseClient } from "@/lib/supabase/admin"
import { getUserAgencyIds } from "@/lib/permissions-api"
import { createServerClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/auth"

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
    // Bypass para desarrollo local cuando la auth está deshabilitada
    if (process.env.DISABLE_AUTH === "true") {
      return {
        hasAccess: true,
        subscription: {
          id: "dev",
          status: "ACTIVE",
          planName: "DEV",
        },
      }
    }

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
