/**
 * Crear movimiento en cuenta financiera para un pago
 * Esta función se llama para TODOS los pagos (PENDING o PAID) para actualizar el saldo de la cuenta
 */

import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"
import { createLedgerMovement, calculateARSEquivalent, validateAccountBalanceForExpense } from "@/lib/accounting/ledger"
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
  exchangeRate?: number | null // Tipo de cambio explícito (obligatorio si monedas no coinciden)
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
  exchangeRate: providedExchangeRate,
}: CreateFinancialAccountMovementParams): Promise<void> {
  // Verificar que la cuenta financiera existe
  const { data: financialAccount, error: accountError } = await (supabase.from("financial_accounts") as any)
    .select("id, name, is_active, currency")
    .eq("id", accountId)
    .single()

  if (accountError || !financialAccount) {
    throw new Error(`Cuenta financiera ${accountId} no encontrada`)
  }

  if (!financialAccount.is_active) {
    throw new Error(`La cuenta financiera ${financialAccount.name} no está activa`)
  }

  const accountCurrency = financialAccount.currency as "ARS" | "USD"

  // Validar moneda: si no coincide, requerir tipo de cambio explícito
  if (currency !== accountCurrency) {
    if (!providedExchangeRate || providedExchangeRate <= 0) {
      throw new Error(
        `La moneda del movimiento (${currency}) no coincide con la moneda de la cuenta (${accountCurrency}). ` +
        `Se requiere un tipo de cambio explícito para realizar la conversión.`
      )
    }
  }

  // Calcular exchange rate si es necesario
  // USD: NO necesita tipo de cambio (el sistema trabaja en USD)
  // ARS: SÍ necesita tipo de cambio (para convertir a USD)
  let exchangeRate: number | null = null
  
  if (currency === "ARS") {
    // Para ARS, el tipo de cambio es obligatorio (para convertir a USD)
    exchangeRate = providedExchangeRate ?? null
    if (!exchangeRate || exchangeRate <= 0) {
      // Si no viene proporcionado, intentar buscarlo (pero debería venir del frontend)
      const rateDate = datePaid ? new Date(datePaid) : new Date()
      exchangeRate = await getExchangeRate(supabase, rateDate)
      
      if (!exchangeRate) {
        const { getLatestExchangeRate } = await import("@/lib/accounting/exchange-rates")
        exchangeRate = await getLatestExchangeRate(supabase)
      }
      
      if (!exchangeRate || exchangeRate <= 0) {
        throw new Error("El tipo de cambio es obligatorio para movimientos en ARS")
      }
    }
  }
  // Para USD, exchangeRate = null (no se necesita tipo de cambio)

  // Validar saldo suficiente antes de permitir un egreso
  if (direction === "EXPENSE") {
    await validateAccountBalanceForExpense(accountId, amount, currency, supabase, exchangeRate)
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
