import { NextResponse } from "next/server"
import { createAdminSupabaseClient } from "@/lib/supabase/admin"

/**
 * GET /api/admin/plans
 * Obtiene todos los planes (incluyendo TESTER y otros no públicos)
 */
export async function GET() {
  try {
    // El middleware ya verifica que viene del subdominio admin
    const supabase = createAdminSupabaseClient()

    // Obtener todos los planes activos (incluyendo no públicos)
    const { data: plans, error } = await supabase
      .from("subscription_plans")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })

    if (error) {
      console.error("Error fetching plans:", error)
      return NextResponse.json(
        { error: "Error al obtener los planes" },
        { status: 500 }
      )
    }

    return NextResponse.json({ plans: plans || [] })
  } catch (error: any) {
    console.error("Error in GET /api/admin/plans:", error)
    return NextResponse.json(
      { error: error.message || "Error al obtener los planes" },
      { status: 500 }
    )
  }
}
