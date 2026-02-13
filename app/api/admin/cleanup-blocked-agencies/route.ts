import { NextResponse } from "next/server"
import { createAdminSupabaseClient } from "@/lib/supabase/admin"
import { verifyAdminAuth } from "@/lib/admin/verify-admin-auth"

/**
 * POST /api/admin/cleanup-blocked-agencies
 * Ejecuta limpieza de datos de agencias bloqueadas por más de 30 días
 * Solo accesible desde admin subdomain
 */
export async function POST(request: Request) {
  try {
    // CRÍTICO: Verificar autenticación admin directamente
    const adminAuth = await verifyAdminAuth(request)
    if (!adminAuth.valid) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const supabase = createAdminSupabaseClient()

    // Ejecutar función de limpieza
    const { data, error } = await supabase.rpc('cleanup_blocked_agencies')

    if (error) {
      console.error("Error ejecutando cleanup:", error)
      return NextResponse.json(
        { error: "Error al ejecutar limpieza" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      summary: data
    })
  } catch (error: any) {
    console.error("Error in POST /api/admin/cleanup-blocked-agencies:", error)
    return NextResponse.json(
      { error: error.message || "Error al ejecutar limpieza" },
      { status: 500 }
    )
  }
}
