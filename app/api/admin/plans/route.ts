import { NextResponse } from "next/server"
import { createAdminSupabaseClient } from "@/lib/supabase/admin"

/**
 * GET /api/admin/plans
 * Obtiene todos los planes (incluyendo TESTER y otros no públicos)
 * Query params: ids - lista de IDs separados por coma para filtrar
 */
export async function GET(request: Request) {
  try {
    // El middleware ya verifica que viene del subdominio admin
    const supabase = createAdminSupabaseClient()
    const { searchParams } = new URL(request.url)
    const idsParam = searchParams.get("ids")

    let query = supabase.from("subscription_plans").select("*")

    // Si se proporcionan IDs específicos, filtrar por esos
    if (idsParam) {
      const ids = idsParam.split(",").filter(Boolean)
      if (ids.length > 0) {
        query = query.in("id", ids)
      } else {
        return NextResponse.json({ plans: [] })
      }
    } else {
      // Obtener todos los planes activos (incluyendo no públicos)
      query = query.eq("is_active", true)
    }

    query = query.order("sort_order", { ascending: true })

    const { data: plans, error } = await query

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
