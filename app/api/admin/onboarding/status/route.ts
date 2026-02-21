import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { jwtVerify } from "jose"
import { createAdminSupabaseClient } from "@/lib/supabase/admin"
import { ONBOARDING_STEPS } from "@/lib/onboarding/steps"
import { ONBOARDING_EVENT_SET } from "@/lib/onboarding/events"

const JWT_SECRET = new TextEncoder().encode(
  process.env.ADMIN_JWT_SECRET || "vibook-admin-secret-key-change-in-production"
)

type Pair = { user_id: string; agency_id: string }

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}

async function ensureAdmin() {
  const cookieStore = await cookies()
  const token = cookieStore.get("admin_session")?.value
  if (!token) return false
  try {
    await jwtVerify(token, JWT_SECRET)
    return true
  } catch {
    return false
  }
}

async function fetchGroupedCounts(
  supabase: ReturnType<typeof createAdminSupabaseClient>,
  agencyIds: string[]
) {
  const leadsMap = new Map<string, number>()
  const customersMap = new Map<string, number>()
  const operatorsMap = new Map<string, number>()
  const operationsMap = new Map<string, number>()
  const paymentsMap = new Map<string, number>()

  if (agencyIds.length === 0) {
    return { leadsMap, customersMap, operatorsMap, operationsMap, paymentsMap }
  }

  const safeIds = agencyIds.filter(isUuid)
  if (safeIds.length === 0) {
    return { leadsMap, customersMap, operatorsMap, operationsMap, paymentsMap }
  }

  const idList = safeIds.map((id) => `'${id}'`).join(",")

  const runQuery = async (query: string) => {
    const { data, error } = await (supabase.rpc as any)("execute_readonly_query", {
      query_text: query,
    })
    if (error) {
      throw error
    }
    return Array.isArray(data) ? data : []
  }

  try {
    const [leadsRows, customersRows, operatorsRows, operationsRows, paymentsRows] = await Promise.all([
      runQuery(
        `SELECT agency_id, COUNT(*)::int AS total FROM leads WHERE agency_id IN (${idList}) GROUP BY agency_id`
      ),
      runQuery(
        `SELECT agency_id, COUNT(*)::int AS total FROM customers WHERE agency_id IN (${idList}) GROUP BY agency_id`
      ),
      runQuery(
        `SELECT agency_id, COUNT(*)::int AS total FROM operators WHERE agency_id IN (${idList}) GROUP BY agency_id`
      ),
      runQuery(
        `SELECT agency_id, COUNT(*)::int AS total FROM operations WHERE agency_id IN (${idList}) GROUP BY agency_id`
      ),
      runQuery(
        `SELECT o.agency_id, COUNT(DISTINCT o.id)::int AS total
         FROM operations o
         JOIN payments p ON p.operation_id = o.id
         WHERE o.agency_id IN (${idList})
         GROUP BY o.agency_id`
      ),
    ])

    for (const row of leadsRows) {
      leadsMap.set(row.agency_id, Number(row.total) || 0)
    }
    for (const row of customersRows) {
      customersMap.set(row.agency_id, Number(row.total) || 0)
    }
    for (const row of operatorsRows) {
      operatorsMap.set(row.agency_id, Number(row.total) || 0)
    }
    for (const row of operationsRows) {
      operationsMap.set(row.agency_id, Number(row.total) || 0)
    }
    for (const row of paymentsRows) {
      paymentsMap.set(row.agency_id, Number(row.total) || 0)
    }
  } catch (error) {
    // Fallback: counts por agencia (más lento, pero seguro)
    for (const agencyId of safeIds) {
      const [leadsRes, customersRes, operatorsRes, operationsRes, paymentsRes] = await Promise.all([
        supabase.from("leads").select("id", { count: "exact", head: true }).eq("agency_id", agencyId),
        supabase.from("customers").select("id", { count: "exact", head: true }).eq("agency_id", agencyId),
        supabase.from("operators").select("id", { count: "exact", head: true }).eq("agency_id", agencyId),
        supabase.from("operations").select("id", { count: "exact", head: true }).eq("agency_id", agencyId),
        supabase
          .from("payments")
          .select("id, operations!inner(agency_id)", { count: "exact", head: true })
          .eq("operations.agency_id", agencyId),
      ])
      leadsMap.set(agencyId, leadsRes.count || 0)
      customersMap.set(agencyId, customersRes.count || 0)
      operatorsMap.set(agencyId, operatorsRes.count || 0)
      operationsMap.set(agencyId, operationsRes.count || 0)
      paymentsMap.set(agencyId, paymentsRes.count || 0)
    }
  }

  return { leadsMap, customersMap, operatorsMap, operationsMap, paymentsMap }
}

export async function POST(request: Request) {
  try {
    const isAdmin = await ensureAdmin()
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const pairs = Array.isArray(body?.pairs) ? (body.pairs as Pair[]) : []

    const sanitizedPairs = pairs.filter(
      (pair) => isUuid(pair.user_id) && isUuid(pair.agency_id)
    )

    const agencyIds = Array.from(new Set(sanitizedPairs.map((p) => p.agency_id)))
    const userIds = Array.from(new Set(sanitizedPairs.map((p) => p.user_id)))

    if (agencyIds.length === 0 || userIds.length === 0) {
      return NextResponse.json({ statuses: {} })
    }

    const supabase = createAdminSupabaseClient()

    const [subsRes, eventsRes, controlsRes, counts] = await Promise.all([
      (supabase.from("subscriptions") as any)
        .select(`id, agency_id, status, trial_end, created_at, plan:subscription_plans(name, features)`)
        .in("agency_id", agencyIds)
        .order("created_at", { ascending: false }),
      (supabase.from("onboarding_events") as any)
        .select("user_id, agency_id, event_type")
        .in("user_id", userIds)
        .in("agency_id", agencyIds),
      (supabase.from("onboarding_controls") as any)
        .select("user_id, agency_id, mode")
        .in("user_id", userIds)
        .in("agency_id", agencyIds),
      fetchGroupedCounts(supabase, agencyIds),
    ])

    const subscriptions = Array.isArray(subsRes.data) ? subsRes.data : []
    const events = Array.isArray(eventsRes.data) ? eventsRes.data : []
    const controls = Array.isArray(controlsRes.data) ? controlsRes.data : []

    const subsByAgency = new Map<string, any[]>()
    for (const sub of subscriptions) {
      if (!sub?.agency_id) continue
      const existing = subsByAgency.get(sub.agency_id) || []
      existing.push(sub)
      subsByAgency.set(sub.agency_id, existing)
    }

    const planFeaturesByAgency = new Map<string, Record<string, boolean>>()
    const now = new Date()

    subsByAgency.forEach((subs, agencyId) => {
      const subscription =
        subs.find((s: any) => s.plan?.name === "TESTER") ||
        subs.find((s: any) => s.status === "ACTIVE") ||
        subs.find((s: any) => {
          if (s.status !== "TRIAL") return false
          if (!s.trial_end) return true
          return new Date(s.trial_end) >= now
        }) ||
        subs[0] ||
        null

      let planFeatures: Record<string, boolean> = {}
      if (subscription?.plan?.features) {
        if (typeof subscription.plan.features === "string") {
          try {
            planFeatures = JSON.parse(subscription.plan.features)
          } catch {
            planFeatures = {}
          }
        } else {
          planFeatures = subscription.plan.features as Record<string, boolean>
        }
      }

      planFeaturesByAgency.set(agencyId, planFeatures)
    })

    const eventsByPair = new Map<string, Set<string>>()
    for (const event of events) {
      if (!event?.user_id || !event?.agency_id || !event?.event_type) continue
      if (!ONBOARDING_EVENT_SET.has(event.event_type)) continue
      const key = `${event.user_id}:${event.agency_id}`
      const existing = eventsByPair.get(key) || new Set<string>()
      existing.add(event.event_type)
      eventsByPair.set(key, existing)
    }

    const controlByPair = new Map<string, string>()
    for (const control of controls) {
      if (!control?.user_id || !control?.agency_id) continue
      controlByPair.set(`${control.user_id}:${control.agency_id}`, control.mode)
    }

    const statuses: Record<string, any> = {}

    for (const pair of sanitizedPairs) {
      const key = `${pair.user_id}:${pair.agency_id}`
      const eventsSet = eventsByPair.get(key) || new Set<string>()
      const mode = controlByPair.get(key) || "AUTO"
      const planFeatures = planFeaturesByAgency.get(pair.agency_id) || {}

      const completionMap: Record<string, boolean> = {
        lead: (counts.leadsMap.get(pair.agency_id) || 0) > 0,
        customer: (counts.customersMap.get(pair.agency_id) || 0) > 0,
        wholesaler: (counts.operatorsMap.get(pair.agency_id) || 0) > 0,
        operation: (counts.operationsMap.get(pair.agency_id) || 0) > 0,
        payment: (counts.paymentsMap.get(pair.agency_id) || 0) > 0,
        finance: eventsSet.has("visited_finances"),
      }

      const steps = ONBOARDING_STEPS.filter((step) => {
        if (!step.feature) return true
        return planFeatures?.[step.feature] === true
      }).map((step) => ({
        ...step,
        completed: completionMap[step.id] === true,
      }))

      const currentStep = steps.find((s) => !s.completed) || null
      const completedCount = steps.filter((s) => s.completed).length
      const totalCount = steps.length
      const completed = totalCount > 0 && completedCount === totalCount
      const skipped = eventsSet.has("skipped_onboarding")

      let status: "COMPLETED" | "SKIPPED" | "IN_PROGRESS" | "NOT_AVAILABLE" = "IN_PROGRESS"
      if (totalCount === 0) status = "NOT_AVAILABLE"
      else if (completed) status = "COMPLETED"
      else if (skipped) status = "SKIPPED"

      statuses[key] = {
        status,
        mode,
        currentStepTitle: currentStep?.title || null,
        currentStepId: currentStep?.id || null,
        completedCount,
        totalCount,
      }
    }

    return NextResponse.json({ statuses })
  } catch (error: any) {
    console.error("Error in POST /api/admin/onboarding/status:", error)
    return NextResponse.json({ error: "Error al obtener onboarding" }, { status: 500 })
  }
}
