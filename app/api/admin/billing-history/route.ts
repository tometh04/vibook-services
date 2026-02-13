import { NextResponse } from "next/server"
import { createAdminSupabaseClient } from "@/lib/supabase/admin"
import { verifyAdminAuth } from "@/lib/admin/verify-admin-auth"

/**
 * GET /api/admin/billing-history
 * Obtiene el historial de pagos y eventos de billing de una agencia
 */
export async function GET(request: Request) {
  try {
    // CRÍTICO: Verificar autenticación admin directamente
    const adminAuth = await verifyAdminAuth(request)
    if (!adminAuth.valid) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const agencyId = searchParams.get("agencyId")

    const supabase = createAdminSupabaseClient()

    if (agencyId) {
      // Historial de una agencia específica
      const { data: events, error } = await supabase
        .from("billing_events")
        .select(`
          *,
          subscription:subscriptions(
            id,
            status,
            plan:subscription_plans(name, display_name)
          )
        `)
        .eq("agency_id", agencyId)
        .order("created_at", { ascending: false })
        .limit(100)

      if (error) {
        console.error("Error fetching billing history:", error)
        return NextResponse.json(
          { error: "Error al obtener historial" },
          { status: 500 }
        )
      }

      return NextResponse.json({ events: events || [] })
    } else {
      // Historial de todas las agencias (últimos 100 eventos)
      const { data: events, error } = await supabase
        .from("billing_events")
        .select(`
          *,
          agency:agencies(id, name),
          subscription:subscriptions(
            id,
            status,
            plan:subscription_plans(name, display_name)
          )
        `)
        .order("created_at", { ascending: false })
        .limit(100)

      if (error) {
        console.error("Error fetching billing history:", error)
        return NextResponse.json(
          { error: "Error al obtener historial" },
          { status: 500 }
        )
      }

      return NextResponse.json({ events: events || [] })
    }
  } catch (error: any) {
    console.error("Error in GET /api/admin/billing-history:", error)
    return NextResponse.json(
      { error: error.message || "Error al obtener historial" },
      { status: 500 }
    )
  }
}
