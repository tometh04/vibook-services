import { NextResponse } from "next/server"
import { createAdminSupabaseClient } from "@/lib/supabase/admin"

export async function POST() {
  try {
    const supabase = createAdminSupabaseClient()

    // Ejecutar todas las verificaciones de integridad
    const { data, error } = await supabase.rpc('run_all_integrity_checks')

    if (error) {
      console.error("Error running integrity checks:", error)
      return NextResponse.json(
        { error: error.message || "Error al ejecutar verificaciones" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      results: data,
      message: "Verificaciones ejecutadas correctamente"
    })
  } catch (error: any) {
    console.error("Error in POST /api/admin/security/run-integrity-check:", error)
    return NextResponse.json(
      { error: error.message || "Error al ejecutar verificaciones" },
      { status: 500 }
    )
  }
}
