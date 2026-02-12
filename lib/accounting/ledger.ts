/**
 * LEDGER SERVICE - Corazón Contable del Sistema
 * 
 * Este servicio maneja todos los movimientos del ledger (libro mayor).
 * TODO movimiento financiero debe pasar por aquí.
 */

import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"

export type LedgerMovementType =
  | "INCOME"
  | "EXPENSE"
  | "FX_GAIN"
  | "FX_LOSS"
  | "OPERATOR_PAYMENT"

export type LedgerMovementMethod = "CASH" | "BANK" | "MP" | "USD" | "OTHER"

export interface CreateLedgerMovementParams {
  operation_id?: string | null
  lead_id?: string | null
  type: LedgerMovementType
  concept: string
  currency: "ARS" | "USD"
  amount_original: number
  exchange_rate?: number | null
  amount_ars_equivalent: number
  method: LedgerMovementMethod
  account_id: string
  seller_id?: string | null
  operator_id?: string | null
  receipt_number?: string | null
  notes?: string | null
  created_by?: string | null
}

/**
 * Crear un movimiento en el ledger
 */
export async function createLedgerMovement(
  params: CreateLedgerMovementParams,
  supabase: SupabaseClient<Database>
): Promise<{ id: string }> {
  // Validar que amount_ars_equivalent esté presente
  if (!params.amount_ars_equivalent) {
    throw new Error("amount_ars_equivalent es requerido")
  }

  const ledgerTable = supabase.from("ledger_movements") as any

  const { data, error } = await ledgerTable
    .insert({
      operation_id: params.operation_id || null,
      lead_id: params.lead_id || null,
      type: params.type,
      concept: params.concept,
      currency: params.currency,
      amount_original: params.amount_original,
      exchange_rate: params.exchange_rate || null,
      amount_ars_equivalent: params.amount_ars_equivalent,
      method: params.method,
      account_id: params.account_id,
      seller_id: params.seller_id || null,
      operator_id: params.operator_id || null,
      receipt_number: params.receipt_number || null,
      notes: params.notes || null,
      created_by: params.created_by || null,
    })
    .select("id")
    .single()

  if (error) {
    throw new Error(`Error creando ledger movement: ${error.message}`)
  }

  return { id: data.id }
}

/**
 * Calcular el balance de una cuenta financiera
 * Balance = initial_balance + SUM(ingresos) - SUM(egresos) en la moneda de la cuenta
 * 
 * IMPORTANTE: 
 * - El balance se calcula en la MONEDA DE LA CUENTA (USD para cuentas USD, ARS para cuentas ARS)
 * - Si un movimiento tiene moneda diferente a la cuenta, se convierte usando el exchange_rate
 * - El cálculo depende del tipo de cuenta según el plan de cuentas:
 *   - ACTIVOS: INCOME aumenta, EXPENSE disminuye
 *   - PASIVOS: EXPENSE aumenta, INCOME disminuye (cuando pagas, reduces el pasivo)
 *   - RESULTADO: INCOME aumenta, EXPENSE disminuye
 */
export async function getAccountBalance(
  accountId: string,
  supabase: SupabaseClient<Database>
): Promise<number> {
  // Obtener cuenta con su chart_account_id para determinar el tipo
  const { data: account, error: accountError } = await (supabase
    .from("financial_accounts") as any)
    .select("initial_balance, currency, chart_account_id")
    .eq("id", accountId)
    .single()

  if (accountError || !account) {
    throw new Error(`Cuenta financiera no encontrada: ${accountId}`)
  }

  // Obtener categoría del plan de cuentas por separado (el JOIN directo falla en Supabase)
  let category: string | null = null
  if (account.chart_account_id) {
    const { data: chartAccount } = await (supabase
      .from("chart_of_accounts") as any)
      .select("category")
      .eq("id", account.chart_account_id)
      .maybeSingle()
    category = chartAccount?.category || null
  }

  const initialBalance = parseFloat(account.initial_balance || "0")
  const accountCurrency = account.currency as "ARS" | "USD"

  // Obtener todos los movimientos del ledger para esta cuenta
  // Necesitamos amount_original, currency y exchange_rate para convertir si es necesario
  const { data: movements, error: movementsError } = await (supabase
    .from("ledger_movements") as any)
    .select("type, amount_original, currency, exchange_rate")
    .eq("account_id", accountId)

  if (movementsError) {
    throw new Error(`Error obteniendo movimientos: ${movementsError.message}`)
  }

  const movementsSum =
    movements?.reduce((sum: number, m: any) => {
      // Convertir el monto a la moneda de la cuenta
      let amount = parseFloat(m.amount_original || "0")
      
      // Si la moneda del movimiento es diferente a la moneda de la cuenta, convertir
      if (m.currency !== accountCurrency) {
        if (!m.exchange_rate) {
          // Si no hay tipo de cambio, no podemos convertir. Esto no debería pasar.
          console.warn(`Movimiento sin exchange_rate para convertir de ${m.currency} a ${accountCurrency}`)
          return sum // Ignorar este movimiento
        }
        
        if (accountCurrency === "USD" && m.currency === "ARS") {
          // Convertir ARS a USD: dividir por el tipo de cambio
          amount = amount / m.exchange_rate
        } else if (accountCurrency === "ARS" && m.currency === "USD") {
          // Convertir USD a ARS: multiplicar por el tipo de cambio
          amount = amount * m.exchange_rate
        }
      }
      
      // Para PASIVOS, la lógica es inversa según principios contables:
      // - EXPENSE aumenta el pasivo (debes más)
      // - INCOME disminuye el pasivo (pagas, reduces la deuda)
      if (category === "PASIVO") {
        if (m.type === "EXPENSE" || m.type === "OPERATOR_PAYMENT" || m.type === "FX_LOSS") {
          return sum + amount // Aumenta el pasivo
        } else if (m.type === "INCOME" || m.type === "FX_GAIN") {
          return sum - amount // Disminuye el pasivo (pagaste)
        }
        return sum
      }
      
      // Para ACTIVOS y RESULTADO (y otros), lógica normal:
      // - INCOME aumenta
      // - EXPENSE disminuye
      if (m.type === "INCOME" || m.type === "FX_GAIN") {
        return sum + amount
      } else if (m.type === "EXPENSE" || m.type === "FX_LOSS" || m.type === "OPERATOR_PAYMENT") {
        return sum - amount
      }
      return sum
    }, 0) || 0

  return initialBalance + movementsSum
}

/**
 * Transferir movimientos de un lead a una operación
 * Cuando un Lead se convierte en Operation, todos los ledger_movements
 * con lead_id deben transferirse a operation_id
 */
export async function transferLeadToOperation(
  leadId: string,
  operationId: string,
  supabase: SupabaseClient<Database>
): Promise<{ transferred: number }> {
  const ledgerTable = supabase.from("ledger_movements") as any

  // Actualizar todos los movimientos con lead_id para que tengan operation_id
  const { data, error } = await ledgerTable
    .update({
      operation_id: operationId,
      lead_id: null, // Limpiar lead_id después de transferir
    })
    .eq("lead_id", leadId)
    .select("id")

  if (error) {
    throw new Error(`Error transfiriendo movimientos: ${error.message}`)
  }

  return { transferred: data?.length || 0 }
}

/**
 * Validar que una cuenta financiera tenga saldo suficiente para un egreso
 * @param exchangeRate Tipo de cambio (obligatorio si las monedas son diferentes)
 * @throws Error si el saldo es insuficiente
 */
export async function validateAccountBalanceForExpense(
  accountId: string,
  expenseAmount: number,
  expenseCurrency: "ARS" | "USD",
  supabase: SupabaseClient<Database>,
  exchangeRate?: number | null
): Promise<void> {
  // Obtener la cuenta para conocer su moneda
  const { data: account, error: accountError } = await (supabase
    .from("financial_accounts") as any)
    .select("id, currency, name")
    .eq("id", accountId)
    .single()

  if (accountError || !account) {
    throw new Error(`Cuenta financiera no encontrada: ${accountId}`)
  }

  const accountCurrency = account.currency as "ARS" | "USD"
  
  // Convertir el monto del egreso a la moneda de la cuenta si es necesario
  let expenseAmountInAccountCurrency = expenseAmount
  
  // Si las monedas son diferentes, necesitamos el tipo de cambio obligatorio
  if (expenseCurrency !== accountCurrency) {
    if (!exchangeRate) {
      throw new Error(
        `La moneda del egreso (${expenseCurrency}) no coincide con la moneda de la cuenta (${accountCurrency}). ` +
        `Se requiere un tipo de cambio obligatorio para realizar la conversión.`
      )
    }
    
    // Convertir a la moneda de la cuenta
    if (accountCurrency === "USD" && expenseCurrency === "ARS") {
      // Convertir ARS a USD: dividir por el tipo de cambio
      expenseAmountInAccountCurrency = expenseAmount / exchangeRate
    } else if (accountCurrency === "ARS" && expenseCurrency === "USD") {
      // Convertir USD a ARS: multiplicar por el tipo de cambio
      expenseAmountInAccountCurrency = expenseAmount * exchangeRate
    }
  }

  // Calcular el balance actual de la cuenta
  const currentBalance = await getAccountBalance(accountId, supabase)

  // Validar que el saldo sea suficiente
  if (currentBalance < expenseAmountInAccountCurrency) {
    throw new Error(
      `Saldo insuficiente en cuenta para realizar el pago. ` +
      `Saldo disponible: ${currentBalance.toFixed(2)} ${accountCurrency}, ` +
      `Monto requerido: ${expenseAmountInAccountCurrency.toFixed(2)} ${accountCurrency}`
    )
  }
}

/**
 * Calcular equivalente en USD (base del sistema)
 * Si currency = ARS, amount_ars_equivalent = amount_original / exchange_rate
 * Si currency = USD, amount_ars_equivalent = amount_original
 */
export function calculateARSEquivalent(
  amount: number,
  currency: "ARS" | "USD",
  exchangeRate?: number | null
): number {
  if (currency === "USD") {
    return amount
  }

  if (currency === "ARS") {
    if (!exchangeRate) {
      throw new Error("exchange_rate es requerido para convertir ARS a USD")
    }
    return amount / exchangeRate
  }

  throw new Error(`Moneda no soportada: ${currency}`)
}

/**
 * Obtener todos los movimientos de un lead
 */
export async function getLeadMovements(
  leadId: string,
  supabase: SupabaseClient<Database>
) {
  const { data, error } = await (supabase.from("ledger_movements") as any)
    .select("*")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false })

  if (error) {
    throw new Error(`Error obteniendo movimientos del lead: ${error.message}`)
  }

  return data || []
}

/**
 * Obtener todos los movimientos de una operación
 */
export async function getOperationMovements(
  operationId: string,
  supabase: SupabaseClient<Database>
) {
  const { data, error } = await (supabase.from("ledger_movements") as any)
    .select("*")
    .eq("operation_id", operationId)
    .order("created_at", { ascending: false })

  if (error) {
    throw new Error(`Error obteniendo movimientos de la operación: ${error.message}`)
  }

  return data || []
}

/**
 * Obtener movimientos de ledger con filtros
 */
export async function getLedgerMovements(
  supabase: SupabaseClient<Database>,
  filters: {
    dateFrom?: string
    dateTo?: string
    type?: LedgerMovementType | "ALL"
    currency?: "ARS" | "USD" | "ALL"
    accountId?: string | "ALL"
    sellerId?: string | "ALL"
    operatorId?: string | "ALL"
    operationId?: string
    leadId?: string
  }
) {
  let query = (supabase.from("ledger_movements") as any)
    .select(
      `
      *,
      financial_accounts:account_id (id, name, type, currency),
      users:created_by (id, name),
      sellers:seller_id (id, name),
      operators:operator_id (id, name),
      operations:operation_id (id, destination, file_code),
      leads:lead_id (id, contact_name)
    `
    )
    .order("created_at", { ascending: false })

  if (filters.dateFrom) {
    query = query.gte("created_at", filters.dateFrom)
  }
  if (filters.dateTo) {
    query = query.lte("created_at", filters.dateTo)
  }
  if (filters.type && filters.type !== "ALL") {
    query = query.eq("type", filters.type)
  }
  if (filters.currency && filters.currency !== "ALL") {
    query = query.eq("currency", filters.currency)
  }
  if (filters.accountId && filters.accountId !== "ALL") {
    query = query.eq("account_id", filters.accountId)
  }
  if (filters.sellerId && filters.sellerId !== "ALL") {
    query = query.eq("seller_id", filters.sellerId)
  }
  if (filters.operatorId && filters.operatorId !== "ALL") {
    query = query.eq("operator_id", filters.operatorId)
  }
  if (filters.operationId) {
    query = query.eq("operation_id", filters.operationId)
  }
  if (filters.leadId) {
    query = query.eq("lead_id", filters.leadId)
  }

  const { data, error } = await query

  if (error) {
    console.error("Error fetching ledger movements:", error)
    throw new Error(`Error obteniendo movimientos de ledger: ${error.message}`)
  }

  return data || []
}

/**
 * Obtener o crear una cuenta financiera por defecto
 * Útil para migración y casos donde no se especifica cuenta
 */
export async function getOrCreateDefaultAccount(
  type: "CASH" | "BANK" | "MP" | "USD",
  currency: "ARS" | "USD",
  userId: string,
  supabase: SupabaseClient<Database>,
  agencyId?: string
): Promise<string> {
  // Mapear tipos antiguos a tipos válidos según el constraint
  const typeMapping: Record<string, string> = {
    CASH: currency === "ARS" ? "CASH_ARS" : "CASH_USD",
    BANK: currency === "ARS" ? "CHECKING_ARS" : "CHECKING_USD",
    MP: "CREDIT_CARD", // Mercado Pago se mapea a tarjeta de crédito
    USD: currency === "ARS" ? "SAVINGS_ARS" : "SAVINGS_USD", // Si se pide USD con currency USD, usar SAVINGS_USD
  }

  const validType = typeMapping[type] || (currency === "ARS" ? "CASH_ARS" : "CASH_USD")

  // Buscar cuenta existente del tipo y moneda válidos (aislada por agencia)
  let searchQuery = (supabase.from("financial_accounts") as any)
    .select("id")
    .eq("type", validType)
    .eq("currency", currency)
  if (agencyId) {
    searchQuery = searchQuery.eq("agency_id", agencyId)
  }
  const { data: existing, error: existingError } = await searchQuery
    .limit(1)
    .maybeSingle()

  if (existing && !existingError) {
    return existing.id
  }

  // Si no existe, crear una nueva
  const accountNames: Record<string, string> = {
    CASH_ARS: "Caja Principal ARS",
    CASH_USD: "Caja Principal USD",
    CHECKING_ARS: "Banco Principal ARS",
    CHECKING_USD: "Banco Principal USD",
    CREDIT_CARD: "Mercado Pago",
    SAVINGS_ARS: "Caja de Ahorro ARS",
    SAVINGS_USD: "Caja de Ahorro USD",
  }

  const insertData: any = {
    name: accountNames[validType] || `Cuenta ${validType}`,
    type: validType,
    currency,
    initial_balance: 0,
    created_by: userId,
  }
  if (agencyId) {
    insertData.agency_id = agencyId
  }

  const { data: newAccount, error } = await (supabase.from("financial_accounts") as any)
    .insert(insertData)
    .select("id")
    .single()

  if (error || !newAccount) {
    throw new Error(`Error creando cuenta por defecto: ${error?.message || "Unknown error"}`)
  }

  return newAccount.id
}

/**
 * Identificar si una cuenta financiera es solo contable (Cuentas por Cobrar o Cuentas por Pagar)
 * Estas cuentas NO deben aparecer en selecciones de pagos/ingresos/transferencias
 * porque son cuentas contables que no reciben transferencias desde caja/banco
 */
export async function isAccountingOnlyAccount(
  accountId: string,
  supabase: SupabaseClient<Database>
): Promise<boolean> {
  const { data: account, error } = await (supabase.from("financial_accounts") as any)
    .select("chart_account_id")
    .eq("id", accountId)
    .single()

  if (error || !account || !account.chart_account_id) {
    return false
  }

  // Obtener account_code por separado (JOIN directo falla en Supabase)
  const { data: chartAccount } = await (supabase.from("chart_of_accounts") as any)
    .select("account_code")
    .eq("id", account.chart_account_id)
    .maybeSingle()

  if (!chartAccount?.account_code) {
    return false
  }

  // Cuentas contables que NO deben aparecer en selecciones:
  // - 1.1.03: Cuentas por Cobrar
  // - 2.1.01: Cuentas por Pagar
  const accountingOnlyCodes = ["1.1.03", "2.1.01"]

  return accountingOnlyCodes.includes(chartAccount.account_code)
}

/**
 * OPTIMIZACIÓN: Filtrar múltiples cuentas contables en batch (1 query en lugar de N)
 * Retorna un Set con los IDs de las cuentas que SON contables (para excluir)
 */
export async function filterAccountingOnlyAccountsBatch(
  accountIds: string[],
  supabase: SupabaseClient<Database>
): Promise<Set<string>> {
  if (accountIds.length === 0) {
    return new Set()
  }

  // Obtener todas las cuentas con sus chart_account_id
  const { data: accounts, error } = await (supabase.from("financial_accounts") as any)
    .select("id, chart_account_id")
    .in("id", accountIds)

  if (error || !accounts) {
    console.warn("Error filtering accounting only accounts in batch:", error)
    return new Set()
  }

  // Obtener account_codes del plan de cuentas por separado (JOIN directo falla en Supabase)
  const chartAccountIds = Array.from(new Set(accounts.map((a: any) => a.chart_account_id).filter(Boolean))) as string[]
  const chartCodeMap = new Map<string, string>()
  if (chartAccountIds.length > 0) {
    const { data: chartAccounts } = await (supabase.from("chart_of_accounts") as any)
      .select("id, account_code")
      .in("id", chartAccountIds)
    if (chartAccounts) {
      for (const ca of chartAccounts) {
        chartCodeMap.set(ca.id, ca.account_code)
      }
    }
  }

  // Cuentas contables que NO deben aparecer en selecciones:
  // - 1.1.03: Cuentas por Cobrar
  // - 2.1.01: Cuentas por Pagar
  const accountingOnlyCodes = ["1.1.03", "2.1.01"]
  const accountingOnlyAccountIds = new Set<string>()

  for (const account of accounts) {
    const accountCode = account.chart_account_id ? chartCodeMap.get(account.chart_account_id) : null
    if (accountCode && accountingOnlyCodes.includes(accountCode)) {
      accountingOnlyAccountIds.add(account.id)
    }
  }

  return accountingOnlyAccountIds
}

/**
 * OPTIMIZACIÓN: Calcular balances de múltiples cuentas en batch (2 queries en lugar de N*2)
 * Retorna un Map<accountId, balance>
 */
export async function getAccountBalancesBatch(
  accountIds: string[],
  supabase: SupabaseClient<Database>
): Promise<Map<string, number>> {
  if (accountIds.length === 0) {
    return new Map()
  }

  // Query 1: Obtener todas las cuentas (sin JOIN a chart_of_accounts que falla en Supabase)
  const { data: accounts, error: accountsError } = await (supabase
    .from("financial_accounts") as any)
    .select("id, initial_balance, currency, chart_account_id")
    .in("id", accountIds)

  if (accountsError || !accounts) {
    throw new Error(`Error obteniendo cuentas financieras: ${accountsError?.message || "Unknown error"}`)
  }

  // Query 1b: Obtener categorías del plan de cuentas por separado
  const chartAccountIds = Array.from(new Set(accounts.map((a: any) => a.chart_account_id).filter(Boolean))) as string[]
  const chartCategoryMap = new Map<string, string>()
  if (chartAccountIds.length > 0) {
    const { data: chartAccounts } = await (supabase
      .from("chart_of_accounts") as any)
      .select("id, category")
      .in("id", chartAccountIds)
    if (chartAccounts) {
      for (const ca of chartAccounts) {
        chartCategoryMap.set(ca.id, ca.category)
      }
    }
  }

  // Query 2: Obtener TODOS los movimientos de todas las cuentas en una sola query
  const { data: movements, error: movementsError } = await (supabase
    .from("ledger_movements") as any)
    .select("account_id, type, amount_original, currency, exchange_rate")
    .in("account_id", accountIds)

  if (movementsError) {
    throw new Error(`Error obteniendo movimientos: ${movementsError.message}`)
  }

  // Crear un mapa de cuenta -> información de cuenta
  const accountsMap = new Map<string, any>()
  for (const account of accounts) {
    accountsMap.set(account.id, {
      initialBalance: parseFloat(account.initial_balance || "0"),
      currency: account.currency as "ARS" | "USD",
      category: account.chart_account_id ? chartCategoryMap.get(account.chart_account_id) || null : null,
    })
  }

  // Agrupar movimientos por account_id
  const movementsByAccount = new Map<string, any[]>()
  for (const movement of movements || []) {
    const accountId = movement.account_id
    if (!movementsByAccount.has(accountId)) {
      movementsByAccount.set(accountId, [])
    }
    movementsByAccount.get(accountId)!.push(movement)
  }

  // Calcular balance para cada cuenta
  const balancesMap = new Map<string, number>()

  for (const accountId of accountIds) {
    const accountInfo = accountsMap.get(accountId)
    if (!accountInfo) {
      // Si no encontramos la cuenta, usar balance 0
      balancesMap.set(accountId, 0)
      continue
    }

    const { initialBalance, currency: accountCurrency, category } = accountInfo
    const accountMovements = movementsByAccount.get(accountId) || []

    const movementsSum = accountMovements.reduce((sum: number, m: any) => {
      // Convertir el monto a la moneda de la cuenta
      let amount = parseFloat(m.amount_original || "0")

      // Si la moneda del movimiento es diferente a la moneda de la cuenta, convertir
      if (m.currency !== accountCurrency) {
        if (!m.exchange_rate) {
          // Si no hay tipo de cambio, no podemos convertir. Esto no debería pasar.
          console.warn(`Movimiento sin exchange_rate para convertir de ${m.currency} a ${accountCurrency}`)
          return sum // Ignorar este movimiento
        }

        if (accountCurrency === "USD" && m.currency === "ARS") {
          // Convertir ARS a USD: dividir por el tipo de cambio
          amount = amount / m.exchange_rate
        } else if (accountCurrency === "ARS" && m.currency === "USD") {
          // Convertir USD a ARS: multiplicar por el tipo de cambio
          amount = amount * m.exchange_rate
        }
      }

      // Para PASIVOS, la lógica es inversa según principios contables:
      // - EXPENSE aumenta el pasivo (debes más)
      // - INCOME disminuye el pasivo (pagas, reduces la deuda)
      if (category === "PASIVO") {
        if (m.type === "EXPENSE" || m.type === "OPERATOR_PAYMENT" || m.type === "FX_LOSS") {
          return sum + amount // Aumenta el pasivo
        } else if (m.type === "INCOME" || m.type === "FX_GAIN") {
          return sum - amount // Disminuye el pasivo (pagaste)
        }
        return sum
      }

      // Para ACTIVOS y RESULTADO (y otros), lógica normal:
      // - INCOME aumenta
      // - EXPENSE disminuye
      if (m.type === "INCOME" || m.type === "FX_GAIN") {
        return sum + amount
      } else if (m.type === "EXPENSE" || m.type === "FX_LOSS" || m.type === "OPERATOR_PAYMENT") {
        return sum - amount
      }
      return sum
    }, 0)

    balancesMap.set(accountId, initialBalance + movementsSum)
  }

  return balancesMap
}
