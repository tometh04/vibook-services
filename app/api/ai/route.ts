import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import OpenAI from "openai"
import { createAdminSupabaseClient } from "@/lib/supabase/admin"
import { getUserAgencyIds } from "@/lib/permissions-api"
import { verifyFeatureAccess } from "@/lib/billing/subscription-middleware"

// Esquema REAL de la base de datos - Actualizado 2025-01-28
const DATABASE_SCHEMA = `
## ESQUEMA DE BASE DE DATOS - VIBOOK GESTIÓN

### users (Usuarios)
- id, name, email, role ('SUPER_ADMIN','ADMIN','CONTABLE','SELLER','VIEWER'), is_active, created_at

### agencies (Agencias)
- id, name, city, timezone, has_used_trial, created_at, updated_at
- ⚠️ NO tiene is_active ni country

### user_agencies (Relación usuarios-agencias)
- id, user_id, agency_id, role

### operators (Operadores/Proveedores)
- id, agency_id, name, contact_name, contact_email, contact_phone, credit_limit, is_active, created_at

### customers (Clientes)
- id, agency_id, first_name, last_name, phone, email, document_type, document_number, procedure_number, date_of_birth, instagram, address, city, country, created_at

### leads (Consultas)
- id, agency_id, source, status ('NEW','IN_PROGRESS','QUOTED','WON','LOST'), region, destination
- contact_name, contact_phone, contact_email, assigned_seller_id, travel_date, return_date, loss_reason, created_at

### operations (Operaciones/Ventas) ⭐
- id, file_code, agency_id, lead_id, seller_id, seller_secondary_id, operator_id
- ⚠️ NO tiene customer_id directo. Para obtener el cliente: JOIN operation_customers oc ON oc.operation_id = operations.id AND oc.role = 'MAIN' JOIN customers c ON c.id = oc.customer_id
- type ('FLIGHT','HOTEL','PACKAGE','CRUISE','TRANSFER','MIXED'), product_type, origin, destination
- departure_date, return_date, operation_date, checkin_date, checkout_date
- adults, children, infants
- status ('PRE_RESERVATION','RESERVED','CONFIRMED','CANCELLED','TRAVELLED','CLOSED')
- sale_amount_total (venta total), currency ('ARS','USD'), sale_currency
- operator_cost (costo operador), operator_cost_currency, margin_amount (ganancia), margin_percentage
- billing_margin, billing_margin_amount, billing_margin_percentage
- reservation_code_air, reservation_code_hotel
- notes, created_at, updated_at

### operation_customers (Pasajeros de operación)
- id, operation_id, customer_id, role ('MAIN','COMPANION')

### operation_passengers (Datos pasajeros)
- id, operation_id, first_name, last_name, document_type, document_number, date_of_birth, nationality
- passport_number, passport_expiry, gender

### payments (Pagos)
- id, operation_id, payer_type ('CUSTOMER','OPERATOR'), direction ('INCOME','EXPENSE')
- method, amount, currency, exchange_rate, amount_usd
- date_due (fecha vencimiento), date_paid (fecha pago)
- status ('PENDING','PAID','OVERDUE'), reference, notes, account_id, created_at

### operator_payments (Pagos a operadores)
- id, operation_id, operator_id, amount, paid_amount, currency
- due_date, paid_at, status ('PENDING','PAID','OVERDUE'), notes, created_at

### financial_accounts (Cuentas financieras / Caja)
- id, agency_id, name, type ('CASH','BANK','MP','USD','OTHER','SAVINGS_ARS','SAVINGS_USD','CHECKING_ARS','CHECKING_USD','CASH_ARS','CASH_USD','CREDIT_CARD','ASSETS')
- currency ('ARS','USD'), initial_balance, is_active, notes, created_at
- ⚠️ NO tiene current_balance. El balance actual se calcula: initial_balance + SUM(cash_movements donde type='INCOME') - SUM(cash_movements donde type='EXPENSE')
- También: account_number, bank_name, card_number, card_holder, card_expiry_date, asset_type, asset_description, asset_quantity

### cash_boxes (Cajas) ⭐ PARA SABER "CUÁNTO HAY EN CAJA"
- id, agency_id, name, description, box_type ('MAIN','PETTY','USD','BANK','OTHER')
- currency ('ARS','USD'), initial_balance, current_balance, is_active, created_at

### cash_movements (Movimientos de caja)
- id, agency_id, operation_id, user_id, cash_box_id, type ('INCOME','EXPENSE'), category, amount, currency, movement_date, notes, created_at

### ledger_movements (Movimientos contables)
- id, agency_id, type, concept, currency, amount_original, amount_ars_equivalent, exchange_rate
- financial_account_id, operation_id, created_at

### recurring_payments (Gastos recurrentes)
- id, agency_id, provider_name, amount, currency, frequency ('WEEKLY','BIWEEKLY','MONTHLY','QUARTERLY','YEARLY')
- category_id, next_due_date, is_active, created_at

### recurring_payment_categories (Categorías de gastos)
- id, agency_id, name, description, color, is_active

### quotations (Cotizaciones)
- id, agency_id, lead_id, seller_id, status ('DRAFT','SENT','APPROVED','REJECTED','CONVERTED')
- total_amount, currency, valid_until, created_at

### quotation_items (Items de cotización)
- id, quotation_id, description, quantity, unit_price, total_price

### whatsapp_messages (Mensajes de WhatsApp)
- id, agency_id, operation_id, customer_id, phone, customer_name, message, whatsapp_link
- status ('PENDING','SENT','DELIVERED'), scheduled_for, sent_at

### documents (Documentos)
- id, agency_id, operation_id, customer_id, name, type, file_url, is_required, uploaded_at

### invoices (Facturas)
- id, agency_id, operation_id, customer_id, invoice_number, invoice_type ('A','B','C','E')
- subtotal, tax_amount, total_amount, currency, issue_date, due_date, status

### alerts (Alertas)
- id, agency_id, operation_id, customer_id, user_id, type ('PAYMENT_DUE','OPERATOR_DUE','UPCOMING_TRIP','MISSING_DOCUMENT','PASSPORT_EXPIRY','BIRTHDAY','GENERIC')
- status ('PENDING','DONE','IGNORED'), title, description, date_due, created_at

### notes (Notas)
- id, agency_id, entity_type ('LEAD','OPERATION','CUSTOMER'), entity_id, user_id, content, created_at

### exchange_rates (Tipos de cambio)
- id, currency_from, currency_to, rate, date, source

### subscriptions (Suscripciones)
- id, agency_id, plan_id, status ('TRIAL','ACTIVE','CANCELED','PAST_DUE','UNPAID','SUSPENDED')
- current_period_start, current_period_end, trial_start, trial_end, mp_preapproval_id

### subscription_plans (Planes)
- id, name ('FREE','STARTER','PRO','ENTERPRISE','TESTER'), display_name, price_monthly
- max_users, max_operations_per_month, max_integrations, is_active

### usage_metrics (Métricas de uso)
- id, agency_id, period_start, period_end, operations_count, users_count, integrations_count

### NOTAS IMPORTANTES:
- Fechas: usar CURRENT_DATE, date_trunc('month', CURRENT_DATE), etc.
- En payments la fecha de vencimiento es "date_due" (NO "due_date")
- En operator_payments la fecha es "due_date" (NO "date_due")
- ⚠️ En operations la columna es "checkin_date" (NO "check_in_date") y "checkout_date" (NO "check_out_date")
- ⚠️⚠️ PROHIBIDO usar columnas: created_at, updated_at, deleted_at en queries (causan error de validación). ALTERNATIVAS: Para filtrar por fecha de creación usa operation_date en operations, date_due en payments, o movement_date en cash_movements. Si necesitas la fecha de creación de clientes/leads, ordena por id DESC en su lugar.
- Para deudores: sale_amount_total - COALESCE(SUM(pagos donde direction='INCOME' AND status='PAID'), 0) = deuda cliente
- Para deuda operadores: operator_payments WHERE status IN ('PENDING','OVERDUE')
- Margen = sale_amount_total - operator_cost
- Tipos de cambio: preferir amount_usd si está disponible, sino usar exchange_rate
- Siempre filtrar por agency_id excepto para SUPER_ADMIN
- Las tablas tienen soft delete o is_active, no usar directamente IS NULL
- ⚠️ operations NO tiene customer_id. Para obtener clientes de una operación: JOIN operation_customers oc ON oc.operation_id = o.id JOIN customers c ON c.id = oc.customer_id
- Para "¿cuánto hay en caja?": SELECT name, currency, current_balance FROM cash_boxes WHERE is_active = true ORDER BY currency, name. NO usar financial_accounts para esto.
- Para ventas = operaciones con status NOT IN ('CANCELLED'). Una operación ES una venta.
- Para "últimos clientes que compraron": usar operation_customers JOIN customers JOIN operations
- Para vendedor con más ventas: operations.seller_id JOIN users
- Para viajes próximos: usar COALESCE(departure_date, checkin_date) para la fecha de salida
`

const SYSTEM_PROMPT = `Eres "Cerebro", el asistente de Vibook Gestión para agencias de viajes.

REGLAS CRÍTICAS:
1. SIEMPRE usa execute_query para obtener datos reales
2. Si una query falla, intenta con otra más simple
3. NUNCA muestres errores técnicos al usuario
4. Responde en español argentino, amigable y conciso
5. Usa emojis para hacer visual (✈️ 🏨 💰 📊 👥)

ESQUEMA:
${DATABASE_SCHEMA}

REGLAS DE TENANCIA (OBLIGATORIAS - TU QUERY SERÁ RECHAZADA SI NO LAS CUMPLÍS):
- SIEMPRE incluí agency_id = ANY({{agency_ids}}) en TODA query que toque tablas con datos de agencia
- Tablas con agency_id directo: operations, customers, leads, operators, cash_boxes, cash_movements, financial_accounts, recurring_payments, alerts, invoices, quotations, documents, notes, whatsapp_messages, ledger_movements
- Tablas SIN agency_id que requieren JOIN: payments (JOIN operations), operator_payments (JOIN operators), operation_customers (JOIN operations), operation_passengers (JOIN operations)
- Para la tabla agencies (no tiene agency_id), usa: id = ANY({{agency_ids}})
- Si consultas user_agencies, filtra por user_id = {{user_id}}
- NUNCA hardcodees IDs reales: usa {{agency_ids}} y {{user_id}} siempre
- ⚠️ Si omitís el filtro {{agency_ids}}, la query será RECHAZADA automáticamente

EJEMPLOS DE QUERIES CORRECTAS:

-- Viajes próximos (usa departure_date O checkin_date)
SELECT o.file_code, o.destination, o.departure_date, o.checkin_date, o.sale_amount_total, o.status,
  c.first_name || ' ' || c.last_name as cliente
FROM operations o
LEFT JOIN operation_customers oc ON oc.operation_id = o.id AND oc.role = 'MAIN'
LEFT JOIN customers c ON c.id = oc.customer_id
WHERE (o.departure_date >= CURRENT_DATE OR o.checkin_date >= CURRENT_DATE)
AND o.status NOT IN ('CANCELLED')
AND o.agency_id = ANY({{agency_ids}})
ORDER BY COALESCE(o.departure_date, o.checkin_date) ASC LIMIT 10

-- Pagos pendientes de clientes (la columna es date_due, NO due_date)
SELECT p.amount, p.currency, p.date_due, p.status
FROM payments p
JOIN operations op ON op.id = p.operation_id
WHERE p.status = 'PENDING' AND p.direction = 'INCOME'
AND op.agency_id = ANY({{agency_ids}})
ORDER BY p.date_due ASC LIMIT 10

-- Deuda a operadores (pagos pendientes)
SELECT op.amount, op.paid_amount, op.currency, op.due_date, op.status, o.name as operador
FROM operator_payments op
JOIN operators o ON o.id = op.operator_id
WHERE op.status IN ('PENDING', 'OVERDUE')
AND o.agency_id = ANY({{agency_ids}})
ORDER BY op.due_date ASC LIMIT 10

-- Cuánto hay en caja (cash_boxes)
SELECT name, currency, current_balance
FROM cash_boxes
WHERE is_active = true AND agency_id = ANY({{agency_ids}})
ORDER BY currency, name

-- Ventas del mes (usar operation_date, NO created_at)
SELECT COUNT(*) as cantidad, COALESCE(SUM(sale_amount_total), 0) as total
FROM operations
WHERE operation_date >= date_trunc('month', CURRENT_DATE) AND status NOT IN ('CANCELLED')
AND agency_id = ANY({{agency_ids}})

-- Leads por estado (usar id para filtrar por mes, NO created_at)
SELECT status, COUNT(*) as cantidad FROM leads
WHERE agency_id = ANY({{agency_ids}})
GROUP BY status

-- Total operaciones
SELECT COUNT(*) as total FROM operations
WHERE status NOT IN ('CANCELLED') AND agency_id = ANY({{agency_ids}})

-- Total clientes
SELECT COUNT(*) as total FROM customers
WHERE agency_id = ANY({{agency_ids}})

-- Gastos recurrentes activos
SELECT rp.provider_name, rp.amount, rp.currency, rp.frequency, rpc.name as categoria
FROM recurring_payments rp
LEFT JOIN recurring_payment_categories rpc ON rpc.id = rp.category_id
WHERE rp.is_active = true AND rp.agency_id = ANY({{agency_ids}})
ORDER BY rp.amount DESC

-- Deudores por ventas (clientes que deben)
SELECT c.first_name, c.last_name, o.file_code, o.sale_amount_total, 
  COALESCE(SUM(p.amount), 0) as pagado
FROM operations o
JOIN operation_customers oc ON oc.operation_id = o.id AND oc.role = 'MAIN'
JOIN customers c ON c.id = oc.customer_id
LEFT JOIN payments p ON p.operation_id = o.id AND p.direction = 'INCOME' AND p.status = 'PAID'
WHERE o.status NOT IN ('CANCELLED') AND o.agency_id = ANY({{agency_ids}})
GROUP BY c.id, c.first_name, c.last_name, o.id, o.file_code, o.sale_amount_total
HAVING o.sale_amount_total > COALESCE(SUM(p.amount), 0)
LIMIT 20

-- Buscar cliente por nombre (SIEMPRE usar ILIKE para búsquedas de texto)
SELECT first_name, last_name, email, phone, document_number
FROM customers
WHERE (first_name ILIKE '%thomas%' OR last_name ILIKE '%thomas%')
AND agency_id = ANY({{agency_ids}})

-- Buscar datos de un cliente específico con sus operaciones
SELECT c.first_name, c.last_name, c.email, c.phone, o.file_code, o.destination,
  o.sale_amount_total, o.status
FROM customers c
LEFT JOIN operation_customers oc ON oc.customer_id = c.id AND oc.role = 'MAIN'
LEFT JOIN operations o ON o.id = oc.operation_id
WHERE (c.first_name ILIKE '%nombre%' OR c.last_name ILIKE '%nombre%')
AND c.agency_id = ANY({{agency_ids}})

-- Deuda de un cliente específico
SELECT c.first_name, c.last_name, o.file_code, o.sale_amount_total,
  COALESCE(SUM(p.amount), 0) as pagado,
  o.sale_amount_total - COALESCE(SUM(p.amount), 0) as deuda
FROM customers c
JOIN operation_customers oc ON oc.customer_id = c.id AND oc.role = 'MAIN'
JOIN operations o ON o.id = oc.operation_id
LEFT JOIN payments p ON p.operation_id = o.id AND p.direction = 'INCOME' AND p.status = 'PAID'
WHERE (c.first_name ILIKE '%nombre%' OR c.last_name ILIKE '%nombre%')
AND o.agency_id = ANY({{agency_ids}})
GROUP BY c.id, c.first_name, c.last_name, o.id, o.file_code, o.sale_amount_total

-- Margen de operaciones (margen = venta - costo operador)
SELECT file_code, destination, sale_amount_total, operator_cost,
  sale_amount_total - COALESCE(operator_cost, 0) as margen,
  CASE WHEN sale_amount_total > 0
    THEN ROUND(((sale_amount_total - COALESCE(operator_cost, 0)) / sale_amount_total * 100)::numeric, 1)
    ELSE 0 END as margen_porcentaje
FROM operations
WHERE status NOT IN ('CANCELLED') AND agency_id = ANY({{agency_ids}})

REGLAS DE BÚSQUEDA POR NOMBRE:
- SIEMPRE usá ILIKE con comodines para buscar por nombre: first_name ILIKE '%texto%' OR last_name ILIKE '%texto%'
- Las columnas first_name y last_name pueden estar en MAYÚSCULAS, minúsculas o mixto - ILIKE los matchea todos
- Si el usuario pregunta por "Thomas Sanchez", buscá: first_name ILIKE '%thomas%' OR last_name ILIKE '%sanchez%'
- Si solo da un nombre, buscá en AMBOS campos: first_name ILIKE '%nombre%' OR last_name ILIKE '%nombre%'

REGLAS PARA RESULTADOS VACÍOS:
- Si una query devuelve 0 resultados (data: [], count: 0), eso NO es un error
- Respondé claramente: "No hay [X] registrados/as en este momento"
- NUNCA digas "No pude obtener esa información" cuando el resultado es un array vacío - eso es información válida (la tabla está vacía)
- Solo decí "No pude obtener esa información" si la query FALLÓ con un error real

SI UNA QUERY FALLA:
- Intenta con una versión más simple
- Si sigue fallando, responde: "No pude obtener esa información en este momento. ¿Puedo ayudarte con algo más?"
- NUNCA muestres el error técnico
`

const TENANT_TABLES = [
  "agencies",
  "user_agencies",
  "operators",
  "customers",
  "leads",
  "operations",
  "operation_customers",
  "operation_passengers",
  "payments",
  "operator_payments",
  "financial_accounts",
  "cash_boxes",
  "cash_movements",
  "ledger_movements",
  "recurring_payments",
  "recurring_payment_categories",
  "quotations",
  "quotation_items",
  "whatsapp_messages",
  "documents",
  "invoices",
  "alerts",
  "notes",
  "subscriptions",
  "usage_metrics",
  "tenant_branding",
  "customer_settings",
  "operation_settings",
  "financial_settings",
]

const containsTenantTable = (query: string) => {
  const normalized = query.toLowerCase()
  return TENANT_TABLES.some((table) => {
    // Match table name as word boundary: after space/comma/join/from, before space/comma/newline/tab/;/)/end
    const regex = new RegExp(`(?:^|\\s|,|\\()${table}(?:\\s|,|\\n|\\t|;|\\)|$)`)
    return regex.test(normalized)
  })
}

const buildAgencyArrayLiteral = (agencyIds: string[]) => {
  const values = agencyIds.map((id) => `'${id}'::uuid`).join(",")
  return `ARRAY[${values}]::uuid[]`
}

const applyQueryContext = (query: string, agencyIds: string[], userId: string) => {
  let resolved = query
  if (resolved.includes("{{agency_ids}}")) {
    resolved = resolved.replaceAll("{{agency_ids}}", buildAgencyArrayLiteral(agencyIds))
  }
  if (resolved.includes("{{user_id}}")) {
    resolved = resolved.replaceAll("{{user_id}}", `'${userId}'::uuid`)
  }
  return resolved
}

// Flag para saber si la RPC tiene el bug de LIKE '%CREATE%' (bloquea created_at)
let rpcHasLikeBug = false
let rpcVerified = false

async function ensureRPCExists() {
  if (rpcVerified) return
  try {
    const adminClient = createAdminSupabaseClient()

    // Test básico
    const { error } = await adminClient.rpc('execute_readonly_query', { query_text: 'SELECT 1 as test' })

    if (error && error.message?.includes('does not exist')) {
      console.warn('[Cerebro] RPC function does not exist. Must be created via Supabase Dashboard.')
      console.warn('[Cerebro] Run: supabase/migrations/048_fix_execute_readonly_query_validation.sql')
      rpcVerified = true
      return
    }

    // Test si tiene el bug de LIKE (created_at matchea %CREATE%)
    const { error: likeError } = await adminClient.rpc('execute_readonly_query', {
      query_text: "SELECT 1 as test WHERE 1=1 AND 'created_at' IS NOT NULL"
    })

    if (likeError && likeError.message?.includes('comandos no permitidos')) {
      console.warn('[Cerebro] ⚠️ RPC function has LIKE bug (created_at matches %CREATE%). Will skip RPC validation.')
      rpcHasLikeBug = true
    } else {
      console.log('[Cerebro] RPC function OK - word boundary regex validation working')
    }

    rpcVerified = true
  } catch (err) {
    console.warn('[Cerebro] Error checking RPC:', err)
    rpcVerified = true
  }
}

// Ejecutar consulta SQL de forma segura
async function executeQuery(
  supabase: any,
  query: string,
  context: { agencyIds: string[]; userId: string; isSuperAdmin: boolean }
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const cleanedQuery = query.trim()
    const normalizedQuery = cleanedQuery.toUpperCase()
    
    if (!normalizedQuery.startsWith("SELECT")) {
      return { success: false, error: "Solo SELECT permitido" }
    }

    if (!context.isSuperAdmin) {
      if (context.agencyIds.length === 0) {
        return { success: false, error: "Usuario sin agencias asignadas" }
      }

      if (containsTenantTable(cleanedQuery)) {
        const hasAgencyPlaceholder = cleanedQuery.includes("{{agency_ids}}")
        const hasUserPlaceholder = cleanedQuery.includes("{{user_id}}")
        if (!hasAgencyPlaceholder && !hasUserPlaceholder) {
          return { success: false, error: "Falta filtro de agencias (usa {{agency_ids}} / {{user_id}})" }
        }
      }
    }

    const needsContext = cleanedQuery.includes("{{agency_ids}}") || cleanedQuery.includes("{{user_id}}")
    const resolvedQuery = needsContext
      ? applyQueryContext(cleanedQuery, context.agencyIds, context.userId)
      : cleanedQuery
    
    console.log("[Cerebro] Executing query:", resolvedQuery.substring(0, 300))
    console.log("[Cerebro] Context:", { agencyCount: context.agencyIds.length, isSuperAdmin: context.isSuperAdmin, rpcHasLikeBug })

    const { data, error } = await supabase.rpc('execute_readonly_query', { query_text: resolvedQuery })

    if (error) {
      console.error("[Cerebro] RPC error:", JSON.stringify(error))
      if (error.message?.includes('does not exist')) {
        return { success: false, error: "La función de consultas no está disponible. Contacta a soporte para configurar Cerebro." }
      }
      return { success: false, error: error.message }
    }

    const result = Array.isArray(data) ? data : (data ? [data] : [])
    console.log("[Cerebro] Success - Results count:", result.length)
    return { success: true, data: result }
  } catch (error: any) {
    console.error("[Cerebro] Exception:", error.message)
    return { success: false, error: error.message }
  }
}

export async function POST(request: Request) {
  try {
    const { user } = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const featureAccess = await verifyFeatureAccess(user.id, user.role, "cerebro")
    if (!featureAccess.hasAccess) {
      return NextResponse.json(
        { error: featureAccess.message || "No tiene acceso a Cerebro" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { message } = body

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Mensaje requerido" }, { status: 400 })
    }

    const openaiKey = process.env.OPENAI_API_KEY
    if (!openaiKey) {
      console.error("[Cerebro] OPENAI_API_KEY not configured!")
      return NextResponse.json({
        response: "El servicio de AI no está configurado. Contactá a soporte."
      })
    }

    const openai = new OpenAI({ apiKey: openaiKey })
    // IMPORTANTE: Usar admin client para Cerebro
    // - La autenticación ya se verificó con getCurrentUser() + verifyFeatureAccess()
    // - El admin client bypasea RLS, necesario para execute_readonly_query
    // - El server client (anon key) puede fallar por RLS en la función RPC
    // - La seguridad se maneja en código: solo SELECT, filtro por agency_id obligatorio
    const supabaseAdmin = createAdminSupabaseClient()
    const isSuperAdmin = user.role === "SUPER_ADMIN"
    const agencyIds = await getUserAgencyIds(supabaseAdmin as any, user.id, user.role as any)

    console.log("[Cerebro] User:", user.email, "| Role:", user.role, "| Agencies:", agencyIds.length, "| SuperAdmin:", isSuperAdmin)

    // Ensure RPC function exists (auto-create if possible)
    await ensureRPCExists()

    const today = new Date().toISOString().split('T')[0]
    // NO exponer agency_ids reales al modelo - GPT DEBE usar el placeholder {{agency_ids}}
    // Los placeholders se reemplazan automáticamente antes de ejecutar la query
    const userContext = `Fecha: ${today} | Usuario: ${user.name || user.email} | Rol: ${user.role} | user_id: {{user_id}} | Tiene ${agencyIds.length} agencia(s) asignada(s). SIEMPRE usá {{agency_ids}} en tus queries, NUNCA hardcodees IDs.`

    const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
      {
        type: "function",
        function: {
          name: "execute_query",
          description: "Ejecuta una consulta SQL SELECT para obtener datos del sistema.",
          parameters: {
            type: "object",
            properties: {
              query: { type: "string", description: "Consulta SQL SELECT" },
              description: { type: "string", description: "Qué información busca" }
            },
            required: ["query", "description"]
          }
        }
      }
    ]

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `${userContext}\n\nPregunta: ${message}` }
    ]

    let response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
      tools,
      tool_choice: "auto",
      temperature: 0.3,
      max_tokens: 1500
    })

    let assistantMessage = response.choices[0].message
    let finalResponse = assistantMessage.content || ""
    let iterations = 0
    const maxIterations = 3

    while (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0 && iterations < maxIterations) {
      iterations++
      const toolResults: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = []

      for (const toolCall of assistantMessage.tool_calls) {
        if (toolCall.function.name === "execute_query") {
          try {
            const args = JSON.parse(toolCall.function.arguments)
            const result = await executeQuery(supabaseAdmin, args.query, {
              agencyIds,
              userId: user.id,
              isSuperAdmin,
            })

            if (result.success) {
              toolResults.push({
                role: "tool",
                tool_call_id: toolCall.id,
                content: JSON.stringify({
                  success: true,
                  data: result.data,
                  count: result.data?.length || 0
                })
              })
            } else {
              console.warn("[Cerebro] Query failed:", result.error)
              toolResults.push({
                role: "tool",
                tool_call_id: toolCall.id,
                content: JSON.stringify({
                  success: false,
                  error: result.error,
                  message: "La consulta falló. Intenta con una query más simple o diferente. Error: " + (result.error || "desconocido")
                })
              })
            }
          } catch (toolError: any) {
            console.error("[Cerebro] Tool exception:", toolError?.message)
            toolResults.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: JSON.stringify({
                success: false,
                message: "Error al procesar. Intenta otra forma o responde amablemente que no pudiste obtener la información."
              })
            })
          }
        }
      }

      messages.push(assistantMessage)
      messages.push(...toolResults)

      response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages,
        tools,
        tool_choice: "auto",
        temperature: 0.3,
        max_tokens: 1500
      })

      assistantMessage = response.choices[0].message
      finalResponse = assistantMessage.content || finalResponse
    }

    // Si no hay respuesta, dar una genérica amigable
    if (!finalResponse || finalResponse.trim() === "") {
      finalResponse = "No pude procesar tu consulta en este momento. ¿Puedo ayudarte con algo más?"
    }

    return NextResponse.json({ response: finalResponse })

  } catch (error: any) {
    console.error("[Cerebro] Error:", error)
    return NextResponse.json({
      response: "Hubo un problema al procesar tu consulta. Por favor, intentá de nuevo o contactá a soporte si el problema persiste."
    })
  }
}
