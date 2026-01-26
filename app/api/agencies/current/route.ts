import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/auth"
import { getUserAgencyIds } from "@/lib/permissions-api"

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { user } = await getCurrentUser()
    const supabase = await createServerClient()
    
    const agencyIds = await getUserAgencyIds(supabase, user.id, user.role as any)
    
    if (agencyIds.length === 0) {
      return NextResponse.json(
        { error: "No tiene agencias asignadas" },
        { status: 404 }
      )
    }

    // Obtener la primera agencia (o la activa si hay lógica de agencia activa)
    const { data: agency, error } = await supabase
      .from("agencies")
      .select("id, name, has_used_trial")
      .eq("id", agencyIds[0])
      .single()

    if (error || !agency) {
      return NextResponse.json(
        { error: "Agencia no encontrada" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      id: agency.id,
      name: agency.name,
      has_used_trial: agency.has_used_trial || false
    })
  } catch (error: any) {
    console.error("Error in GET /api/agencies/current:", error)
    return NextResponse.json(
      { error: error.message || "Error al obtener agencia" },
      { status: 500 }
    )
  }
}
