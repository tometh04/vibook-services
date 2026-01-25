/**
 * Crear movimiento en cuenta financiera para un pago
 * Esta función se llama para TODOS los pagos (PENDING o PAID) para actualizar el saldo de la cuenta
 */

import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"
import { createLedgerMovement, calculateARSEquivalent } from "@/lib/accounting/ledger"
import { getExchangeRate, getLatestExchangeRate } from "@/lib/accounting/exchange-rates"

interface CreateFinancialAccountMovementParams {
  paymentId: string
  accountId: string
  amount: number
  currency: "ARS" | "USD"
  direction: "INCOME" | "EXPENSE"
  operationId?: string | null
  datePaid?: string
  reference?: string | null
  method?: string
  userId: string
  supabase: SupabaseClient<Database>
}

export async function createFinancialAccountMovement({
  paymentId,
  accountId,
  amount,
  currency,
  direction,
  operationId,
  datePaid,
  reference,
  method,
  userId,
  supabase,
}: CreateFinancialAccountMovementParams): Promise<void> {
  // Verificar que la cuenta financiera existe
  const { data: financialAccount, error: accountError } = await (supabase.from("financial_accounts") as any)
    .select("id, name, is_active")
    .eq("id", accountId)
    .single()

  if (accountError || !financialAccount) {
    throw new Error(`Cuenta financiera ${accountId} no encontrada`)
  }

  if (!financialAccount.is_active) {
    throw new Error(`La cuenta financiera ${financialAccount.name} no está activa`)
  }

  // Calcular exchange rate si es USD
  let exchangeRate: number | null = null
  if (currency === "USD") {
    const rateDate = datePaid ? new Date(datePaid) : new Date()
    exchangeRate = await getExchangeRate(supabase, rateDate)
    
    if (!exchangeRate) {
      const { getLatestExchangeRate } = await import("@/lib/accounting/exchange-rates")
      exchangeRate = await getLatestExchangeRate(supabase)
    }
    
    if (!exchangeRate) {
      console.warn(`No exchange rate found, using fallback 1000`)
      exchangeRate = 1000
    }
  }

  const amountARS = calculateARSEquivalent(amount, currency, exchangeRate)

  // Mapear method del payment a ledger method
  const methodMap: Record<string, "CASH" | "BANK" | "MP" | "USD" | "OTHER"> = {
    "Efectivo": "CASH",
    "Transferencia": "BANK",
    "Mercado Pago": "MP",
    "MercadoPago": "MP",
    "MP": "MP",
    "USD": "USD",
  }
  const ledgerMethod = method 
    ? (methodMap[method] || "OTHER")
    : "BANK"

  // Obtener seller_id y operator_id de la operación si existe
  let sellerId: string | null = null
  let operatorId: string | null = null
  
  if (operationId) {
    try {
      const { data: operation } = await (supabase.from("operations") as any)
        .select("seller_id, operator_id")
        .eq("id", operationId)
        .maybeSingle()
      
      if (operation) {
        sellerId = (operation as any).seller_id || null
        operatorId = (operation as any).operator_id || null
      }
    } catch (error) {
      console.error("Error fetching operation:", error)
    }
  }

  // Crear movimiento en la cuenta financiera
  await createLedgerMovement(
    {
      operation_id: operationId || null,
      lead_id: null,
      type: direction === "INCOME" ? "INCOME" : "EXPENSE",
      concept: direction === "INCOME"
        ? `Ingreso en ${currency}${operationId ? ` - Operación ${operationId.slice(0, 8)}` : ""}`
        : `Egreso en ${currency}${operationId ? ` - Operación ${operationId.slice(0, 8)}` : ""}`,
      currency,
      amount_original: amount,
      exchange_rate: currency === "USD" ? exchangeRate : null,
      amount_ars_equivalent: amountARS,
      method: ledgerMethod,
      account_id: accountId,
      seller_id: sellerId,
      operator_id: operatorId,
      receipt_number: reference || null,
      notes: `Movimiento en cuenta financiera: ${reference || ""}`,
      created_by: userId,
    },
    supabase
  )

  console.log(`✅ Movimiento creado en cuenta financiera ${accountId} (${financialAccount.name}) para pago ${paymentId} - ${direction === "INCOME" ? "Ingreso" : "Egreso"}: ${amount} ${currency}`)
}
