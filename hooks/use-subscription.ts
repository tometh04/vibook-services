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
          setSubscription({
            ...subscriptionData,
            plan: subscriptionData.plan,
          } as SubscriptionWithPlan)
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
      if (!subscription?.plan) return false
      
      // Plan TESTER tiene acceso completo
      if (subscription.plan.name === "TESTER") {
        return true
      }
      
      // Si tiene plan FREE sin pago, no permitir features premium
      if (subscription.plan.name === "FREE" && !subscription.mp_preapproval_id) {
        return false
      }
      
      // Durante el período de prueba (TRIAL) con plan de pago, permitir acceso a todas las features
      if (subscription.status === "TRIAL" && subscription.plan.name !== "FREE") {
        return true
      }
      
      // Si está ACTIVE, permitir acceso a todas las features (respeta cambios manuales del admin)
      if (subscription.status === "ACTIVE") {
        return true
      }
      
      // Para otros estados, verificar la feature específica del plan
      return subscription.plan.features[feature as keyof typeof subscription.plan.features] === true
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
