/**
 * POST /api/admin/fix-duplicate-ledger
 * Limpia movimientos ledger duplicados para una operación específica
 * Y recrea el pago correctamente sin duplicados
 *
 * TEMPORAL: eliminar después de usar
 */
import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/auth"

export async function POST(request: Request) {
  try {
    const { user } = await getCurrentUser()
    const supabase = await createServerClient()

    // ADMIN o SUPER_ADMIN pueden usar esto
    if (user.role !== "SUPER_ADMIN" && user.role !== "ADMIN" && user.role !== "OWNER") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }

    const { operationId, paymentId, action } = await request.json()

    if (action === "list") {
      // Listar todos los ledger_movements para una operación
      const { data: movements, error } = await (supabase.from("ledger_movements") as any)
        .select("*")
        .eq("operation_id", operationId)
        .order("created_at", { ascending: true })

      // Listar cash_movements
      const { data: cashMovements } = await (supabase.from("cash_movements") as any)
        .select("*")
        .eq("operation_id", operationId)

      return NextResponse.json({ movements, cashMovements })
    }

    if (action === "delete-movement") {
      const { movementId } = await request.json()
      const { error } = await (supabase.from("ledger_movements") as any)
        .delete()
        .eq("id", movementId)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      return NextResponse.json({ success: true, deleted: movementId })
    }

    if (action === "cleanup-and-recreate") {
      // 1. Eliminar TODOS los ledger_movements de la operación
      const { data: deletedLedger, error: ledgerError } = await (supabase.from("ledger_movements") as any)
        .delete()
        .eq("operation_id", operationId)
        .select("id")

      // 2. Eliminar cash_movements de la operación
      const { data: deletedCash, error: cashError } = await (supabase.from("cash_movements") as any)
        .delete()
        .eq("operation_id", operationId)
        .select("id")

      // 3. Eliminar el pago
      if (paymentId) {
        await (supabase.from("payments") as any)
          .delete()
          .eq("id", paymentId)
      }

      return NextResponse.json({
        success: true,
        deletedLedgerCount: deletedLedger?.length || 0,
        deletedCashCount: deletedCash?.length || 0,
        deletedPayment: paymentId || null,
        message: "Limpieza completa. Ahora podés recrear el pago desde la UI."
      })
    }

    return NextResponse.json({ error: "action requerida: list | delete-movement | cleanup-and-recreate" }, { status: 400 })
  } catch (error: any) {
    console.error("Error in fix-duplicate-ledger:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
