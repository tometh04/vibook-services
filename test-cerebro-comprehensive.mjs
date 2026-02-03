#!/usr/bin/env node
/**
 * Test Exhaustivo de Cerebro
 * Prueba todas las preguntas y documenta los resultados
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import OpenAI from 'openai'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config({ path: join(__dirname, '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const openaiKey = process.env.OPENAI_API_KEY

if (!supabaseUrl || !supabaseKey || !openaiKey) {
  console.error('❌ Faltan variables de entorno')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)
const openai = new OpenAI({ apiKey: openaiKey })

// ============================================
// CONFIGURACIÓN DE PREGUNTAS DE PRUEBA
// ============================================

const PREGUNTAS = [
  // Básicas
  { id: 1, categoria: 'Básicas', pregunta: '¿Cuántas operaciones hay en total?' },
  { id: 2, categoria: 'Básicas', pregunta: '¿Cuántos clientes tengo?' },
  { id: 3, categoria: 'Básicas', pregunta: '¿Cuántas leads hay?' },

  // Ventas
  { id: 4, categoria: 'Ventas', pregunta: '¿Cuántas ventas tuve este mes?' },
  { id: 5, categoria: 'Ventas', pregunta: '¿Cuál es el total de ventas de este mes?' },
  { id: 6, categoria: 'Ventas', pregunta: '¿Cuál es la operación con mayor margen?' },

  // Pagos
  { id: 7, categoria: 'Pagos', pregunta: '¿Qué pagos de clientes están pendientes?' },
  { id: 8, categoria: 'Pagos', pregunta: '¿Cuánto me deben los clientes en total?' },
  { id: 9, categoria: 'Pagos', pregunta: '¿Qué pagos a operadores están vencidos?' },

  // Viajes
  { id: 10, categoria: 'Viajes', pregunta: '¿Qué viajes salen esta semana?' },
  { id: 11, categoria: 'Viajes', pregunta: '¿Cuáles son los próximos viajes?' },
  { id: 12, categoria: 'Viajes', pregunta: '¿Qué operaciones están en estado CONFIRMED?' },

  // Finanzas
  { id: 13, categoria: 'Finanzas', pregunta: '¿Cuál es el balance de las cuentas?' },
  { id: 14, categoria: 'Finanzas', pregunta: '¿Cuánto hay en caja?' },
  { id: 15, categoria: 'Finanzas', pregunta: '¿Cuáles son los gastos recurrentes activos?' },

  // Complejas
  { id: 16, categoria: 'Complejas', pregunta: 'Dame un resumen completo del estado de la agencia' },
  { id: 17, categoria: 'Complejas', pregunta: '¿Quiénes son los clientes que más me deben?' },
  { id: 18, categoria: 'Complejas', pregunta: '¿Cuál es el destino más vendido?' },
  { id: 19, categoria: 'Complejas', pregunta: '¿Qué leads están en estado WON?' },
  { id: 20, categoria: 'Complejas', pregunta: '¿Cuántas alertas pendientes hay?' },
]

// ============================================
// FUNCIÓN PARA EJECUTAR QUERY
// ============================================

async function executeQuery(query) {
  try {
    const cleanedQuery = query.trim()
    const { data, error } = await supabase.rpc('execute_readonly_query', {
      query_text: cleanedQuery
    })

    if (error) {
      return { success: false, error: error.message }
    }

    const result = Array.isArray(data) ? data : (data ? [data] : [])
    return { success: true, data: result }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

// ============================================
// FUNCIÓN PARA PROBAR UNA PREGUNTA
// ============================================

async function testPregunta(pregunta, userContext = "Usuario Test") {
  const DATABASE_SCHEMA = `
## ESQUEMA DE BASE DE DATOS - VIBOOK GESTIÓN

### users (Usuarios)
- id, name, email, role, is_active, created_at

### agencies (Agencias)
- id, name, city, country, has_used_trial, is_active, created_at

### operators (Operadores/Proveedores)
- id, agency_id, name, contact_name, contact_email, contact_phone, credit_limit, is_active, created_at

### customers (Clientes)
- id, agency_id, first_name, last_name, phone, email, document_type, document_number, date_of_birth, created_at

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

### payments (Pagos)
- id, operation_id, payer_type, direction ('INCOME','EXPENSE')
- method, amount, currency, exchange_rate, amount_usd
- date_due (fecha vencimiento), date_paid (fecha pago)
- status ('PENDING','PAID','OVERDUE'), reference, notes, account_id, created_at

### operator_payments (Pagos a operadores)
- id, operation_id, operator_id, amount, paid_amount, currency
- due_date, paid_at, status ('PENDING','PAID','OVERDUE'), notes, created_at

### financial_accounts (Cuentas financieras)
- id, agency_id, name, type, currency, current_balance, is_active, created_at

### recurring_payments (Gastos recurrentes)
- id, agency_id, provider_name, amount, currency, frequency, category_id, next_due_date, is_active, created_at

### alerts (Alertas)
- id, agency_id, operation_id, customer_id, user_id, type, status ('PENDING','DONE','IGNORED'), title, description, date_due, created_at

### NOTAS IMPORTANTES:
- Fechas: usar CURRENT_DATE, date_trunc('month', CURRENT_DATE), etc.
- En payments la fecha de vencimiento es "date_due" (NO "due_date")
- En operator_payments la fecha es "due_date" (NO "date_due")
- Para deudores: sale_amount_total - COALESCE(SUM(pagos donde direction='INCOME' AND status='PAID'), 0) = deuda cliente
- Margen = sale_amount_total - operator_cost
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

-- Total operaciones
SELECT COUNT(*) as total FROM operations WHERE status NOT IN ('CANCELLED')

-- Total clientes
SELECT COUNT(*) as total FROM customers

-- Ventas del mes
SELECT COUNT(*) as cantidad, COALESCE(SUM(sale_amount_total), 0) as total
FROM operations
WHERE created_at >= date_trunc('month', CURRENT_DATE) AND status NOT IN ('CANCELLED')

-- Pagos pendientes de clientes (la columna es date_due, NO due_date)
SELECT p.amount, p.currency, p.date_due, p.status
FROM payments p
WHERE p.status = 'PENDING' AND p.direction = 'INCOME'
ORDER BY p.date_due ASC LIMIT 10

-- Viajes próximos
SELECT file_code, destination, departure_date, checkin_date, sale_amount_total, status
FROM operations
WHERE (departure_date >= CURRENT_DATE OR checkin_date >= CURRENT_DATE)
AND status NOT IN ('CANCELLED')
ORDER BY COALESCE(departure_date, checkin_date) ASC LIMIT 10

-- Balance de cuentas
SELECT name, currency, current_balance
FROM financial_accounts
WHERE is_active = true
ORDER BY current_balance DESC

SI UNA QUERY FALLA:
- Intenta con una versión más simple
- Si sigue fallando, responde: "No pude obtener esa información en este momento."
- NUNCA muestres el error técnico
`

  const tools = [
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

  const today = new Date().toISOString().split('T')[0]
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: `Fecha: ${today} | Usuario: ${userContext}\n\nPregunta: ${pregunta}` }
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
  const queriesExecuted = []
  const queryResults = []

  while (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0 && iterations < maxIterations) {
    iterations++
    const toolResults = []

    for (const toolCall of assistantMessage.tool_calls) {
      if (toolCall.function.name === "execute_query") {
        try {
          const args = JSON.parse(toolCall.function.arguments)
          queriesExecuted.push(args.query)

          const result = await executeQuery(args.query)
          queryResults.push({
            query: args.query,
            description: args.description,
            success: result.success,
            data: result.data,
            error: result.error
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
            toolResults.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: JSON.stringify({
                success: false,
                message: "La consulta falló. Intenta con una query más simple o responde que no pudiste obtener la información."
              })
            })
          }
        } catch (error) {
          toolResults.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify({
              success: false,
              message: "Error al procesar. Intenta otra forma."
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

  if (!finalResponse || finalResponse.trim() === "") {
    finalResponse = "No pude procesar tu consulta en este momento."
  }

  return {
    respuesta: finalResponse,
    queriesEjecutadas: queriesExecuted,
    resultados: queryResults,
    iteraciones: iterations
  }
}

// ============================================
// FUNCIÓN PRINCIPAL DE TESTING
// ============================================

async function runTests() {
  console.log('╔' + '═'.repeat(78) + '╗')
  console.log('║' + ' '.repeat(20) + '🧠 TEST EXHAUSTIVO DE CEREBRO' + ' '.repeat(20) + '║')
  console.log('╚' + '═'.repeat(78) + '╝')
  console.log('')

  const resultados = []
  let correctas = 0
  let fallidas = 0

  for (const test of PREGUNTAS) {
    console.log(`\n${'─'.repeat(80)}`)
    console.log(`📝 Test ${test.id}/20 - ${test.categoria}`)
    console.log(`❓ Pregunta: "${test.pregunta}"`)
    console.log('')

    try {
      const startTime = Date.now()
      const resultado = await testPregunta(test.pregunta)
      const endTime = Date.now()
      const duracion = endTime - startTime

      // Determinar si es correcta o fallida
      const contieneError = resultado.respuesta.toLowerCase().includes('no pude') ||
                           resultado.respuesta.toLowerCase().includes('error') ||
                           resultado.respuesta.toLowerCase().includes('problema')

      const tieneQuerysExitosas = resultado.resultados.some(r => r.success && r.data && r.data.length > 0)
      const esGenerica = resultado.respuesta.length < 50 && !tieneQuerysExitosas

      let estado = '✅'
      if (contieneError || esGenerica) {
        estado = '❌'
        fallidas++
      } else {
        correctas++
      }

      console.log(`${estado} Respuesta (${duracion}ms):`)
      console.log(`   ${resultado.respuesta.replace(/\n/g, '\n   ')}`)

      if (resultado.queriesEjecutadas.length > 0) {
        console.log(`\n📊 Queries ejecutadas: ${resultado.queriesEjecutadas.length}`)
        resultado.queriesEjecutadas.forEach((q, idx) => {
          const res = resultado.resultados[idx]
          const statusIcon = res.success ? '✓' : '✗'
          const count = res.success ? `${res.data?.length || 0} rows` : res.error
          console.log(`   ${statusIcon} ${q.substring(0, 70)}... → ${count}`)
        })
      } else {
        console.log(`\n⚠️  No ejecutó queries`)
      }

      resultados.push({
        id: test.id,
        categoria: test.categoria,
        pregunta: test.pregunta,
        respuesta: resultado.respuesta,
        estado,
        duracion,
        queries: resultado.queriesEjecutadas.length,
        exitosas: resultado.resultados.filter(r => r.success).length,
        contieneError,
        esGenerica,
        datosReales: tieneQuerysExitosas
      })

    } catch (error) {
      console.log(`❌ Error ejecutando test:`, error.message)
      resultados.push({
        id: test.id,
        categoria: test.categoria,
        pregunta: test.pregunta,
        respuesta: `ERROR: ${error.message}`,
        estado: '❌',
        duracion: 0,
        queries: 0,
        exitosas: 0,
        contieneError: true,
        esGenerica: false,
        datosReales: false
      })
      fallidas++
    }

    // Pequeña pausa entre tests para no sobrecargar la API
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  // ============================================
  // RESUMEN FINAL
  // ============================================

  console.log(`\n\n${'═'.repeat(80)}`)
  console.log('📊 RESUMEN COMPLETO DEL TEST')
  console.log('═'.repeat(80))

  console.log(`\n📈 ESTADÍSTICAS GENERALES:`)
  console.log(`   Total de preguntas: ${PREGUNTAS.length}`)
  console.log(`   ✅ Correctas: ${correctas} (${Math.round(correctas/PREGUNTAS.length*100)}%)`)
  console.log(`   ❌ Fallidas: ${fallidas} (${Math.round(fallidas/PREGUNTAS.length*100)}%)`)

  // Análisis por categoría
  console.log(`\n📂 ANÁLISIS POR CATEGORÍA:`)
  const categorias = [...new Set(PREGUNTAS.map(p => p.categoria))]
  categorias.forEach(cat => {
    const testsCategoria = resultados.filter(r => r.categoria === cat)
    const correctasCategoria = testsCategoria.filter(r => r.estado === '✅').length
    console.log(`   ${cat}: ${correctasCategoria}/${testsCategoria.length} ` +
                `(${Math.round(correctasCategoria/testsCategoria.length*100)}%)`)
  })

  // Tipos de queries que funcionan
  console.log(`\n✅ TIPOS DE QUERIES QUE FUNCIONAN:`)
  const querysFuncionan = resultados
    .filter(r => r.estado === '✅' && r.datosReales)
    .map(r => `   - ${r.pregunta}`)
  querysFuncionan.forEach(q => console.log(q))

  // Tipos de queries que fallan
  console.log(`\n❌ TIPOS DE QUERIES QUE FALLAN:`)
  const querysFallan = resultados
    .filter(r => r.estado === '❌')
    .map(r => `   - ${r.pregunta}`)
  querysFallan.forEach(q => console.log(q))

  // Problemas encontrados
  console.log(`\n⚠️  PROBLEMAS ENCONTRADOS:`)
  const problemas = []
  const sinQueries = resultados.filter(r => r.queries === 0)
  if (sinQueries.length > 0) {
    problemas.push(`   - ${sinQueries.length} preguntas no ejecutaron queries`)
  }
  const respuestasGenericas = resultados.filter(r => r.esGenerica)
  if (respuestasGenericas.length > 0) {
    problemas.push(`   - ${respuestasGenericas.length} respuestas genéricas sin datos reales`)
  }
  const conErrores = resultados.filter(r => r.contieneError)
  if (conErrores.length > 0) {
    problemas.push(`   - ${conErrores.length} respuestas contienen mensajes de error`)
  }
  if (problemas.length === 0) {
    console.log(`   ✅ No se encontraron problemas significativos`)
  } else {
    problemas.forEach(p => console.log(p))
  }

  // Recomendaciones
  console.log(`\n💡 RECOMENDACIONES DE MEJORA:`)
  const recomendaciones = []

  if (fallidas > PREGUNTAS.length * 0.2) {
    recomendaciones.push(`   - Mejorar el prompt del sistema para manejar más casos`)
  }
  if (respuestasGenericas.length > 3) {
    recomendaciones.push(`   - Agregar más ejemplos de queries en el prompt`)
  }
  if (sinQueries.length > 0) {
    recomendaciones.push(`   - Forzar que siempre se ejecute al menos una query`)
  }
  if (conErrores.length > 0) {
    recomendaciones.push(`   - Mejorar el manejo de errores SQL`)
  }

  if (recomendaciones.length === 0) {
    console.log(`   ✅ El sistema funciona correctamente`)
  } else {
    recomendaciones.forEach(r => console.log(r))
  }

  console.log(`\n${'═'.repeat(80)}`)
  console.log(`🏁 Test completado - ${new Date().toLocaleString()}`)
  console.log('═'.repeat(80))
}

// Ejecutar
runTests().catch(console.error)
