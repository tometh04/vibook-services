import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/auth"
import { markPaymentAsPaid } from "@/lib/accounting/mark-payment-paid"
import { canPerformAction } from "@/lib/permissions-api"

/**
 * POST /api/payments/fix-missing-movements
 * Endpoint para corregir pagos que están marcados como PAID pero no tienen movimientos contables
 * Útil para corregir pagos creados antes de que se implementara la lógica completa
 */
export async function POST(request: Request) {
  try {
    const { user } = await getCurrentUser()
    const supabase = await createServerClient()

    // Verificar permisos
    if (!canPerformAction(user, "accounting", "write")) {
      return NextResponse.json({ error: "No tiene permiso para esta acción" }, { status: 403 })
    }

    // Buscar pagos que están PAID pero no tienen ledger_movement_id
    const { data: paymentsWithoutMovements, error: paymentsError } = await (supabase.from("payments") as any)
      .select("id, operation_id, amount, currency, direction, payer_type, method, date_paid, reference, account_id, status")
      .eq("status", "PAID")
      .is("ledger_movement_id", null)

    if (paymentsError) {
      console.error("Error buscando pagos sin movimientos:", paymentsError)
      return NextResponse.json({ error: "Error al buscar pagos" }, { status: 500 })
    }

    if (!paymentsWithoutMovements || paymentsWithoutMovements.length === 0) {
      return NextResponse.json({ 
        message: "No hay pagos sin movimientos contables",
        fixed: 0,
        total: 0
      })
    }

    const results = {
      fixed: 0,
      errors: 0,
      errorDetails: [] as string[],
      total: paymentsWithoutMovements.length
    }

    // Procesar cada pago
    for (const payment of paymentsWithoutMovements) {
      try {
        // Verificar que tenga account_id
        if (!payment.account_id) {
          results.errors++
          results.errorDetails.push(`Pago ${payment.id}: No tiene account_id`)
          continue
        }

        // Llamar a markPaymentAsPaid para crear los movimientos
        await markPaymentAsPaid({
          paymentId: payment.id,
          datePaid: payment.date_paid || new Date().toISOString().split("T")[0],
          reference: payment.reference || null,
          userId: user.id,
          supabase,
        })

        results.fixed++
        console.log(`✅ Corregido pago ${payment.id}`)
      } catch (error: any) {
        results.errors++
        results.errorDetails.push(`Pago ${payment.id}: ${error.message}`)
        console.error(`❌ Error corrigiendo pago ${payment.id}:`, error)
      }
    }

    return NextResponse.json({
      message: `Procesados ${results.total} pagos. ${results.fixed} corregidos, ${results.errors} con errores`,
      ...results
    })
  } catch (error: any) {
    console.error("Error in POST /api/payments/fix-missing-movements:", error)
    return NextResponse.json({ error: "Error al corregir pagos" }, { status: 500 })
  }
}
