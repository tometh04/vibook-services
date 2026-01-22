import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/auth"
import { markPaymentAsPaid } from "@/lib/accounting/mark-payment-paid"

export async function POST(request: Request) {
  try {
    const { user } = await getCurrentUser()
    const supabase = await createServerClient()
    const body = await request.json()
    const { paymentId, datePaid, reference } = body

    if (!paymentId || !datePaid) {
      return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 })
    }

    // Usar la función compartida para marcar el pago como pagado
    const result = await markPaymentAsPaid({
      paymentId,
      datePaid,
      reference,
      userId: user.id,
      supabase,
    })

    return NextResponse.json({ success: true, ledger_movement_id: result.ledger_movement_id })
  } catch (error: any) {
    console.error("Error en mark-paid:", error)
    return NextResponse.json(
      { error: error.message || "Error al actualizar" },
      { status: 500 }
    )
  }
}

