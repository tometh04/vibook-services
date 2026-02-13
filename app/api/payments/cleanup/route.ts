import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/auth"
import { verifySubscriptionAccess } from "@/lib/billing/subscription-middleware"

export async function DELETE(request: Request) {
  try {
    const { user } = await getCurrentUser()
    // Verificar suscripción activa para operaciones de escritura
    const subCheck = await verifySubscriptionAccess(user.id, user.role)
    if (!subCheck.hasAccess) {
      return NextResponse.json({ error: subCheck.message || "Suscripción no activa" }, { status: 403 })
    }
    const supabase = await createServerClient()
    const { searchParams } = new URL(request.url)
    
    const operationId = searchParams.get("operationId")

    if (!operationId) {
      return NextResponse.json({ error: "operationId es requerido" }, { status: 400 })
    }

    // Eliminar pagos PENDING (los auto-generados que nunca se pagaron)
    const { error: paymentsError, count: deletedPayments } = await supabase
      .from("payments")
      .delete()
      .eq("operation_id", operationId)
      .eq("status", "PENDING")

    if (paymentsError) {
      console.error("Error deleting payments:", paymentsError)
      return NextResponse.json({ error: "Error al eliminar pagos" }, { status: 500 })
    }

    // También eliminar alertas auto-generadas de esta operación
    const { error: alertsError, count: deletedAlerts } = await supabase
      .from("alerts")
      .delete()
      .eq("operation_id", operationId)
      .in("type", ["PAYMENT_DUE", "UPCOMING_TRIP"])

    if (alertsError) {
      console.error("Error deleting alerts:", alertsError)
      // No fallar si las alertas no se pueden eliminar
    }

    console.log(`✅ Limpieza completada: ${deletedPayments || 0} pagos, ${deletedAlerts || 0} alertas`)

    return NextResponse.json({ 
      success: true, 
      deletedPayments: deletedPayments || 0,
      deletedAlerts: deletedAlerts || 0 
    })
  } catch (error) {
    console.error("Error in DELETE /api/payments/cleanup:", error)
    return NextResponse.json({ error: "Error al limpiar pagos" }, { status: 500 })
  }
}

