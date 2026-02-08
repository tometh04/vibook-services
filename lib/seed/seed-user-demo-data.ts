import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"

const DEFAULT_SEED_TAG = "SEED_DEMO_2026_02_08"
const USD_TO_ARS_RATE = 1100

const normalizeRows = <T extends Record<string, any>>(rows: T[], keys: string[]) =>
  rows.map((row) => {
    const normalized: Record<string, any> = {}
    for (const key of keys) {
      normalized[key] = row[key] ?? null
    }
    return normalized
  })

const formatDate = (date: Date) => date.toISOString().split("T")[0]
const addDays = (days: number) => {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return formatDate(d)
}

export async function seedUserDemoData(params: { email: string; seedTag?: string }) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Missing Supabase environment variables")
  }

  const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey)
  const seedTag = params.seedTag || DEFAULT_SEED_TAG

  const { data: users, error: userError } = await supabase
    .from("users")
    .select("id,email,name,role")
    .eq("email", params.email)
    .limit(1)

  if (userError) throw userError
  if (!users || users.length === 0) {
    throw new Error(`No se encontró el usuario ${params.email} en la tabla users`)
  }

  const user = users[0]
  const { data: userAgencies, error: uaError } = await supabase
    .from("user_agencies")
    .select("agency_id, agencies(id,name)")
    .eq("user_id", user.id)
    .limit(1)

  if (uaError) throw uaError
  if (!userAgencies || userAgencies.length === 0) {
    throw new Error(`El usuario ${params.email} no tiene agencias asignadas`)
  }

  const agencyId = userAgencies[0].agency_id
  const agencyName = userAgencies[0].agencies?.name || "Agencia"

  const { data: existingOps } = await supabase
    .from("operations")
    .select("id")
    .eq("agency_id", agencyId)
    .eq("file_code", "SEED-001")
    .limit(1)

  if (existingOps && existingOps.length) {
    return { skipped: true, message: "Seed demo ya existe para esta agencia." }
  }

  const { data: chartAccounts } = await supabase
    .from("chart_of_accounts")
    .select("id,agency_id,account_code")
    .eq("account_code", "1.1.01")
    .eq("is_active", true)

  let chartAccountId =
    chartAccounts?.find((acc) => acc.agency_id === agencyId)?.id ||
    chartAccounts?.[0]?.id ||
    null

  if (!chartAccountId) {
    const { data: fallbackAccount, error: fallbackError } = await supabase
      .from("chart_of_accounts")
      .insert({
        agency_id: agencyId,
        account_code: "1.1.01",
        account_name: "Caja",
        category: "ACTIVO",
        subcategory: "CORRIENTE",
        account_type: "CAJA",
        level: 3,
        is_movement_account: true,
        display_order: 10,
        description: "Caja en efectivo (seed)",
        is_active: true,
        created_by: user.id,
      })
      .select("id")
      .single()

    if (fallbackError) throw fallbackError
    chartAccountId = fallbackAccount?.id || null
  }

  if (!chartAccountId) {
    throw new Error("No se pudo obtener un chart_of_accounts para la agencia.")
  }

  const ensureFinancialAccount = async ({
    name,
    type,
    currency,
    initialBalance,
  }: {
    name: string
    type: string
    currency: string
    initialBalance: number
  }) => {
    const { data: existing } = await supabase
      .from("financial_accounts")
      .select("id")
      .eq("agency_id", agencyId)
      .eq("type", type)
      .limit(1)

    if (existing && existing.length) return existing[0].id

    const payload = [
      {
        agency_id: agencyId,
        name,
        type,
        currency,
        chart_account_id: chartAccountId,
        created_by: user.id,
        initial_balance: initialBalance,
        current_balance: initialBalance,
        is_active: true,
        notes: `Seed ${seedTag}`,
      },
    ]

    const { data: inserted, error } = await supabase
      .from("financial_accounts")
      .insert(payload)
      .select("id")

    if (error) throw error
    return inserted?.[0]?.id
  }

  const ensureCashBox = async ({
    name,
    currency,
    initialBalance,
    isDefault,
    boxType,
  }: {
    name: string
    currency: string
    initialBalance: number
    isDefault: boolean
    boxType: "USD" | "MAIN"
  }) => {
    const { data: existing } = await supabase
      .from("cash_boxes")
      .select("id")
      .eq("agency_id", agencyId)
      .eq("currency", currency)
      .eq("is_active", true)
      .limit(1)

    if (existing && existing.length) return existing[0].id

    const payload = [
      {
        agency_id: agencyId,
        name,
        box_type: boxType,
        currency,
        initial_balance: initialBalance,
        current_balance: initialBalance,
        is_active: true,
        is_default: isDefault,
        created_by: user.id,
        notes: `Seed ${seedTag}`,
      },
    ]

    const { data: inserted, error } = await supabase
      .from("cash_boxes")
      .insert(payload)
      .select("id")

    if (error) throw error
    return inserted?.[0]?.id
  }

  const usdAccountId = await ensureFinancialAccount({
    name: "Caja USD Seed",
    type: "CASH_USD",
    currency: "USD",
    initialBalance: 1200,
  })

  const arsAccountId = await ensureFinancialAccount({
    name: "Caja ARS Seed",
    type: "CASH_ARS",
    currency: "ARS",
    initialBalance: 350000,
  })

  const usdCashBoxId = await ensureCashBox({
    name: "Caja Principal USD",
    currency: "USD",
    initialBalance: 800,
    isDefault: true,
    boxType: "USD",
  })

  const arsCashBoxId = await ensureCashBox({
    name: "Caja Principal ARS",
    currency: "ARS",
    initialBalance: 250000,
    isDefault: false,
    boxType: "MAIN",
  })

  const { data: existingOperators } = await supabase
    .from("operators")
    .select("id,name")
    .eq("agency_id", agencyId)

  let operators = existingOperators || []

  if (!operators.length) {
    const { data: createdOperators, error } = await supabase
      .from("operators")
      .insert(
        [
          { name: "Operador Caribe", credit_limit: 1200000 },
          { name: "Turismo Nacional", credit_limit: 650000 },
          { name: "Aerolíneas Demo", credit_limit: 900000 },
        ].map((op) => ({
          ...op,
          agency_id: agencyId,
          is_active: true,
        })),
      )
      .select("id,name")

    if (error) throw error
    operators = createdOperators || []
  }

  const { data: existingCustomers } = await supabase
    .from("customers")
    .select("id,email")
    .eq("agency_id", agencyId)
    .ilike("email", "seed.%")

  let customers = existingCustomers || []

  if (!customers.length) {
    const { data: createdCustomers, error } = await supabase
      .from("customers")
      .insert(
        [
          {
            first_name: "Gerardo",
            last_name: "Mossotti",
            email: "seed.gerardo@vibook.ai",
            phone: "+54 9 11 1000-1000",
            document_type: "DNI",
            document_number: "30111222",
          },
          {
            first_name: "Camila",
            last_name: "Rojas",
            email: "seed.camila@vibook.ai",
            phone: "+54 9 11 2000-2000",
            document_type: "DNI",
            document_number: "30111223",
          },
          {
            first_name: "Lucas",
            last_name: "Sosa",
            email: "seed.lucas@vibook.ai",
            phone: "+54 9 11 3000-3000",
            document_type: "DNI",
            document_number: "30111224",
          },
          {
            first_name: "Valentina",
            last_name: "Suarez",
            email: "seed.valentina@vibook.ai",
            phone: "+54 9 11 4000-4000",
            document_type: "DNI",
            document_number: "30111225",
          },
          {
            first_name: "Santiago",
            last_name: "Perez",
            email: "seed.santiago@vibook.ai",
            phone: "+54 9 11 5000-5000",
            document_type: "DNI",
            document_number: "30111226",
          },
        ].map((cust) => ({
          ...cust,
          agency_id: agencyId,
          city: "Buenos Aires",
          country: "Argentina",
          notes: `Seed ${seedTag}`,
        })),
      )
      .select("id,email")

    if (error) throw error
    customers = createdCustomers || []
  }

  const { data: existingLeads } = await supabase
    .from("leads")
    .select("id")
    .eq("agency_id", agencyId)
    .ilike("notes", `%${seedTag}%`)

  if (!existingLeads || existingLeads.length === 0) {
    const { error } = await supabase.from("leads").insert([
      {
        agency_id: agencyId,
        contact_name: "Lucia Herrera",
        contact_phone: "+54 9 11 6000-6000",
        contact_email: "seed.lead1@vibook.ai",
        destination: "Bariloche",
        region: "ARGENTINA",
        status: "NEW",
        assigned_seller_id: user.id,
        notes: `Seed ${seedTag}`,
      },
      {
        agency_id: agencyId,
        contact_name: "Matias Gomez",
        contact_phone: "+54 9 11 7000-7000",
        contact_email: "seed.lead2@vibook.ai",
        destination: "Cancún",
        region: "CARIBE",
        status: "IN_PROGRESS",
        assigned_seller_id: user.id,
        notes: `Seed ${seedTag}`,
      },
      {
        agency_id: agencyId,
        contact_name: "Florencia Diaz",
        contact_phone: "+54 9 11 8000-8000",
        contact_email: "seed.lead3@vibook.ai",
        destination: "Madrid",
        region: "EUROPA",
        status: "QUOTED",
        assigned_seller_id: user.id,
        notes: `Seed ${seedTag}`,
      },
    ])

    if (error) throw error
  }

  const operationSeeds = [
    { code: "SEED-001", destination: "Aruba", status: "CONFIRMED", sale: 1500, cost: 1000, departure: 20, return: 27 },
    { code: "SEED-002", destination: "Bayahibe", status: "RESERVED", sale: 1200, cost: 800, departure: 40, return: 47 },
    { code: "SEED-003", destination: "Cancún", status: "CLOSED", sale: 2000, cost: 1500, departure: -60, return: -53 },
    { code: "SEED-004", destination: "Miami", status: "PRE_RESERVATION", sale: 900, cost: 600, departure: 10, return: 15 },
    { code: "SEED-005", destination: "Madrid", status: "TRAVELLED", sale: 3200, cost: 2200, departure: -25, return: -18 },
    { code: "SEED-006", destination: "Ushuaia", status: "CONFIRMED", sale: 700, cost: 450, departure: 5, return: 9 },
  ]

  const operationsPayload = operationSeeds.map((op, index) => {
    const margin = op.sale - op.cost
    const marginPct = op.sale > 0 ? (margin / op.sale) * 100 : 0
    const operator = operators[index % operators.length]

    return {
      agency_id: agencyId,
      seller_id: user.id,
      operator_id: operator?.id || null,
      type: "PACKAGE",
      status: op.status,
      origin: "Buenos Aires",
      destination: op.destination,
      departure_date: addDays(op.departure),
      return_date: addDays(op.return),
      operation_date: addDays(op.departure - 25),
      sale_amount_total: op.sale,
      operator_cost: op.cost,
      margin_amount: margin,
      margin_percentage: Math.round(marginPct * 100) / 100,
      currency: "USD",
      file_code: op.code,
      notes: `Seed ${seedTag}`,
    }
  })

  const { data: createdOperations, error: operationsError } = await supabase
    .from("operations")
    .insert(operationsPayload)
    .select("id,file_code,status,sale_amount_total,operator_cost,operator_id,destination")

  if (operationsError) throw operationsError
  if (!createdOperations || !createdOperations.length) {
    throw new Error("No se pudieron crear operaciones")
  }

  await supabase.from("operation_customers").insert(
    createdOperations.map((op, index) => ({
      operation_id: op.id,
      customer_id: customers[index % customers.length].id,
      role: "MAIN",
    })),
  )

  const paymentsToInsert: Record<string, any>[] = []
  const operatorPaymentsToInsert: Record<string, any>[] = []
  const cashMovementsToInsert: Record<string, any>[] = []
  const ledgerMovementsToInsert: Record<string, any>[] = []
  const alertsToInsert: Record<string, any>[] = []

  const pushLedger = (params: {
    accountId: string
    type: string
    concept: string
    currency: string
    amount: number
    method: string
    operationId?: string
    operatorId?: string | null
  }) => {
    const amountARS = params.currency === "USD" ? params.amount * USD_TO_ARS_RATE : params.amount
    ledgerMovementsToInsert.push({
      agency_id: agencyId,
      operation_id: params.operationId || null,
      lead_id: null,
      type: params.type,
      concept: params.concept,
      notes: `Seed ${seedTag}`,
      currency: params.currency,
      amount_original: params.amount,
      exchange_rate: params.currency === "USD" ? USD_TO_ARS_RATE : null,
      amount_ars_equivalent: amountARS,
      method: params.method,
      account_id: params.accountId,
      seller_id: user.id,
      operator_id: params.operatorId || null,
      receipt_number: null,
      created_by: user.id,
    })
  }

  for (const op of createdOperations) {
    const sale = Number(op.sale_amount_total)
    const cost = Number(op.operator_cost)
    const status = op.status

    if (status === "CLOSED" || status === "TRAVELLED") {
      paymentsToInsert.push({
        operation_id: op.id,
        payer_type: "CUSTOMER",
        direction: "INCOME",
        method: "TRANSFER",
        amount: sale,
        currency: "USD",
        amount_usd: sale,
        exchange_rate: null,
        date_due: addDays(-10),
        date_paid: addDays(-8),
        status: "PAID",
        reference: null,
        account_id: usdAccountId,
      })

      operatorPaymentsToInsert.push({
        operation_id: op.id,
        operator_id: op.operator_id,
        amount: cost,
        currency: "USD",
        due_date: addDays(-12),
        status: "PAID",
        ledger_movement_id: null,
        notes: `Seed ${seedTag}`,
      })

      cashMovementsToInsert.push({
        agency_id: agencyId,
        operation_id: op.id,
        user_id: user.id,
        type: "INCOME",
        category: "Ventas",
        amount: sale,
        currency: "USD",
        movement_date: addDays(-8),
        notes: `Seed ${seedTag}`,
        is_touristic: true,
        cash_box_id: usdCashBoxId,
        account_id: usdAccountId,
        ledger_movement_id: null,
      })

      cashMovementsToInsert.push({
        agency_id: agencyId,
        operation_id: op.id,
        user_id: user.id,
        type: "EXPENSE",
        category: "Pago a operador",
        amount: cost,
        currency: "USD",
        movement_date: addDays(-7),
        notes: `Seed ${seedTag}`,
        is_touristic: true,
        cash_box_id: usdCashBoxId,
        account_id: usdAccountId,
        ledger_movement_id: null,
      })

      pushLedger({
        accountId: usdAccountId,
        type: "INCOME",
        concept: `Cobro operación ${op.file_code}`,
        currency: "USD",
        amount: sale,
        method: "CASH",
        operationId: op.id,
      })

      pushLedger({
        accountId: usdAccountId,
        type: "OPERATOR_PAYMENT",
        concept: `Pago operador ${op.file_code}`,
        currency: "USD",
        amount: cost,
        method: "CASH",
        operationId: op.id,
        operatorId: op.operator_id,
      })
    } else if (status === "CONFIRMED") {
      const paid = Math.round(sale * 0.7)
      const pending = sale - paid

      paymentsToInsert.push({
        operation_id: op.id,
        payer_type: "CUSTOMER",
        direction: "INCOME",
        method: "TRANSFER",
        amount: paid,
        currency: "USD",
        amount_usd: paid,
        exchange_rate: null,
        date_due: addDays(-3),
        date_paid: addDays(-2),
        status: "PAID",
        reference: null,
        account_id: usdAccountId,
      })
      paymentsToInsert.push({
        operation_id: op.id,
        payer_type: "CUSTOMER",
        direction: "INCOME",
        method: "TRANSFER",
        amount: pending,
        currency: "USD",
        amount_usd: pending,
        exchange_rate: null,
        date_due: addDays(10),
        date_paid: null,
        status: "PENDING",
        reference: null,
        account_id: usdAccountId,
      })

      operatorPaymentsToInsert.push({
        operation_id: op.id,
        operator_id: op.operator_id,
        amount: cost,
        currency: "USD",
        due_date: addDays(5),
        status: "PENDING",
        ledger_movement_id: null,
        notes: `Seed ${seedTag}`,
      })

      cashMovementsToInsert.push({
        agency_id: agencyId,
        operation_id: op.id,
        user_id: user.id,
        type: "INCOME",
        category: "Ventas",
        amount: paid,
        currency: "USD",
        movement_date: addDays(-2),
        notes: `Seed ${seedTag}`,
        is_touristic: true,
        cash_box_id: usdCashBoxId,
        account_id: usdAccountId,
        ledger_movement_id: null,
      })

      pushLedger({
        accountId: usdAccountId,
        type: "INCOME",
        concept: `Cobro parcial ${op.file_code}`,
        currency: "USD",
        amount: paid,
        method: "CASH",
        operationId: op.id,
      })

      alertsToInsert.push({
        agency_id: agencyId,
        operation_id: op.id,
        customer_id: null,
        user_id: user.id,
        payment_id: null,
        type: "PAYMENT_DUE",
        description: `Cobro pendiente ${op.destination} (${pending} USD)`,
        date_due: addDays(10),
        status: "PENDING",
        priority: "medium",
        snoozed_until: null,
      })
    } else if (status === "RESERVED") {
      const paid = Math.round(sale * 0.4)
      const pending = sale - paid

      paymentsToInsert.push({
        operation_id: op.id,
        payer_type: "CUSTOMER",
        direction: "INCOME",
        method: "CREDIT_CARD",
        amount: paid,
        currency: "USD",
        amount_usd: paid,
        exchange_rate: null,
        date_due: addDays(-1),
        date_paid: addDays(-1),
        status: "PAID",
        reference: null,
        account_id: usdAccountId,
      })
      paymentsToInsert.push({
        operation_id: op.id,
        payer_type: "CUSTOMER",
        direction: "INCOME",
        method: "CREDIT_CARD",
        amount: pending,
        currency: "USD",
        amount_usd: pending,
        exchange_rate: null,
        date_due: addDays(14),
        date_paid: null,
        status: "PENDING",
        reference: null,
        account_id: usdAccountId,
      })

      operatorPaymentsToInsert.push({
        operation_id: op.id,
        operator_id: op.operator_id,
        amount: cost,
        currency: "USD",
        due_date: addDays(12),
        status: "PENDING",
        ledger_movement_id: null,
        notes: `Seed ${seedTag}`,
      })

      cashMovementsToInsert.push({
        agency_id: agencyId,
        operation_id: op.id,
        user_id: user.id,
        type: "INCOME",
        category: "Ventas",
        amount: paid,
        currency: "USD",
        movement_date: addDays(-1),
        notes: `Seed ${seedTag}`,
        is_touristic: true,
        cash_box_id: usdCashBoxId,
        account_id: usdAccountId,
        ledger_movement_id: null,
      })

      pushLedger({
        accountId: usdAccountId,
        type: "INCOME",
        concept: `Reserva ${op.file_code}`,
        currency: "USD",
        amount: paid,
        method: "CASH",
        operationId: op.id,
      })

      alertsToInsert.push({
        agency_id: agencyId,
        operation_id: op.id,
        customer_id: null,
        user_id: user.id,
        payment_id: null,
        type: "PAYMENT_DUE",
        description: `Cobro pendiente ${op.destination} (${pending} USD)`,
        date_due: addDays(14),
        status: "PENDING",
        priority: "medium",
        snoozed_until: null,
      })
    } else {
      const deposit = Math.round(sale * 0.2)

      paymentsToInsert.push({
        operation_id: op.id,
        payer_type: "CUSTOMER",
        direction: "INCOME",
        method: "TRANSFER",
        amount: deposit,
        currency: "USD",
        amount_usd: deposit,
        exchange_rate: null,
        date_due: addDays(7),
        date_paid: null,
        status: "PENDING",
        reference: null,
        account_id: usdAccountId,
      })

      operatorPaymentsToInsert.push({
        operation_id: op.id,
        operator_id: op.operator_id,
        amount: cost,
        currency: "USD",
        due_date: addDays(15),
        status: "PENDING",
        ledger_movement_id: null,
        notes: `Seed ${seedTag}`,
      })

      alertsToInsert.push({
        agency_id: agencyId,
        operation_id: op.id,
        customer_id: null,
        user_id: user.id,
        payment_id: null,
        type: "PAYMENT_DUE",
        description: `Seña pendiente ${op.destination} (${deposit} USD)`,
        date_due: addDays(7),
        status: "PENDING",
        priority: "medium",
        snoozed_until: null,
      })
    }
  }

  if (paymentsToInsert.length) {
    const paymentKeys = [
      "operation_id",
      "payer_type",
      "direction",
      "method",
      "amount",
      "currency",
      "amount_usd",
      "exchange_rate",
      "date_due",
      "date_paid",
      "status",
      "reference",
      "account_id",
    ]
    const { error } = await supabase
      .from("payments")
      .insert(normalizeRows(paymentsToInsert, paymentKeys) as any)

    if (error) throw error
  }

  if (operatorPaymentsToInsert.length) {
    const operatorPaymentKeys = [
      "operation_id",
      "operator_id",
      "amount",
      "currency",
      "due_date",
      "status",
      "ledger_movement_id",
      "notes",
    ]
    const { error } = await supabase
      .from("operator_payments")
      .insert(normalizeRows(operatorPaymentsToInsert, operatorPaymentKeys) as any)

    if (error) throw error
  }

  if (cashMovementsToInsert.length) {
    const cashMovementKeys = [
      "agency_id",
      "operation_id",
      "user_id",
      "type",
      "category",
      "amount",
      "currency",
      "movement_date",
      "notes",
      "is_touristic",
      "cash_box_id",
      "account_id",
      "ledger_movement_id",
    ]
    const { error } = await supabase
      .from("cash_movements")
      .insert(normalizeRows(cashMovementsToInsert, cashMovementKeys) as any)

    if (error) throw error
  }

  if (ledgerMovementsToInsert.length) {
    const ledgerKeys = [
      "agency_id",
      "operation_id",
      "lead_id",
      "type",
      "concept",
      "notes",
      "currency",
      "amount_original",
      "exchange_rate",
      "amount_ars_equivalent",
      "method",
      "account_id",
      "seller_id",
      "operator_id",
      "receipt_number",
      "created_by",
    ]
    const { error } = await supabase
      .from("ledger_movements")
      .insert(normalizeRows(ledgerMovementsToInsert, ledgerKeys) as any)

    if (error) throw error
  }

  if (alertsToInsert.length) {
    const alertKeys = [
      "agency_id",
      "operation_id",
      "customer_id",
      "user_id",
      "payment_id",
      "type",
      "description",
      "date_due",
      "status",
      "priority",
      "snoozed_until",
    ]
    const { error } = await supabase
      .from("alerts")
      .insert(normalizeRows(alertsToInsert, alertKeys) as any)

    if (error) throw error
  }

  return {
    skipped: false,
    message: `Seed demo cargado para ${agencyName} (${params.email})`,
    details: {
      agencyId,
      usdAccountId,
      arsAccountId,
      usdCashBoxId,
      arsCashBoxId,
    },
  }
}
