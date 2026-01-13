"use client"

import { useEffect, useState } from "react"
import type { SubscriptionWithPlan, UsageMetrics } from "@/lib/billing/types"

export function useSubscription() {
  const [subscription, setSubscription] = useState<SubscriptionWithPlan | null>(null)
  const [usage, setUsage] = useState<UsageMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [agencyId, setAgencyId] = useState<string | null>(null)

  useEffect(() => {
    async function fetchSubscription() {
      try {
        // Usar API route que tiene permisos de admin para bypasear RLS
        const response = await fetch('/api/subscription')
        
        if (!response.ok) {
          const errorData = await response.json()
          console.error("[useSubscription] API error:", errorData)
          setError(errorData.error || "Error al obtener suscripción")
          setLoading(false)
          return
        }
        
        const data = await response.json()
        
        console.log('[useSubscription] API response:', {
          hasSubscription: !!data.subscription,
          plan: data.subscription?.plan?.name,
          status: data.subscription?.status,
          agencyId: data.agencyId
        })
        
        if (data.subscription) {
          setSubscription(data.subscription as SubscriptionWithPlan)
        }
        
        if (data.usage) {
          setUsage(data.usage as UsageMetrics)
        }
        
        if (data.agencyId) {
          setAgencyId(data.agencyId)
        }

        setLoading(false)
      } catch (err: any) {
        console.error("[useSubscription] Error:", err)
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
    agencyId, // Exponer el agencyId para usarlo en filtros
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
