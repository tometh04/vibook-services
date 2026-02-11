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

-- Ventas del mes
SELECT COUNT(*) as cantidad, COALESCE(SUM(sale_amount_total), 0) as total
FROM operations
WHERE created_at >= date_trunc('month', CURRENT_DATE) AND status NOT IN ('CANCELLED')
AND agency_id = ANY({{agency_ids}})

-- Leads por estado
SELECT status, COUNT(*) as cantidad FROM leads
WHERE created_at >= date_trunc('month', CURRENT_DATE)
AND agency_id = ANY({{agency_ids}})
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

// Auto-crear la función RPC si no existe
let rpcVerified = false
async function ensureRPCExists() {
  if (rpcVerified) return
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceKey) return

    const adminClient = createAdminSupabaseClient()
    const { error } = await adminClient.rpc('execute_readonly_query', { query_text: 'SELECT 1 as test' })

    if (error && error.message?.includes('does not exist')) {
      console.log('[Cerebro] RPC function does not exist, creating...')
      // Crear la función usando SQL via REST API
      const createSQL = `
        CREATE OR REPLACE FUNCTION execute_readonly_query(query_text TEXT)
        RETURNS JSONB AS $$
        DECLARE
          result_data JSONB;
          normalized_query TEXT;
        BEGIN
          normalized_query := UPPER(TRIM(query_text));
          IF NOT normalized_query LIKE 'SELECT %' THEN
            RAISE EXCEPTION 'Solo se permiten queries SELECT';
          END IF;
          IF normalized_query LIKE '%INSERT%' OR normalized_query LIKE '%UPDATE%'
             OR normalized_query LIKE '%DELETE%' OR normalized_query LIKE '%DROP%'
             OR normalized_query LIKE '%CREATE%' OR normalized_query LIKE '%ALTER%'
             OR normalized_query LIKE '%TRUNCATE%' OR normalized_query LIKE '%GRANT%'
             OR normalized_query LIKE '%REVOKE%' THEN
            RAISE EXCEPTION 'Query contiene comandos no permitidos';
          END IF;
          EXECUTE format('SELECT jsonb_agg(row_to_json(t)) FROM (%s) t', query_text) INTO result_data;
          IF result_data IS NULL THEN result_data := '[]'::jsonb; END IF;
          RETURN result_data;
        EXCEPTION WHEN OTHERS THEN
          RAISE EXCEPTION 'Error ejecutando query: %', SQLERRM;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
        GRANT EXECUTE ON FUNCTION execute_readonly_query(TEXT) TO authenticated;
      `

      const resp = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({ sql: createSQL })
      })

      if (!resp.ok) {
        // Try alternative: use the SQL editor API
        console.warn('[Cerebro] Could not auto-create RPC function. It must be created manually via Supabase Dashboard.')
        console.warn('[Cerebro] Run: supabase/migrations/047_create_execute_readonly_query_function.sql')
      } else {
        console.log('[Cerebro] RPC function created successfully!')
      }
    }
    rpcVerified = true
  } catch (err) {
    console.warn('[Cerebro] Error checking RPC:', err)
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
    console.log("[Cerebro] Context:", { agencyCount: context.agencyIds.length, isSuperAdmin: context.isSuperAdmin, userId: context.userId })

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
    const userContext = `Fecha: ${today} | Usuario: ${user.name || user.email} | Rol: ${user.role} | user_id: ${user.id} | agency_ids: ${agencyIds.join(", ") || "SIN_AGENCIAS"}`

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
    const _debugLog: any[] = []

    _debugLog.push({ step: "initial", hasToolCalls: !!(assistantMessage.tool_calls?.length), content: finalResponse?.substring(0, 100) })
    console.log("[Cerebro] Initial response - has tool_calls:", !!(assistantMessage.tool_calls?.length), "content:", finalResponse?.substring(0, 100))

    while (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0 && iterations < maxIterations) {
      iterations++
      const toolResults: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = []

      for (const toolCall of assistantMessage.tool_calls) {
        if (toolCall.function.name === "execute_query") {
          try {
            const args = JSON.parse(toolCall.function.arguments)
            _debugLog.push({ step: `tool_call_${iterations}`, query: args.query?.substring(0, 200), description: args.description })
            const result = await executeQuery(supabaseAdmin, args.query, {
              agencyIds,
              userId: user.id,
              isSuperAdmin,
            })

            if (result.success) {
              _debugLog.push({ step: `tool_result_${iterations}`, success: true, count: result.data?.length || 0 })
              console.log("[Cerebro] Tool call success, data count:", result.data?.length || 0)
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
              _debugLog.push({ step: `tool_result_${iterations}`, success: false, error: result.error })
              console.warn("[Cerebro] Tool call failed:", result.error)
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
            _debugLog.push({ step: `tool_exception_${iterations}`, error: toolError?.message })
            console.error("[Cerebro] Tool call exception:", toolError?.message)
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

    _debugLog.push({ step: "final", iterations, response: finalResponse?.substring(0, 100) })

    return NextResponse.json({ response: finalResponse, _debug: _debugLog })

  } catch (error: any) {
    console.error("[Cerebro] Error:", error)
    // Temporalmente incluir debug info para diagnosticar
    const debugInfo = process.env.NODE_ENV === 'production'
      ? ` [Debug: ${error?.message?.substring(0, 100)}]`
      : ` [${error?.message}]`
    return NextResponse.json({
      response: "Hubo un problema al procesar tu consulta." + debugInfo
    })
  }
}
