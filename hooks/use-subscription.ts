"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
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
        const supabase = createClient()
        
        // Obtener el usuario actual
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (!authUser) {
          console.log('[useSubscription] No auth user found')
          setLoading(false)
          return
        }

        // Obtener el usuario de nuestra BD
        const { data: userData } = await supabase
          .from("users")
          .select("id, role")
          .eq("auth_id", authUser.id)
          .single()

        if (!userData) {
          console.log('[useSubscription] No user data found')
          setLoading(false)
          return
        }

        const userId = (userData as any).id
        console.log('[useSubscription] User:', userId, 'Role:', (userData as any).role)

        // Obtener TODAS las agencias del usuario (puede estar en múltiples)
        const { data: userAgencies } = await supabase
          .from("user_agencies")
          .select("agency_id")
          .eq("user_id", userId)

        if (!userAgencies || userAgencies.length === 0) {
          console.log('[useSubscription] No agencies found for user')
          setLoading(false)
          return
        }

        const agencyIds = (userAgencies as any[]).map(ua => ua.agency_id)
        console.log('[useSubscription] User agencies:', agencyIds)

        // Buscar suscripción activa en CUALQUIERA de las agencias del usuario
        // Esto permite que usuarios invitados hereden la suscripción del admin
        const { data: subscriptionsData, error: subError } = await (supabase
          .from("subscriptions") as any)
          .select(`
            *,
            plan:subscription_plans(*)
          `)
          .in("agency_id", agencyIds)
          .order("created_at", { ascending: false })
        
        console.log('[useSubscription] Found subscriptions:', subscriptionsData?.length || 0)
        
        // Seleccionar la suscripción más relevante de todas las agencias
        let subscriptionData = null
        let selectedAgencyId = agencyIds[0]
        
        if (subscriptionsData && subscriptionsData.length > 0) {
          // Priorizar: TESTER > ACTIVE > TRIAL > más reciente
          subscriptionData = subscriptionsData.find((s: any) => s.plan?.name === 'TESTER')
            || subscriptionsData.find((s: any) => s.status === 'ACTIVE')
            || subscriptionsData.find((s: any) => s.status === 'TRIAL')
            || subscriptionsData[0]
          
          if (subscriptionData) {
            selectedAgencyId = subscriptionData.agency_id
          }
        }

        setAgencyId(selectedAgencyId)

        if (subError) {
          console.error("[useSubscription] Error fetching subscription:", subError)
          setError("Error al obtener la suscripción")
        } else if (subscriptionData) {
          // Asegurarse de que features esté parseado correctamente
          if (subscriptionData.plan && subscriptionData.plan.features) {
            if (typeof subscriptionData.plan.features === 'string') {
              try {
                subscriptionData.plan.features = JSON.parse(subscriptionData.plan.features)
              } catch (e) {
                console.error("[useSubscription] Error parsing plan features:", e)
              }
            }
          }
          
          console.log('[useSubscription] Selected subscription:', {
            agency_id: subscriptionData.agency_id,
            plan: subscriptionData.plan?.name,
            status: subscriptionData.status,
            features: subscriptionData.plan?.features
          })
          
          setSubscription({
            ...subscriptionData,
            plan: subscriptionData.plan,
          } as SubscriptionWithPlan)
        } else {
          // Si no hay suscripción en ninguna agencia
          console.log("[useSubscription] No subscription found for any agency")
        }

        // Obtener métricas de uso del mes actual
        const currentMonthStart = new Date()
        currentMonthStart.setDate(1)
        currentMonthStart.setHours(0, 0, 0, 0)

        const { data: usageData, error: usageError } = await (supabase
          .from("usage_metrics") as any)
          .select("*")
          .eq("agency_id", selectedAgencyId)
          .eq("period_start", currentMonthStart.toISOString().split('T')[0])
          .maybeSingle()

        if (usageError) {
          console.error("[useSubscription] Error fetching usage:", usageError)
        } else if (usageData) {
          setUsage(usageData as UsageMetrics)
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
