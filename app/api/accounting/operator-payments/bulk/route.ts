import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/auth"
import { createLedgerMovement, calculateARSEquivalent } from "@/lib/accounting/ledger"

/**
 * POST /api/accounting/operator-payments/bulk
 * Procesa un pago masivo a un operador
 */
export async function POST(request: Request) {
  try {
    const { user } = await getCurrentUser()
    const supabase = await createServerClient()
    const body = await request.json()

    const {
      operator_id,
      debt_currency,      // Moneda de las deudas (USD o ARS)
      payment_currency,   // Moneda del pago (USD o ARS)
      exchange_rate,      // Tipo de cambio (si difieren las monedas)
      receipt_number,
      payment_date,
      notes,
      payments,           // Array de { operator_payment_id, operation_id, amount }
    } = body

    // Validaciones
    if (!operator_id) {
      return NextResponse.json({ error: "operator_id es requerido" }, { status: 400 })
    }

    if (!payments || !Array.isArray(payments) || payments.length === 0) {
      return NextResponse.json({ error: "Se requiere al menos un pago" }, { status: 400 })
    }

    if (!payment_date) {
      return NextResponse.json({ error: "La fecha de pago es requerida" }, { status: 400 })
    }

    // Si las monedas son diferentes, el tipo de cambio es obligatorio
    if (debt_currency !== payment_currency && (!exchange_rate || exchange_rate <= 0)) {
      return NextResponse.json({ error: "El tipo de cambio es obligatorio cuando las monedas difieren" }, { status: 400 })
    }

    // Verificar que el operador existe
    const { data: operator, error: operatorError } = await supabase
      .from("operators")
      .select("id, name")
      .eq("id", operator_id)
      .single()

    if (operatorError || !operator) {
      return NextResponse.json({ error: "Operador no encontrado" }, { status: 404 })
    }

    // Calcular total
    const totalDebtAmount = payments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0)
    
    // Calcular monto en la moneda de pago
    let totalPaymentAmount = totalDebtAmount
    if (debt_currency !== payment_currency && exchange_rate) {
      if (debt_currency === "USD" && payment_currency === "ARS") {
        totalPaymentAmount = totalDebtAmount * exchange_rate
      } else if (debt_currency === "ARS" && payment_currency === "USD") {
        totalPaymentAmount = totalDebtAmount / exchange_rate
      }
    }

    // Calcular amount_usd para registros
    let amountUsd = totalDebtAmount
    if (debt_currency === "ARS" && exchange_rate && exchange_rate > 0) {
      amountUsd = totalDebtAmount / exchange_rate
    }

    const results: any[] = []
    const errors: string[] = []

    // Procesar cada pago individualmente
    for (const payment of payments) {
      try {
        const { operator_payment_id, operation_id, amount } = payment

        if (!operator_payment_id || !amount || amount <= 0) {
          errors.push(`Pago inválido: ${operator_payment_id}`)
          continue
        }

        // Obtener el operator_payment actual
        const { data: opPayment, error: opError } = await (supabase.from("operator_payments") as any)
          .select("*")
          .eq("id", operator_payment_id)
          .single()

        if (opError || !opPayment) {
          errors.push(`Pago a operador no encontrado: ${operator_payment_id}`)
          continue
        }

        const currentPaidAmount = parseFloat(opPayment.paid_amount || 0)
        const totalAmount = parseFloat(opPayment.amount || 0)
        const newPaidAmount = currentPaidAmount + amount

        // Validar que no se pague más de lo pendiente
        if (newPaidAmount > totalAmount) {
          errors.push(`El monto excede el pendiente para: ${operator_payment_id}`)
          continue
        }

        // Determinar nuevo estado
        const newStatus = newPaidAmount >= totalAmount ? "PAID" : "PENDING"

        // Actualizar operator_payment
        const { error: updateError } = await (supabase.from("operator_payments") as any)
          .update({
            paid_amount: newPaidAmount,
            status: newStatus,
            paid_at: newStatus === "PAID" ? payment_date : null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", operator_payment_id)

        if (updateError) {
          errors.push(`Error actualizando pago: ${operator_payment_id}`)
          continue
        }

        // Calcular amount_usd para este pago específico
        let paymentAmountUsd = amount
        if (debt_currency === "ARS" && exchange_rate && exchange_rate > 0) {
          paymentAmountUsd = amount / exchange_rate
        }

        // Crear registro en payments (tabla general de pagos)
        const paymentRecord = {
          operation_id,
          payer_type: "OPERATOR",
          direction: "EXPENSE",
          method: "Transferencia",
          amount: amount,
          currency: debt_currency,
          exchange_rate: debt_currency === "ARS" ? exchange_rate : null,
          amount_usd: paymentAmountUsd,
          date_paid: payment_date,
          date_due: opPayment.due_date,
          status: "PAID",
          reference: receipt_number ? `Comprobante: ${receipt_number}` : notes || null,
        }

        const { data: newPayment, error: paymentError } = await (supabase.from("payments") as any)
          .insert(paymentRecord)
          .select()
          .single()

        if (paymentError) {
          console.error("Error creating payment record:", paymentError)
          // No fallamos, el operator_payment ya se actualizó
        }

        // Crear movimiento contable (ledger_movement)
        try {
          // Obtener datos de la operación
          const { data: operation } = await supabase
            .from("operations")
            .select("seller_id, agency_id")
            .eq("id", operation_id)
            .single()

          // Calcular ARS equivalent
          const amountARS = calculateARSEquivalent(
            amount,
            debt_currency as "ARS" | "USD",
            debt_currency === "USD" ? exchange_rate : null
          )

          // Obtener cuenta de costos de operadores
          const { data: costosChart } = await (supabase.from("chart_of_accounts") as any)
            .select("id")
            .eq("account_code", "4.2.01")
            .eq("is_active", true)
            .maybeSingle()

          let accountId: string | null = null
          if (costosChart) {
            const { data: costosAccount } = await (supabase.from("financial_accounts") as any)
              .select("id")
              .eq("chart_account_id", costosChart.id)
              .eq("is_active", true)
              .maybeSingle()
            accountId = costosAccount?.id || null
          }

          if (accountId) {
            await createLedgerMovement(
              {
                operation_id,
                lead_id: null,
                type: "OPERATOR_PAYMENT",
                concept: `Pago masivo a ${(operator as any).name} - Op ${operation_id.slice(0, 8)}`,
                currency: debt_currency as "ARS" | "USD",
                amount_original: amount,
                exchange_rate: debt_currency === "USD" ? exchange_rate : null,
                amount_ars_equivalent: amountARS,
                method: "BANK",
                account_id: accountId,
                seller_id: (operation as any)?.seller_id || null,
                operator_id: operator_id,
                receipt_number: receipt_number || null,
                notes: notes || null,
                created_by: user.id,
              },
              supabase
            )
          }

          // Crear movimiento de caja
          const { data: defaultCashBox } = await supabase
            .from("cash_boxes")
            .select("id")
            .eq("currency", payment_currency)
            .eq("is_default", true)
            .eq("is_active", true)
            .maybeSingle()

          // Calcular monto en moneda de pago para este item
          let itemPaymentAmount = amount
          if (debt_currency !== payment_currency && exchange_rate) {
            if (debt_currency === "USD" && payment_currency === "ARS") {
              itemPaymentAmount = amount * exchange_rate
            } else {
              itemPaymentAmount = amount / exchange_rate
            }
          }

          const cashMovementData = {
            operation_id,
            cash_box_id: (defaultCashBox as any)?.id || null,
            user_id: user.id,
            type: "EXPENSE",
            category: "OPERATOR_PAYMENT",
            amount: itemPaymentAmount,
            currency: payment_currency,
            movement_date: payment_date,
            notes: `Pago masivo a ${(operator as any).name}${receipt_number ? ` - Comp: ${receipt_number}` : ""}`,
            is_touristic: true,
            payment_id: newPayment?.id || null,
          }

          await (supabase.from("cash_movements") as any).insert(cashMovementData)

        } catch (ledgerError) {
          console.error("Error creating ledger/cash movement:", ledgerError)
          // No fallamos, el pago ya se procesó
        }

        results.push({
          operator_payment_id,
          operation_id,
          amount,
          status: "success",
        })

      } catch (paymentError) {
        console.error("Error processing payment:", paymentError)
        errors.push(`Error procesando pago: ${payment.operator_payment_id}`)
      }
    }

    console.log(`✅ Pago masivo procesado: ${results.length} exitosos, ${errors.length} errores`)

    return NextResponse.json({
      success: true,
      message: `${results.length} pago(s) procesado(s) correctamente`,
      results,
      errors: errors.length > 0 ? errors : undefined,
      summary: {
        operator: (operator as any).name,
        total_debt_amount: totalDebtAmount,
        debt_currency,
        total_payment_amount: totalPaymentAmount,
        payment_currency,
        exchange_rate: exchange_rate || null,
        payments_count: results.length,
      },
    })

  } catch (error) {
    console.error("Error in POST /api/accounting/operator-payments/bulk:", error)
    return NextResponse.json({ error: "Error al procesar pago masivo" }, { status: 500 })
  }
}
