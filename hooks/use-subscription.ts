"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { SubscriptionWithPlan, UsageMetrics } from "@/lib/billing/types"

export function useSubscription() {
  const [subscription, setSubscription] = useState<SubscriptionWithPlan | null>(null)
  const [usage, setUsage] = useState<UsageMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchSubscription() {
      try {
        const supabase = createClient()
        
        // Obtener el usuario actual
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (!authUser) {
          setLoading(false)
          return
        }

        // Obtener el usuario de nuestra BD
        const { data: userData } = await supabase
          .from("users")
          .select("id")
          .eq("auth_id", authUser.id)
          .single()

        if (!userData) {
          setLoading(false)
          return
        }

        const userId = (userData as any).id

        // Obtener la agencia del usuario
        const { data: userAgencies } = await supabase
          .from("user_agencies")
          .select("agency_id")
          .eq("user_id", userId)
          .limit(1)
          .maybeSingle()

        if (!userAgencies) {
          setLoading(false)
          return
        }

        const agencyId = (userAgencies as any).agency_id

        // Obtener la suscripción con el plan
        // Obtener todas las suscripciones y tomar la más relevante (ACTIVE > TRIAL > más reciente)
        const { data: subscriptionsData, error: subError } = await (supabase
          .from("subscriptions") as any)
          .select(`
            *,
            plan:subscription_plans(*)
          `)
          .eq("agency_id", agencyId)
          .order("created_at", { ascending: false })
        
        // Seleccionar la suscripción más relevante
        let subscriptionData = null
        if (subscriptionsData && subscriptionsData.length > 0) {
          // Priorizar: TESTER > ACTIVE > TRIAL > más reciente
          subscriptionData = subscriptionsData.find((s: any) => s.plan?.name === 'TESTER')
            || subscriptionsData.find((s: any) => s.status === 'ACTIVE')
            || subscriptionsData.find((s: any) => s.status === 'TRIAL')
            || subscriptionsData[0]
        }

        if (subError) {
          console.error("Error fetching subscription:", subError)
          setError("Error al obtener la suscripción")
        } else if (subscriptionData) {
          // Asegurarse de que features esté parseado correctamente
          if (subscriptionData.plan && subscriptionData.plan.features) {
            if (typeof subscriptionData.plan.features === 'string') {
              try {
                subscriptionData.plan.features = JSON.parse(subscriptionData.plan.features)
              } catch (e) {
                console.error("Error parsing plan features:", e)
              }
            }
          }
          
          console.log('[useSubscription] Subscription data:', {
            plan: subscriptionData.plan?.name,
            status: subscriptionData.status,
            features: subscriptionData.plan?.features
          })
          
          setSubscription({
            ...subscriptionData,
            plan: subscriptionData.plan,
          } as SubscriptionWithPlan)
        } else {
          // Si no hay suscripción, no establecer error (puede ser usuario nuevo)
          console.log("No se encontró suscripción para la agencia")
        }

        // Obtener métricas de uso del mes actual
        const currentMonthStart = new Date()
        currentMonthStart.setDate(1)
        currentMonthStart.setHours(0, 0, 0, 0)

        // usage_metrics table no está en tipos generados todavía
        const { data: usageData, error: usageError } = await (supabase
          .from("usage_metrics") as any)
          .select("*")
          .eq("agency_id", agencyId)
          .eq("period_start", currentMonthStart.toISOString().split('T')[0])
          .maybeSingle()

        if (usageError) {
          console.error("Error fetching usage:", usageError)
        } else if (usageData) {
          setUsage(usageData as UsageMetrics)
        }

        setLoading(false)
      } catch (err: any) {
        console.error("Error in useSubscription:", err)
        setError(err.message)
        setLoading(false)
      }
    }

    fetchSubscription()
  }, [])

  return {
    subscription,
    usage,
    loading,
    error,
    // Helpers
    isActive: subscription?.status === "ACTIVE" || (subscription?.status === "TRIAL" && subscription?.plan?.name !== "FREE"),
    isTrial: subscription?.status === "TRIAL" && subscription?.plan?.name !== "FREE",
    planName: subscription?.plan?.name || "FREE",
    canUseFeature: (feature: string) => {
      // REGLA PRINCIPAL: Contenido SIEMPRE bloqueado EXCEPTO si:
      // 1. Prueba Gratuita (TRIAL)
      // 2. Usuario "Tester" (plan TESTER)
      // 3. Ha pagado una suscripción (ACTIVE)
      
      if (!subscription?.plan) {
        console.log('[canUseFeature] No subscription or plan found')
        return false
      }
      
      // Plan TESTER tiene acceso completo
      if (subscription.plan.name === "TESTER") {
        console.log('[canUseFeature] TESTER plan - full access')
        return true
      }
      
      // Si está en TRIAL o ACTIVE, verificar la feature específica del plan
      if (subscription.status === "TRIAL" || subscription.status === "ACTIVE") {
        // Asegurarse de que features es un objeto
        let features = subscription.plan.features
        if (typeof features === 'string') {
          try {
            features = JSON.parse(features)
          } catch (e) {
            console.error('[canUseFeature] Error parsing features:', e)
            return false
          }
        }
        
        if (!features || typeof features !== 'object') {
          console.error('[canUseFeature] Features is not an object:', features)
          return false
        }
        
        // Type assertion para acceder dinámicamente a las propiedades
        const hasFeature = (features as Record<string, boolean>)[feature] === true
        
        console.log('[canUseFeature]', {
          plan: subscription.plan.name,
          status: subscription.status,
          feature,
          features,
          hasFeature
        })
        
        return hasFeature
      }
      
      // Cualquier otro estado (CANCELED, SUSPENDED, PAST_DUE, UNPAID, etc.) = bloqueado
      console.log('[canUseFeature] Blocked - status:', subscription.status)
      return false
    },
    hasReachedLimit: (limitType: 'users' | 'operations' | 'integrations') => {
      if (!subscription?.plan || !usage) return false
      
      const limits = {
        users: subscription.plan.max_users,
        operations: subscription.plan.max_operations_per_month,
        integrations: subscription.plan.max_integrations,
      }

      const usageCounts = {
        users: usage.users_count,
        operations: usage.operations_count,
        integrations: usage.integrations_count,
      }

      const limit = limits[limitType]
      const current = usageCounts[limitType]

      if (limit === null) return false // Ilimitado
      return current >= limit
    },
  }
}
