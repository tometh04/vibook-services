import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/auth"

export const dynamic = 'force-dynamic'

/**
 * DEBUG ENDPOINT - Muestra datos del usuario actual para debuggear problemas de aislamiento
 * ELIMINAR EN PRODUCCIÓN
 */
export async function GET() {
  try {
    const { user } = await getCurrentUser()
    const supabase = await createServerClient()
    
    // 1. Obtener agencias del usuario
    const { data: userAgencies } = await supabase
      .from("user_agencies")
      .select("agency_id, agencies(id, name)")
      .eq("user_id", user.id)
    
    const agencyIds = (userAgencies || []).map((ua: any) => ua.agency_id)
    const agencyNames = (userAgencies || []).map((ua: any) => ua.agencies?.name)
    
    // 2. Obtener usuarios en las mismas agencias
    let usersInAgencies: any[] = []
    if (agencyIds.length > 0) {
      const { data: agencyUsers } = await supabase
        .from("user_agencies")
        .select("user_id, agency_id, users:user_id(id, name, email, role)")
        .in("agency_id", agencyIds)
      
      usersInAgencies = (agencyUsers || []).map((au: any) => ({
        user_id: au.user_id,
        agency_id: au.agency_id,
        name: au.users?.name,
        email: au.users?.email,
        role: au.users?.role,
      }))
    }
    
    // 3. Obtener suscripciones de las agencias
    let subscriptions: any[] = []
    if (agencyIds.length > 0) {
      const { data: subs } = await (supabase.from("subscriptions") as any)
        .select("*, plan:subscription_plans(name, features)")
        .in("agency_id", agencyIds)
      
      subscriptions = (subs || []).map((s: any) => ({
        id: s.id,
        agency_id: s.agency_id,
        status: s.status,
        plan_name: s.plan?.name,
        plan_features: s.plan?.features,
      }))
    }
    
    return NextResponse.json({
      currentUser: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
      },
      myAgencies: {
        ids: agencyIds,
        names: agencyNames,
      },
      usersInMyAgencies: usersInAgencies,
      subscriptionsInMyAgencies: subscriptions,
      summary: {
        totalAgencies: agencyIds.length,
        totalUsersInAgencies: usersInAgencies.length,
        totalSubscriptions: subscriptions.length,
        hasActiveSubscription: subscriptions.some(s => s.status === 'ACTIVE' || s.status === 'TRIAL'),
      }
    })
  } catch (error: any) {
    console.error("Debug endpoint error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
