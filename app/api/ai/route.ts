import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import OpenAI from "openai"
import { createServerClient } from "@/lib/supabase/server"

// Esquema REAL de la base de datos - Actualizado 2025-01-28
const DATABASE_SCHEMA = `
## ESQUEMA DE BASE DE DATOS - VIBOOK GESTIÓN

### users (Usuarios)
- id, name, email, role ('SUPER_ADMIN','ADMIN','CONTABLE','SELLER','VIEWER'), is_active, created_at

### agencies (Agencias)
- id, name, city, country, has_used_trial, is_active, created_at

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
- id, file_code, agency_id, seller_id, operator_id, customer_id
- type, origin, destination, departure_date, return_date, checkin_date, checkout_date
- adults, children, infants
- status ('PRE_RESERVATION','RESERVED','CONFIRMED','CANCELLED','TRAVELLING','TRAVELLED','CLOSED')
- sale_amount_total (venta), sale_currency
- operator_cost (costo), margin_amount (ganancia), margin_percentage
- commission_amount, billing_margin, created_at

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

### financial_accounts (Cuentas financieras)
- id, agency_id, name, type ('CASH_ARS','CASH_USD','SAVINGS_ARS','SAVINGS_USD','BANK_ARS','BANK_USD','MERCADOPAGO','CREDIT_CARD')
- currency ('ARS','USD'), current_balance, is_active, created_at

### cash_movements (Movimientos de caja)
- id, agency_id, financial_account_id, type ('INCOME','EXPENSE'), amount, currency, concept, reference, created_at

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
- Para deudores: sale_amount_total - COALESCE(SUM(pagos donde direction='INCOME' AND status='PAID'), 0) = deuda cliente
- Para deuda operadores: operator_payments WHERE status IN ('PENDING','OVERDUE')
- Margen = sale_amount_total - operator_cost
- Tipos de cambio: preferir amount_usd si está disponible, sino usar exchange_rate
- Siempre filtrar por agency_id excepto para SUPER_ADMIN
- Las tablas tienen soft delete o is_active, no usar directamente IS NULL
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

EJEMPLOS DE QUERIES CORRECTAS:

-- Viajes próximos (usa departure_date O checkin_date)
SELECT file_code, destination, departure_date, checkin_date, sale_amount_total, status 
FROM operations 
WHERE (departure_date >= CURRENT_DATE OR checkin_date >= CURRENT_DATE)
AND status NOT IN ('CANCELLED')
ORDER BY COALESCE(departure_date, checkin_date) ASC LIMIT 10

-- Pagos pendientes de clientes (la columna es date_due, NO due_date)
SELECT p.amount, p.currency, p.date_due, p.status
FROM payments p
WHERE p.status = 'PENDING' AND p.direction = 'INCOME'
ORDER BY p.date_due ASC LIMIT 10

-- Deuda a operadores (pagos pendientes)
SELECT op.amount, op.paid_amount, op.currency, op.due_date, op.status, o.name as operador
FROM operator_payments op
JOIN operators o ON o.id = op.operator_id
WHERE op.status IN ('PENDING', 'OVERDUE')
ORDER BY op.due_date ASC LIMIT 10

-- Balance de cuentas financieras
SELECT name, currency, current_balance
FROM financial_accounts
WHERE is_active = true
ORDER BY current_balance DESC

-- Ventas del mes
SELECT COUNT(*) as cantidad, COALESCE(SUM(sale_amount_total), 0) as total
FROM operations
WHERE created_at >= date_trunc('month', CURRENT_DATE) AND status NOT IN ('CANCELLED')

-- Leads por estado
SELECT status, COUNT(*) as cantidad FROM leads
WHERE created_at >= date_trunc('month', CURRENT_DATE) GROUP BY status

-- Total operaciones
SELECT COUNT(*) as total FROM operations WHERE status NOT IN ('CANCELLED')

-- Total clientes
SELECT COUNT(*) as total FROM customers

-- Gastos recurrentes activos
SELECT rp.provider_name, rp.amount, rp.currency, rp.frequency, rpc.name as categoria
FROM recurring_payments rp
LEFT JOIN recurring_payment_categories rpc ON rpc.id = rp.category_id
WHERE rp.is_active = true
ORDER BY rp.amount DESC

-- Deudores por ventas (clientes que deben)
SELECT c.first_name, c.last_name, o.file_code, o.sale_amount_total, 
  COALESCE(SUM(p.amount), 0) as pagado
FROM operations o
JOIN customers c ON c.id = o.customer_id
LEFT JOIN payments p ON p.operation_id = o.id AND p.direction = 'INCOME' AND p.status = 'PAID'
WHERE o.status NOT IN ('CANCELLED')
GROUP BY c.id, c.first_name, c.last_name, o.id, o.file_code, o.sale_amount_total
HAVING o.sale_amount_total > COALESCE(SUM(p.amount), 0)
LIMIT 20

SI UNA QUERY FALLA:
- Intenta con una versión más simple
- Si sigue fallando, responde: "No pude obtener esa información en este momento. ¿Puedo ayudarte con algo más?"
- NUNCA muestres el error técnico
`

// Ejecutar consulta SQL de forma segura
async function executeQuery(supabase: any, query: string): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const cleanedQuery = query.trim()
    const normalizedQuery = cleanedQuery.toUpperCase()
    
    if (!normalizedQuery.startsWith("SELECT")) {
      return { success: false, error: "Solo SELECT permitido" }
    }
    
    console.log("[Cerebro] Query:", cleanedQuery.substring(0, 200))
    
    const { data, error } = await supabase.rpc('execute_readonly_query', { query_text: cleanedQuery })
    
    if (error) {
      console.error("[Cerebro] Query error:", error.message)
      return { success: false, error: error.message }
    }
    
    const result = Array.isArray(data) ? data : (data ? [data] : [])
    console.log("[Cerebro] Results:", result.length)
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

    const body = await request.json()
    const { message } = body

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Mensaje requerido" }, { status: 400 })
    }

    const openaiKey = process.env.OPENAI_API_KEY
    if (!openaiKey) {
      return NextResponse.json({ 
        response: "El servicio de AI no está configurado. Contactá a soporte." 
      })
    }

    const openai = new OpenAI({ apiKey: openaiKey })
    const supabase = await createServerClient()

    const today = new Date().toISOString().split('T')[0]
    const userContext = `Fecha: ${today} | Usuario: ${user.name || user.email}`

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
            const result = await executeQuery(supabase, args.query)
            
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
              // Query falló - decirle al AI que intente otra
              toolResults.push({
                role: "tool",
                tool_call_id: toolCall.id,
                content: JSON.stringify({
                  success: false,
                  message: "La consulta falló. Intenta con una query más simple o responde que no pudiste obtener la información."
                })
              })
            }
          } catch {
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
    // NUNCA mostrar errores técnicos al usuario
    return NextResponse.json({ 
      response: "Hubo un problema al procesar tu consulta. Por favor, intentá de nuevo o contactá a soporte si el problema persiste." 
    })
  }
}
