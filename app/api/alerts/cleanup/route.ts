import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/auth"
import { canPerformAction } from "@/lib/permissions-api"

export async function DELETE(request: Request) {
  try {
    const { user } = await getCurrentUser()

    // Verificar permisos de escritura en operaciones
    if (!canPerformAction(user, "operations", "write")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }

    const supabase = await createServerClient()
    const { searchParams } = new URL(request.url)

    const operationId = searchParams.get("operationId")

    if (!operationId) {
      return NextResponse.json({ error: "operationId es requerido" }, { status: 400 })
    }

    // Eliminar todas las alertas de esta operación
    const { error, count } = await supabase
      .from("alerts")
      .delete()
      .eq("operation_id", operationId)

    if (error) {
      console.error("Error deleting alerts:", error)
      return NextResponse.json({ error: "Error al eliminar alertas" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      deletedAlerts: count || 0
    })
  } catch (error) {
    console.error("Error in DELETE /api/alerts/cleanup:", error)
    return NextResponse.json({ error: "Error al limpiar alertas" }, { status: 500 })
  }
}
