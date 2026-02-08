import { resolve } from "path"
import { readFileSync } from "fs"

const loadEnv = () => {
  const paths = [".env.local", ".env"]
  for (const file of paths) {
    try {
      const fullPath = resolve(process.cwd(), file)
      const content = readFileSync(fullPath, "utf-8")
      for (const line of content.split("\n")) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue
        const [key, ...rest] = trimmed.split("=")
        if (!process.env[key]) {
          process.env[key] = rest.join("=").replace(/^['"]|['"]$/g, "")
        }
      }
    } catch {
      // ignore missing env file
    }
  }
}

loadEnv()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const targetEmail = process.env.SEED_USER_EMAIL || "mossottigerardo3@gmail.com"
const seedTag = process.env.SEED_TAG || "SEED_DEMO_2026_02_08"

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase environment variables")
  process.exit(1)
}

const baseHeaders = {
  apikey: supabaseServiceKey,
  Authorization: `Bearer ${supabaseServiceKey}`,
  "Content-Type": "application/json",
}

const request = async (path, options = {}) => {
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...options,
    headers: {
      ...baseHeaders,
      ...options.headers,
    },
  })
  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Supabase error ${response.status}: ${text}`)
  }
  return response.json()
}

const formatDate = (date) => date.toISOString().split("T")[0]
const addDays = (days) => {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return formatDate(d)
}

const exchangeRateUSDToARS = 1100

const getUserAndAgency = async () => {
  const params = new URLSearchParams({
    select: "id,email,name,role",
    email: `eq.${targetEmail}`,
  })
  const users = await request(`users?${params.toString()}`)
  if (!users.length) {
    throw new Error(`No se encontró el usuario ${targetEmail} en la tabla users`)
  }

  const user = users[0]
  const uaParams = new URLSearchParams({
    select: "agency_id,agencies(id,name)",
    user_id: `eq.${user.id}`,
  })
  const userAgencies = await request(`user_agencies?${uaParams.toString()}`)
  if (!userAgencies.length) {
    throw new Error(`El usuario ${targetEmail} no tiene agencias asignadas`)
  }

  const agencyId = userAgencies[0].agency_id
  const agencyName = userAgencies[0].agencies?.name || "Agencia"

  return { user, agencyId, agencyName }
}

const getChartAccountId = async (accountCode, agencyId) => {
  const params = new URLSearchParams({
    select: "id,agency_id",
    account_code: `eq.${accountCode}`,
    is_active: "eq.true",
  })
  const accounts = await request(`chart_of_accounts?${params.toString()}`)
  if (!accounts.length) return null
  const agencySpecific = accounts.find((acc) => acc.agency_id === agencyId)
  return (agencySpecific || accounts[0]).id
}

const ensureFinancialAccount = async ({
  agencyId,
  name,
  type,
  currency,
  chartAccountId,
  createdBy,
  initialBalance,
}) => {
  const params = new URLSearchParams({
    select: "id,name,type,currency",
    agency_id: `eq.${agencyId}`,
    type: `eq.${type}`,
  })
  const existing = await request(`financial_accounts?${params.toString()}`)
  if (existing.length) return existing[0].id

  const payload = [
    {
      agency_id: agencyId,
      name,
      type,
      currency,
      chart_account_id: chartAccountId,
      created_by: createdBy,
      initial_balance: initialBalance,
      is_active: true,
      notes: `Seed ${seedTag}`,
    },
  ]

  const inserted = await request("financial_accounts", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(payload),
  })
  return inserted[0].id
}

const ensureCashBox = async ({
  agencyId,
  name,
  currency,
  createdBy,
  initialBalance,
  isDefault,
}) => {
  const params = new URLSearchParams({
    select: "id,name,currency",
    agency_id: `eq.${agencyId}`,
    currency: `eq.${currency}`,
    is_active: "eq.true",
  })
  const existing = await request(`cash_boxes?${params.toString()}`)
  if (existing.length) return existing[0].id

  const payload = [
    {
      agency_id: agencyId,
      name,
      currency,
      box_type: currency === "USD" ? "USD" : "MAIN",
      initial_balance: initialBalance,
      current_balance: initialBalance,
      is_active: true,
      is_default: isDefault,
      created_by: createdBy,
      notes: `Seed ${seedTag}`,
    },
  ]

  const inserted = await request("cash_boxes", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(payload),
  })
  return inserted[0].id
}

const main = async () => {
  console.log("🌱 Iniciando seed demo...")

  const { user, agencyId, agencyName } = await getUserAndAgency()

  const existingOpsParams = new URLSearchParams({
    select: "id",
    agency_id: `eq.${agencyId}`,
    file_code: "eq.SEED-001",
  })
  const existingOps = await request(`operations?${existingOpsParams.toString()}`)
  if (existingOps.length) {
    console.log("✅ Seed demo ya existe para esta agencia. No se insertan datos duplicados.")
    return
  }

  const cashChartId = await getChartAccountId("1.1.01", agencyId)
  const usdAccountId = await ensureFinancialAccount({
    agencyId,
    name: "Caja USD Seed",
    type: "CASH_USD",
    currency: "USD",
    chartAccountId: cashChartId,
    createdBy: user.id,
    initialBalance: 1200,
  })
  const arsAccountId = await ensureFinancialAccount({
    agencyId,
    name: "Caja ARS Seed",
    type: "CASH_ARS",
    currency: "ARS",
    chartAccountId: cashChartId,
    createdBy: user.id,
    initialBalance: 350000,
  })

  const usdCashBoxId = await ensureCashBox({
    agencyId,
    name: "Caja Principal USD",
    currency: "USD",
    createdBy: user.id,
    initialBalance: 800,
    isDefault: true,
  })
  const arsCashBoxId = await ensureCashBox({
    agencyId,
    name: "Caja Principal ARS",
    currency: "ARS",
    createdBy: user.id,
    initialBalance: 250000,
    isDefault: false,
  })

  const operators = await (async () => {
    const params = new URLSearchParams({
      select: "id,name",
      agency_id: `eq.${agencyId}`,
    })
    const existing = await request(`operators?${params.toString()}`)
    if (existing.length) return existing

    const payload = [
      { name: "Operador Caribe", credit_limit: 1200000 },
      { name: "Turismo Nacional", credit_limit: 650000 },
      { name: "Aerolíneas Demo", credit_limit: 900000 },
    ].map((op) => ({
      ...op,
      agency_id: agencyId,
      is_active: true,
    }))

    return request("operators", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(payload),
    })
  })()

  const customers = await (async () => {
    const params = new URLSearchParams({
      select: "id,email,first_name,last_name",
      agency_id: `eq.${agencyId}`,
      email: "ilike.seed.%",
    })
    const existing = await request(`customers?${params.toString()}`)
    if (existing.length) return existing

    const payload = [
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
    }))

    return request("customers", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(payload),
    })
  })()

  const leadsParams = new URLSearchParams({
    select: "id",
    agency_id: `eq.${agencyId}`,
    notes: `ilike.*${seedTag}*`,
  })
  const existingLeads = await request(`leads?${leadsParams.toString()}`)
  if (!existingLeads.length) {
    await request("leads", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify([
        {
          agency_id: agencyId,
          contact_name: "Lucia Herrera",
          contact_phone: "+54 9 11 6000-6000",
          contact_email: "seed.lead1@vibook.ai",
          destination: "Bariloche",
          region: "Patagonia",
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
          region: "Caribe",
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
          region: "Europa",
          status: "QUOTED",
          assigned_seller_id: user.id,
          notes: `Seed ${seedTag}`,
        },
      ]),
    })
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
      sale_currency: "USD",
      operator_cost_currency: "USD",
      file_code: op.code,
      notes: `Seed ${seedTag}`,
    }
  })

  const createdOperations = await request("operations", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(operationsPayload),
  })

  await request("operation_customers", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(
      createdOperations.map((op, index) => ({
        operation_id: op.id,
        customer_id: customers[index % customers.length].id,
        role: "MAIN",
      })),
    ),
  })

  const paymentsToInsert = []
  const operatorPaymentsToInsert = []
  const cashMovementsToInsert = []
  const ledgerMovementsToInsert = []
  const alertsToInsert = []

  const pushLedger = (params) => {
    const amountARS =
      params.currency === "USD" ? params.amount * exchangeRateUSDToARS : params.amount
    ledgerMovementsToInsert.push({
      account_id: params.accountId,
      agency_id: agencyId,
      type: params.type,
      concept: params.concept,
      currency: params.currency,
      amount_original: params.amount,
      exchange_rate: params.currency === "USD" ? exchangeRateUSDToARS : null,
      amount_ars_equivalent: amountARS,
      method: params.method,
      operation_id: params.operationId || null,
      operator_id: params.operatorId || null,
      created_by: user.id,
      notes: `Seed ${seedTag}`,
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
        date_due: addDays(-10),
        date_paid: addDays(-8),
        status: "PAID",
        account_id: usdAccountId,
      })

      operatorPaymentsToInsert.push({
        operation_id: op.id,
        operator_id: op.operator_id,
        amount: cost,
        paid_amount: cost,
        currency: "USD",
        due_date: addDays(-12),
        status: "PAID",
        notes: `Seed ${seedTag}`,
      })

      cashMovementsToInsert.push({
        agency_id: agencyId,
        cash_box_id: usdCashBoxId,
        account_id: usdAccountId,
        user_id: user.id,
        type: "INCOME",
        category: "Ventas",
        amount: sale,
        currency: "USD",
        movement_date: addDays(-8),
        notes: `Seed ${seedTag}`,
      })

      cashMovementsToInsert.push({
        agency_id: agencyId,
        cash_box_id: usdCashBoxId,
        account_id: usdAccountId,
        user_id: user.id,
        type: "EXPENSE",
        category: "Pago a operador",
        amount: cost,
        currency: "USD",
        movement_date: addDays(-7),
        notes: `Seed ${seedTag}`,
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
        date_due: addDays(-3),
        date_paid: addDays(-2),
        status: "PAID",
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
        date_due: addDays(10),
        status: "PENDING",
        account_id: usdAccountId,
      })

      operatorPaymentsToInsert.push({
        operation_id: op.id,
        operator_id: op.operator_id,
        amount: cost,
        paid_amount: Math.round(cost * 0.4),
        currency: "USD",
        due_date: addDays(5),
        status: "PENDING",
        notes: `Seed ${seedTag}`,
      })

      cashMovementsToInsert.push({
        agency_id: agencyId,
        cash_box_id: usdCashBoxId,
        account_id: usdAccountId,
        user_id: user.id,
        type: "INCOME",
        category: "Ventas",
        amount: paid,
        currency: "USD",
        movement_date: addDays(-2),
        notes: `Seed ${seedTag}`,
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
        user_id: user.id,
        type: "PAYMENT_DUE",
        description: `Cobro pendiente ${op.destination} (${pending} USD)`,
        date_due: addDays(10),
        status: "PENDING",
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
        date_due: addDays(-1),
        date_paid: addDays(-1),
        status: "PAID",
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
        date_due: addDays(14),
        status: "PENDING",
        account_id: usdAccountId,
      })

      operatorPaymentsToInsert.push({
        operation_id: op.id,
        operator_id: op.operator_id,
        amount: cost,
        paid_amount: 0,
        currency: "USD",
        due_date: addDays(12),
        status: "PENDING",
        notes: `Seed ${seedTag}`,
      })

      cashMovementsToInsert.push({
        agency_id: agencyId,
        cash_box_id: usdCashBoxId,
        account_id: usdAccountId,
        user_id: user.id,
        type: "INCOME",
        category: "Ventas",
        amount: paid,
        currency: "USD",
        movement_date: addDays(-1),
        notes: `Seed ${seedTag}`,
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
        user_id: user.id,
        type: "PAYMENT_DUE",
        description: `Cobro pendiente ${op.destination} (${pending} USD)`,
        date_due: addDays(14),
        status: "PENDING",
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
        date_due: addDays(7),
        status: "PENDING",
        account_id: usdAccountId,
      })

      operatorPaymentsToInsert.push({
        operation_id: op.id,
        operator_id: op.operator_id,
        amount: cost,
        paid_amount: 0,
        currency: "USD",
        due_date: addDays(15),
        status: "PENDING",
        notes: `Seed ${seedTag}`,
      })

      alertsToInsert.push({
        agency_id: agencyId,
        operation_id: op.id,
        user_id: user.id,
        type: "PAYMENT_DUE",
        description: `Seña pendiente ${op.destination} (${deposit} USD)`,
        date_due: addDays(7),
        status: "PENDING",
      })
    }
  }

  if (paymentsToInsert.length) {
    await request("payments", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(paymentsToInsert),
    })
  }

  if (operatorPaymentsToInsert.length) {
    await request("operator_payments", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(operatorPaymentsToInsert),
    })
  }

  if (cashMovementsToInsert.length) {
    await request("cash_movements", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(cashMovementsToInsert),
    })
  }

  if (ledgerMovementsToInsert.length) {
    await request("ledger_movements", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(ledgerMovementsToInsert),
    })
  }

  if (alertsToInsert.length) {
    await request("alerts", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(alertsToInsert),
    })
  }

  console.log(`✅ Seed demo cargado para ${agencyName} (${targetEmail})`)
}

main().catch((error) => {
  console.error("❌ Error en seed demo:", error.message || error)
  process.exit(1)
})
