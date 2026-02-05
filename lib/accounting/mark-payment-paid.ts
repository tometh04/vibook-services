/**
 * Función compartida para marcar un pago como pagado y crear movimientos contables
 * Esta función puede ser llamada desde diferentes endpoints sin necesidad de HTTP
 */

import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"
import {
  createLedgerMovement,
  calculateARSEquivalent,
  getOrCreateDefaultAccount,
  validateAccountBalanceForExpense,
} from "@/lib/accounting/ledger"
import { autoCalculateFXForPayment } from "@/lib/accounting/fx"
import { markOperatorPaymentAsPaid } from "@/lib/accounting/operator-payments"
import { getExchangeRate } from "@/lib/accounting/exchange-rates"
import { createPaymentReceivedMessage } from "@/lib/whatsapp/whatsapp-service"

interface MarkPaymentPaidParams {
  paymentId: string
  datePaid: string
  reference?: string | null
  userId: string
  supabase: SupabaseClient<Database>
  paymentData?: any // Opcional: datos del pago si ya los tenemos (evita buscar de nuevo)
}

export async function markPaymentAsPaid({
  paymentId,
  datePaid,
  reference,
  userId,
  supabase,
  paymentData: providedPaymentData,
}: MarkPaymentPaidParams): Promise<{ ledger_movement_id: string }> {
  // Si ya tenemos los datos del pago, usarlos. Si no, buscarlos
  let paymentData: any
  let operation: any = null

  if (providedPaymentData) {
    // Usar los datos proporcionados (evita buscar de nuevo)
    paymentData = providedPaymentData
    operation = paymentData.operations || null
  } else {
    // Buscar el pago en la base de datos
    const paymentsSelect = supabase.from("payments") as any
    const { data: payment, error: paymentFetchError } = await paymentsSelect
      .select(`
        operation_id, 
        amount, 
        currency, 
        direction, 
        payer_type, 
        method,
        status,
        ledger_movement_id,
        account_id,
        operations:operation_id(
          id,
          agency_id,
          seller_id,
          seller_secondary_id,
          operator_id,
          sale_currency,
          operator_cost_currency
        )
      `)
      .eq("id", paymentId)
      .single()

    if (paymentFetchError || !payment) {
      console.error(`❌ Error buscando pago ${paymentId}:`, paymentFetchError)
      throw new Error(`Pago no encontrado (ID: ${paymentId}): ${paymentFetchError?.message || "Error desconocido"}`)
    }

    paymentData = payment as any
    operation = paymentData.operations || null
  }

  const operationAgencyId = operation?.agency_id || null
  const withAgencyFilter = (query: any) => {
    return operationAgencyId ? query.eq("agency_id", operationAgencyId) : query
  }

  // Declarar paymentsTable aquí para poder usarlo más abajo
  const paymentsTable = supabase.from("payments") as any

  // Verificar que el pago tenga account_id (obligatorio)
  // Si no tiene, asignar uno por defecto basado en dirección y tipo de pagador
  let accountId = paymentData.account_id
  if (!accountId) {
    // Obtener cuenta por defecto según dirección y tipo
    if (paymentData.direction === "INCOME") {
      // INGRESOS: buscar cuenta de Ventas de Viajes (4.1.01)
      const { data: ingresosChart } = await withAgencyFilter((supabase.from("chart_of_accounts") as any)
        .select("id")
        .eq("account_code", "4.1.01")
        .eq("is_active", true)
        .maybeSingle())
      
      if (ingresosChart) {
        const { data: ingresosAccount } = await (supabase.from("financial_accounts") as any)
          .select("id")
          .eq("chart_account_id", ingresosChart.id)
          .eq("is_active", true)
          .maybeSingle()
        accountId = ingresosAccount?.id || null
      }
    } else if (paymentData.payer_type === "OPERATOR") {
      // PAGOS A OPERADORES: buscar cuenta de Costos (4.2.01)
      const { data: costosChart } = await withAgencyFilter((supabase.from("chart_of_accounts") as any)
        .select("id")
        .eq("account_code", "4.2.01")
        .eq("is_active", true)
        .maybeSingle())
      
      if (costosChart) {
        const { data: costosAccount } = await (supabase.from("financial_accounts") as any)
          .select("id")
          .eq("chart_account_id", costosChart.id)
          .eq("is_active", true)
          .maybeSingle()
        accountId = costosAccount?.id || null
      }
    } else {
      // OTROS EGRESOS: buscar cuenta de Gastos (4.3.01)
      const { data: gastosChart } = await withAgencyFilter((supabase.from("chart_of_accounts") as any)
        .select("id")
        .eq("account_code", "4.3.01")
        .eq("is_active", true)
        .maybeSingle())
      
      if (gastosChart) {
        const { data: gastosAccount } = await (supabase.from("financial_accounts") as any)
          .select("id")
          .eq("chart_account_id", gastosChart.id)
          .eq("is_active", true)
          .maybeSingle()
        accountId = gastosAccount?.id || null
      }
    }

    // Si aún no hay account_id, retornar error
    if (!accountId) {
      throw new Error("El pago no tiene cuenta financiera asociada y no se pudo asignar una por defecto. Por favor, actualice el pago con una cuenta financiera.")
    }

    // Actualizar el pago con el account_id
    await paymentsTable
      .update({ account_id: accountId })
      .eq("id", paymentId)
  }

  // Verificar si el pago ya está marcado como PAID y tiene ledger_movement_id
  // Si ya tiene ledger_movement_id, significa que los movimientos contables ya fueron creados
  // Solo actualizamos la fecha y referencia, pero no creamos movimientos duplicados
  const alreadyHasLedgerMovement = paymentData.status === "PAID" && paymentData.ledger_movement_id

  // Update payment
  await paymentsTable
    .update({
      date_paid: datePaid,
      status: "PAID",
      reference: reference || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", paymentId)

  // Si el pago ya tiene ledger_movement_id, verificar que también tenga movimiento en cuenta financiera
  // Si no lo tiene, crearlo (esto corrige pagos antiguos que solo tienen movimiento en RESULTADO)
  let needsOnlyFinancialAccountMovement = false
  if (alreadyHasLedgerMovement) {
    // Verificar si existe movimiento en la cuenta financiera
    const { data: financialAccountMovement, error: movementError } = await (supabase.from("ledger_movements") as any)
      .select("id")
      .eq("account_id", accountId)
      .eq("operation_id", paymentData.operation_id || null)
      .eq("amount_original", parseFloat(paymentData.amount))
      .eq("currency", paymentData.currency)
      .limit(1)

    if (!movementError && financialAccountMovement && financialAccountMovement.length > 0) {
      // Ya existe movimiento en la cuenta financiera
      console.log(`⚠️ Pago ${paymentId} ya tiene ledger_movement_id ${paymentData.ledger_movement_id} y movimiento en cuenta financiera, omitiendo creación`)
      return { 
        ledger_movement_id: paymentData.ledger_movement_id
      }
    } else {
      // Tiene ledger_movement_id pero NO tiene movimiento en cuenta financiera
      // Esto es un caso de corrección: crear SOLO el movimiento en cuenta financiera (no el de RESULTADO)
      console.log(`⚠️ Pago ${paymentId} tiene ledger_movement_id pero NO tiene movimiento en cuenta financiera ${accountId}, creando movimiento faltante...`)
      needsOnlyFinancialAccountMovement = true
      // Saltar la creación del movimiento en RESULTADO, solo crear el de cuenta financiera
    }
  }

  // Get agency_id from operation or user agencies
  let agencyId = operation?.agency_id
  if (!agencyId) {
    const { data: userAgencies } = await supabase
      .from("user_agencies")
      .select("agency_id")
      .eq("user_id", userId)
      .limit(1)
    agencyId = (userAgencies as any)?.[0]?.agency_id
  }

  // Verificar si ya existe un cash_movement para este pago
  const { data: existingCashMovement } = await supabase
    .from("cash_movements")
    .select("id")
    .eq("payment_id", paymentId)
    .maybeSingle()

  // Solo crear cash_movement si no existe uno ya vinculado a este pago
  if (!existingCashMovement) {
    // Get default cash box for agency
    const { data: defaultCashBox } = await supabase
      .from("cash_boxes")
      .select("id")
      .eq("agency_id", agencyId || "")
      .eq("currency", paymentData.currency)
      .eq("is_default", true)
      .eq("is_active", true)
      .maybeSingle()

    // Create cash movement (mantener compatibilidad)
    const movementsTable = supabase.from("cash_movements") as any
    const { error: cashMovementError } = await movementsTable.insert({
      operation_id: paymentData.operation_id,
      payment_id: paymentId, // Vincular con el pago
      cash_box_id: (defaultCashBox as any)?.id || null,
      user_id: userId,
      type: paymentData.direction === "INCOME" ? "INCOME" : "EXPENSE",
      category: paymentData.direction === "INCOME" ? "SALE" : "OPERATOR_PAYMENT",
      amount: paymentData.amount,
      currency: paymentData.currency,
      movement_date: datePaid,
      notes: reference || null,
      is_touristic: true, // Payments are always touristic
    })

    if (cashMovementError) {
      console.warn(`⚠️ Error creando cash_movement para pago ${paymentId}:`, cashMovementError)
      // No fallar, continuar con el flujo
    }
  } else {
    console.log(`⚠️ Pago ${paymentId} ya tiene cash_movement ${(existingCashMovement as any).id}, omitiendo creación`)
  }

  // ============================================
  // FASE 1: REDUCIR ACTIVO/PASIVO Y CREAR MOVIMIENTO EN RESULTADO
  // ============================================
  
  // 1. Reducir "Cuentas por Cobrar" (ACTIVO) si es INCOME
  //    o "Cuentas por Pagar" (PASIVO) si es EXPENSE
  if (paymentData.direction === "INCOME") {
    // Reducir "Cuentas por Cobrar" (ACTIVO) - el cliente pagó
      const { data: accountsReceivableChart } = await withAgencyFilter((supabase.from("chart_of_accounts") as any)
        .select("id")
        .eq("account_code", "1.1.03")
        .eq("is_active", true)
        .maybeSingle())
    
    if (accountsReceivableChart) {
      const { data: accountsReceivableAccount } = await (supabase.from("financial_accounts") as any)
        .select("id")
        .eq("chart_account_id", accountsReceivableChart.id)
        .eq("currency", paymentData.currency)
        .eq("is_active", true)
        .maybeSingle()
      
      if (accountsReceivableAccount) {
        // Calcular exchange rate solo para ARS
        // USD: NO necesita tipo de cambio (el sistema trabaja en USD)
        // ARS: SÍ necesita tipo de cambio (para convertir a USD)
        let exchangeRate: number | null = null
        let amountARS: number
        
        if (paymentData.currency === "ARS") {
          // Para ARS, el tipo de cambio es obligatorio (debería venir del payment)
          exchangeRate = paymentData.exchange_rate ? parseFloat(paymentData.exchange_rate) : null
          if (!exchangeRate || exchangeRate <= 0) {
            // Si no viene en el payment, intentar buscarlo (pero debería venir)
            const dateForRate = datePaid ? new Date(datePaid) : new Date()
            exchangeRate = await getExchangeRate(supabase, dateForRate)
            if (!exchangeRate) {
              const { getLatestExchangeRate } = await import("@/lib/accounting/exchange-rates")
              exchangeRate = await getLatestExchangeRate(supabase)
            }
            if (!exchangeRate || exchangeRate <= 0) {
              throw new Error("El tipo de cambio es obligatorio para pagos en ARS")
            }
          }
          amountARS = calculateARSEquivalent(
            parseFloat(paymentData.amount),
            "ARS",
            exchangeRate
          )
        } else {
          // Para USD, no se necesita tipo de cambio
          // amount_ars_equivalent = amount_original (sin conversión, el sistema trabaja en USD)
          amountARS = parseFloat(paymentData.amount)
        }
        
        // Crear movimiento INCOME en "Cuentas por Cobrar" para REDUCIR el activo
        await createLedgerMovement(
          {
            operation_id: paymentData.operation_id || null,
            lead_id: null,
            type: "INCOME", // INCOME reduce el activo "Cuentas por Cobrar"
            concept: `Cobro de cliente - Operación ${paymentData.operation_id?.slice(0, 8) || ""}`,
            currency: paymentData.currency as "ARS" | "USD",
            amount_original: parseFloat(paymentData.amount),
            exchange_rate: paymentData.currency === "ARS" ? exchangeRate : null, // Solo guardar exchange_rate para ARS
            amount_ars_equivalent: amountARS,
            method: paymentData.method === "Efectivo" ? "CASH" : paymentData.method === "Transferencia" ? "BANK" : "OTHER",
            account_id: accountsReceivableAccount.id,
            seller_id: operation?.seller_id || null,
            operator_id: null,
            receipt_number: reference || null,
            notes: `Pago recibido: ${reference || ""}`,
            created_by: userId,
          },
          supabase
        )
        console.log(`✅ Reducido "Cuentas por Cobrar" por pago de cliente ${paymentId}`)
      }
    }
  } else if (paymentData.payer_type === "OPERATOR") {
    // Reducir "Cuentas por Pagar" (PASIVO) - pagaste al operador
    const { data: accountsPayableChart } = await withAgencyFilter((supabase.from("chart_of_accounts") as any)
      .select("id")
      .eq("account_code", "2.1.01")
      .eq("is_active", true)
      .maybeSingle())
    
    if (accountsPayableChart) {
      const { data: accountsPayableAccount } = await (supabase.from("financial_accounts") as any)
        .select("id")
        .eq("chart_account_id", accountsPayableChart.id)
        .eq("currency", paymentData.currency)
        .eq("is_active", true)
        .maybeSingle()
      
      if (accountsPayableAccount) {
        // Calcular exchange rate si es USD
        let exchangeRate: number | null = null
        if (paymentData.currency === "USD") {
          // Proteger contra datePaid undefined/null
          const dateForRate = datePaid ? new Date(datePaid) : new Date()
          if (isNaN(dateForRate.getTime())) {
            console.warn(`Invalid datePaid for payment ${paymentId}, using today's date`)
            exchangeRate = await getExchangeRate(supabase, new Date())
          } else {
            exchangeRate = await getExchangeRate(supabase, dateForRate)
          }
          if (!exchangeRate) {
            const { getLatestExchangeRate } = await import("@/lib/accounting/exchange-rates")
            exchangeRate = await getLatestExchangeRate(supabase)
          }
          if (!exchangeRate) {
            console.warn(`No exchange rate found for USD payment ${paymentId}`)
            exchangeRate = 1000 // Fallback temporal
          }
        }
        
        const amountARS = calculateARSEquivalent(
          parseFloat(paymentData.amount),
          paymentData.currency as "ARS" | "USD",
          exchangeRate
        )
        
        // Crear movimiento INCOME en "Cuentas por Pagar" para REDUCIR el pasivo
        await createLedgerMovement(
          {
            operation_id: paymentData.operation_id || null,
            lead_id: null,
            type: "INCOME", // INCOME reduce el pasivo "Cuentas por Pagar"
            concept: `Pago a operador - Operación ${paymentData.operation_id?.slice(0, 8) || ""}`,
            currency: paymentData.currency as "ARS" | "USD",
            amount_original: parseFloat(paymentData.amount),
            exchange_rate: paymentData.currency === "ARS" ? exchangeRate : null, // Solo guardar exchange_rate para ARS
            amount_ars_equivalent: amountARS,
            method: paymentData.method === "Efectivo" ? "CASH" : paymentData.method === "Transferencia" ? "BANK" : "OTHER",
            account_id: accountsPayableAccount.id,
            seller_id: operation?.seller_id || null,
            operator_id: operation?.operator_id || null,
            receipt_number: reference || null,
            notes: `Pago realizado: ${reference || ""}`,
            created_by: userId,
          },
          supabase
        )
        console.log(`✅ Reducido "Cuentas por Pagar" por pago a operador ${paymentId}`)
      }
    }
  }
  
  // 2. Crear movimiento en RESULTADO (INGRESOS/COSTOS/GASTOS)
  // Usar la cuenta financiera del pago (ya validada/obtenida arriba)
  // Si necesitamos una cuenta diferente para el movimiento de resultado, la obtenemos aquí
  let resultAccountId: string
  
  if (paymentData.direction === "INCOME") {
    // INGRESOS: usar cuenta de RESULTADO > INGRESOS > "4.1.01" - Ventas de Viajes
      const { data: ingresosChart } = await withAgencyFilter((supabase.from("chart_of_accounts") as any)
        .select("id")
        .eq("account_code", "4.1.01")
        .eq("is_active", true)
        .maybeSingle())
    
    if (ingresosChart) {
      // Buscar o crear financial_account vinculada a esta cuenta del plan
      let ingresosFinancialAccount = await (supabase.from("financial_accounts") as any)
        .select("id")
        .eq("chart_account_id", ingresosChart.id)
        .eq("is_active", true)
        .maybeSingle()
      
      if (!ingresosFinancialAccount) {
        const { data: newFA } = await (supabase.from("financial_accounts") as any)
          .insert({
            name: "Ventas de Viajes",
            type: "CASH_ARS", // Tipo genérico, no importa para RESULTADO
            currency: paymentData.currency as "ARS" | "USD",
            chart_account_id: ingresosChart.id,
            initial_balance: 0,
            is_active: true,
            created_by: userId,
          })
          .select("id")
          .single()
        ingresosFinancialAccount = newFA
      }
      resultAccountId = ingresosFinancialAccount.id
    } else {
      // Fallback si no existe el plan de cuentas
      const accountType = paymentData.currency === "USD" ? "USD" : "CASH"
      resultAccountId = await getOrCreateDefaultAccount(
        accountType,
        paymentData.currency as "ARS" | "USD",
        userId,
        supabase
      )
    }
  } else if (paymentData.payer_type === "OPERATOR") {
    // COSTOS: usar cuenta de RESULTADO > COSTOS > "4.2.01" - Costo de Operadores
      const { data: costosChart } = await withAgencyFilter((supabase.from("chart_of_accounts") as any)
        .select("id")
        .eq("account_code", "4.2.01")
        .eq("is_active", true)
        .maybeSingle())
    
    if (costosChart) {
      let costosFinancialAccount = await (supabase.from("financial_accounts") as any)
        .select("id")
        .eq("chart_account_id", costosChart.id)
        .eq("is_active", true)
        .maybeSingle()
      
      if (!costosFinancialAccount) {
        const { data: newFA } = await (supabase.from("financial_accounts") as any)
          .insert({
            name: "Costo de Operadores",
            type: "CASH_ARS",
            currency: paymentData.currency as "ARS" | "USD",
            chart_account_id: costosChart.id,
            initial_balance: 0,
            is_active: true,
            created_by: userId,
          })
          .select("id")
          .single()
        costosFinancialAccount = newFA
      }
      resultAccountId = costosFinancialAccount.id
    } else {
      // Fallback
      const accountType = paymentData.currency === "USD" ? "USD" : "CASH"
      resultAccountId = await getOrCreateDefaultAccount(
        accountType,
        paymentData.currency as "ARS" | "USD",
        userId,
        supabase
      )
    }
  } else {
    // GASTOS: usar cuenta de RESULTADO > GASTOS > "4.3.01" (o genérico)
      const { data: gastosChart } = await withAgencyFilter((supabase.from("chart_of_accounts") as any)
        .select("id")
        .eq("account_code", "4.3.01") // Gastos Administrativos como default
        .eq("is_active", true)
        .maybeSingle())
    
    if (gastosChart) {
      let gastosFinancialAccount = await (supabase.from("financial_accounts") as any)
        .select("id")
        .eq("chart_account_id", gastosChart.id)
        .eq("is_active", true)
        .maybeSingle()
      
      if (!gastosFinancialAccount) {
        const { data: newFA } = await (supabase.from("financial_accounts") as any)
          .insert({
            name: "Gastos Administrativos",
            type: "CASH_ARS",
            currency: paymentData.currency as "ARS" | "USD",
            chart_account_id: gastosChart.id,
            initial_balance: 0,
            is_active: true,
            created_by: userId,
          })
          .select("id")
          .single()
        gastosFinancialAccount = newFA
      }
      resultAccountId = gastosFinancialAccount.id
    } else {
      // Fallback
      const accountType = paymentData.currency === "USD" ? "USD" : "CASH"
      resultAccountId = await getOrCreateDefaultAccount(
        accountType,
        paymentData.currency as "ARS" | "USD",
        userId,
        supabase
      )
    }
  }

  // Calcular ARS equivalent
  // Si currency = ARS, amount_ars_equivalent = amount_original
  // Si currency = USD, necesitamos exchange_rate de la tabla
  let exchangeRate: number | null = null
  if (paymentData.currency === "USD") {
    const rateDate = datePaid ? new Date(datePaid) : new Date()
    exchangeRate = await getExchangeRate(supabase, rateDate)
    
    // Si no hay tasa para esa fecha, usar la más reciente disponible
    if (!exchangeRate) {
      const { getLatestExchangeRate } = await import("@/lib/accounting/exchange-rates")
      exchangeRate = await getLatestExchangeRate(supabase)
    }
    
    // Fallback: si aún no hay tasa, usar 1000 como último recurso
    if (!exchangeRate) {
      console.warn(`No exchange rate found for ${rateDate.toISOString()}, using fallback 1000`)
      exchangeRate = 1000
    }
  }
  
  const amountARS = calculateARSEquivalent(
    parseFloat(paymentData.amount),
    paymentData.currency as "ARS" | "USD",
    exchangeRate
  )
  
  // Obtener seller_id y operator_id de la operación si existe
  const sellerId = operation?.seller_id || null
  const operatorId = operation?.operator_id || null
  
  // Mapear method del payment a ledger method
  const methodMap: Record<string, "CASH" | "BANK" | "MP" | "USD" | "OTHER"> = {
    "Efectivo": "CASH",
    "Transferencia": "BANK",
    "Mercado Pago": "MP",
    "MercadoPago": "MP",
    "MP": "MP",
    "USD": "USD",
  }
  const ledgerMethod = paymentData.method 
    ? (methodMap[paymentData.method] || "OTHER")
    : "CASH"

  // Determinar tipo de ledger movement
  const ledgerType =
    paymentData.direction === "INCOME"
      ? "INCOME"
      : paymentData.payer_type === "OPERATOR"
      ? "OPERATOR_PAYMENT"
      : "EXPENSE"

  // Crear ledger movement en RESULTADO (para contabilidad)
  // SOLO si no es un caso de corrección (needsOnlyFinancialAccountMovement)
  let ledgerMovementId = paymentData.ledger_movement_id || null
  if (!needsOnlyFinancialAccountMovement) {
    const { id: newLedgerMovementId } = await createLedgerMovement(
      {
        operation_id: paymentData.operation_id || null,
        lead_id: null,
        type: ledgerType,
        concept:
          paymentData.direction === "INCOME"
            ? "Pago de cliente"
            : "Pago a operador",
        currency: paymentData.currency as "ARS" | "USD",
        amount_original: parseFloat(paymentData.amount),
        exchange_rate: paymentData.currency === "ARS" ? exchangeRate : null, // Solo guardar exchange_rate para ARS
        amount_ars_equivalent: amountARS,
        method: ledgerMethod,
        account_id: resultAccountId,
        seller_id: sellerId,
        operator_id: operatorId,
        receipt_number: reference || null,
        notes: reference || null,
        created_by: userId,
      },
      supabase
    )
    ledgerMovementId = newLedgerMovementId
  }

  // IMPORTANTE: También crear un movimiento en la cuenta financiera seleccionada
  // Esto es necesario para que el balance de la cuenta se actualice correctamente
  // La cuenta financiera (account_id del pago) es donde realmente se recibió/entregó el dinero
  // SIEMPRE crear este movimiento, incluso si accountId === resultAccountId (aunque no debería pasar)
  if (accountId) {
    try {
      // Verificar que la cuenta financiera existe
      const { data: financialAccount, error: accountError } = await (supabase.from("financial_accounts") as any)
        .select("id, name, chart_account_id")
        .eq("id", accountId)
        .single()

      if (accountError || !financialAccount) {
        console.error(`⚠️ Cuenta financiera ${accountId} no encontrada, no se creará movimiento`)
      } else {
        // Si accountId === resultAccountId, significa que la cuenta financiera es la misma que la del plan contable
        // En este caso, el movimiento ya se creó arriba, pero aún así creamos uno específico para la cuenta
        // para asegurar que el balance se actualice correctamente
        if (accountId === resultAccountId) {
          console.log(`⚠️ accountId (${accountId}) es igual a resultAccountId, el movimiento ya se creó arriba`)
        }

        // Validar saldo suficiente antes de permitir egreso
        if (paymentData.direction === "EXPENSE") {
          try {
            await validateAccountBalanceForExpense(
              accountId,
              parseFloat(paymentData.amount),
              paymentData.currency as "ARS" | "USD",
              supabase,
              paymentData.currency === "USD" ? exchangeRate : null
            )
          } catch (error: any) {
            throw new Error(error.message || "Error validando saldo de cuenta")
          }
        }

        await createLedgerMovement(
          {
            operation_id: paymentData.operation_id || null,
            lead_id: null,
            type: paymentData.direction === "INCOME" ? "INCOME" : "EXPENSE",
            concept: paymentData.direction === "INCOME"
              ? `Ingreso en ${paymentData.currency} - Operación ${paymentData.operation_id?.slice(0, 8) || ""}`
              : `Egreso en ${paymentData.currency} - Operación ${paymentData.operation_id?.slice(0, 8) || ""}`,
            currency: paymentData.currency as "ARS" | "USD",
            amount_original: parseFloat(paymentData.amount),
            exchange_rate: paymentData.currency === "ARS" ? exchangeRate : null, // Solo guardar exchange_rate para ARS
            amount_ars_equivalent: amountARS,
            method: ledgerMethod,
            account_id: accountId, // La cuenta financiera seleccionada por el usuario
            seller_id: sellerId,
            operator_id: operatorId,
            receipt_number: reference || null,
            notes: `Movimiento en cuenta financiera: ${reference || ""}`,
            created_by: userId,
          },
          supabase
        )
        console.log(`✅ Movimiento creado en cuenta financiera ${accountId} (${financialAccount.name}) para pago ${paymentId} - Monto: ${paymentData.amount} ${paymentData.currency}`)
      }
    } catch (error: any) {
      console.error(`❌ Error creando movimiento en cuenta financiera ${accountId}:`, error)
      // No fallamos completamente, el movimiento en RESULTADO ya se creó
      // Pero esto es crítico, así que lanzamos el error para que se vea en los logs
      throw new Error(`Error crítico: No se pudo crear movimiento en cuenta financiera ${accountId}: ${error.message}`)
    }
  } else {
    console.error(`❌ No se pudo crear movimiento en cuenta financiera: accountId es null o undefined para pago ${paymentId}`)
    throw new Error("El pago no tiene cuenta financiera asociada (account_id es requerido)")
  }

  // Actualizar payment con referencia al ledger_movement (solo si no tenía uno antes)
  if (!paymentData.ledger_movement_id && ledgerMovementId) {
    await paymentsTable
      .update({ ledger_movement_id: ledgerMovementId })
      .eq("id", paymentId)
  }

  // Si es un pago a operador, marcar operator_payment como PAID
  if (paymentData.payer_type === "OPERATOR" && paymentData.operation_id) {
    try {
      // Buscar el operator_payment correspondiente
      const { data: operatorPayment } = await (supabase.from("operator_payments") as any)
        .select("id")
        .eq("operation_id", paymentData.operation_id)
        .eq("status", "PENDING")
        .limit(1)
        .maybeSingle()

      if (operatorPayment) {
        await markOperatorPaymentAsPaid(supabase, operatorPayment.id, ledgerMovementId)
        console.log(`✅ Marcado operator_payment ${operatorPayment.id} como PAID`)
      }
    } catch (error) {
      console.error("Error marcando operator_payment como PAID:", error)
      // No lanzamos error para no romper el flujo
    }
  }

  // Calcular FX automáticamente si hay diferencia de moneda
  if (paymentData.operation_id) {
    try {
      await autoCalculateFXForPayment(
        supabase,
        paymentData.operation_id,
        paymentData.currency as "ARS" | "USD",
        parseFloat(paymentData.amount),
        paymentData.currency === "USD" ? exchangeRate : null,
        userId
      )
      
      // Si se generó un FX_LOSS, verificar si debemos generar alerta
      // (la alerta se generará automáticamente en generateAllAlerts)
    } catch (error) {
      console.error("Error calculando FX:", error)
      // No lanzamos error para no romper el flujo
    }
  }

  // ============================================
  // CREAR MENSAJE WHATSAPP AUTOMÁTICO
  // ============================================
  // Solo para pagos de cliente (INCOME), no para pagos a operadores
  if (paymentData.direction === "INCOME" && paymentData.operation_id) {
    try {
      // Obtener cliente principal de la operación
      const { data: operationCustomer } = await (supabase.from("operation_customers") as any)
        .select(`
          customers:customer_id (
            id, first_name, last_name, phone
          )
        `)
        .eq("operation_id", paymentData.operation_id)
        .eq("role", "MAIN")
        .single()

      const customer = (operationCustomer as any)?.customers

      if (customer?.phone) {
        // Contar pagos pendientes restantes
        const { count: remainingPayments } = await (supabase.from("payments") as any)
          .select("id", { count: "exact", head: true })
          .eq("operation_id", paymentData.operation_id)
          .eq("direction", "CUSTOMER_TO_AGENCY")
          .eq("status", "PENDING")

        // Obtener destino de la operación
        const { data: opData } = await (supabase.from("operations") as any)
          .select("destination, agency_id")
          .eq("id", paymentData.operation_id)
          .single()

        if (opData) {
          await createPaymentReceivedMessage(
            supabase,
            {
              id: paymentId,
              amount: parseFloat(paymentData.amount),
              currency: paymentData.currency,
              operation_id: paymentData.operation_id,
            },
            customer,
            opData,
            remainingPayments || 0
          )
        }
      }
    } catch (error) {
      console.error("Error creando mensaje WhatsApp:", error)
      // No lanzamos error para no romper el flujo principal
    }
  }

  return { ledger_movement_id: ledgerMovementId }
}
