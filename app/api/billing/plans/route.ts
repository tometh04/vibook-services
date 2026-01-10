import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

export const runtime = 'nodejs'

export async function GET() {
  try {
    const supabase = await createServerClient()

    // Obtener todos los planes públicos y activos
    const { data: plans, error } = await supabase
      .from("subscription_plans")
      .select("*")
      .eq("is_public", true)
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
    console.error("Error in GET /api/billing/plans:", error)
    return NextResponse.json(
      { error: error.message || "Error al obtener los planes" },
      { status: 500 }
    )
  }
}
