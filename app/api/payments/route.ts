import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/auth"
import {
  createLedgerMovement,
  calculateARSEquivalent,
  getOrCreateDefaultAccount,
} from "@/lib/accounting/ledger"
import {
  getExchangeRate,
  getLatestExchangeRate,
} from "@/lib/accounting/exchange-rates"
import { revalidateTag, CACHE_TAGS } from "@/lib/cache"

/**
 * POST /api/payments
 * Crear un pago y generar movimientos contables asociados:
 * - Registro en tabla payments
 * - Movimiento en ledger_movements (libro mayor)
 * - Movimiento en cash_movements (caja)
 */
export async function POST(request: Request) {
  try {
    const { user } = await getCurrentUser()
    const supabase = await createServerClient()
    const body = await request.json()

    const {
      operation_id,
      payer_type,
      direction,
      method,
      amount,
      currency,
      exchange_rate, // Tipo de cambio (obligatorio para ARS)
      amount_usd,    // Monto equivalente en USD (calculado en frontend)
      date_paid,
      date_due,
      status,
      notes,
      account_id,    // Cuenta financiera (OBLIGATORIO)
    } = body

    if (!operation_id || !payer_type || !direction || !amount || !currency || !account_id) {
      return NextResponse.json({ 
        error: "Faltan campos requeridos. account_id es obligatorio para todos los pagos." 
      }, { status: 400 })
    }

    // Validar que la cuenta financiera existe y está activa
    const { data: account, error: accountError } = await (supabase.from("financial_accounts") as any)
      .select("id, is_active, currency, agency_id")
      .eq("id", account_id)
      .single()

    if (accountError || !account) {
      return NextResponse.json({ error: "Cuenta financiera no encontrada" }, { status: 400 })
    }

    if (!account.is_active) {
      return NextResponse.json({ error: "La cuenta financiera seleccionada no está activa" }, { status: 400 })
    }

    // Validar que la moneda del pago coincida con la moneda de la cuenta
    // O que se proporcione un tipo de cambio si son diferentes
    if (currency !== account.currency) {
      if (!exchange_rate || exchange_rate <= 0) {
        return NextResponse.json(
          { 
            error: `La moneda del pago (${currency}) no coincide con la moneda de la cuenta (${account.currency}). Se requiere un tipo de cambio explícito.` 
          },
          { status: 400 }
        )
      }
    }

    // Validar que para pagos en ARS se incluya el tipo de cambio (necesario para convertir a USD para contabilidad)
    // Para pagos en USD NO se requiere tipo de cambio (el sistema trabaja en USD)
    if (currency === "ARS" && (!exchange_rate || exchange_rate <= 0)) {
      return NextResponse.json({ error: "El tipo de cambio es obligatorio para pagos en ARS" }, { status: 400 })
    }

    // Validaciones de montos
    if (amount < 0) {
      return NextResponse.json({ error: "El monto no puede ser negativo" }, { status: 400 })
    }

    // Validaciones de fechas
    const today = new Date()
    today.setHours(0, 0, 0, 0) // Resetear a medianoche para comparación

    if (date_paid) {
      const paidDate = new Date(date_paid)
      paidDate.setHours(0, 0, 0, 0)
      
      // Validar que date_paid no sea futuro
      if (paidDate > today) {
        return NextResponse.json({ error: "La fecha de pago no puede ser futura" }, { status: 400 })
      }
    }

    // Validar que date_due sea después de date_paid (si ambos están)
    if (date_paid && date_due) {
      const paidDate = new Date(date_paid)
      paidDate.setHours(0, 0, 0, 0)
      
      const dueDate = new Date(date_due)
      dueDate.setHours(0, 0, 0, 0)

      if (dueDate < paidDate) {
        return NextResponse.json({ error: "La fecha de vencimiento debe ser posterior o igual a la fecha de pago" }, { status: 400 })
      }
    }

    // Calcular amount_usd si no viene del frontend
    let finalAmountUsd = amount_usd
    if (!finalAmountUsd) {
      if (currency === "USD") {
        finalAmountUsd = parseFloat(amount)
      } else if (exchange_rate && exchange_rate > 0) {
        finalAmountUsd = parseFloat(amount) / parseFloat(exchange_rate)
      }
    }

    // 1. Crear el pago en tabla payments
    // IMPORTANTE: Si status no se especifica, crear como PENDING para evitar crear movimientos contables duplicados
    // Los movimientos contables se crearán cuando se marque como PAID
    const paymentData = {
        operation_id,
        payer_type,
        direction,
      method: method || "Otro",
      amount,
        currency,
      exchange_rate: currency === "ARS" ? exchange_rate : null, // Solo guardar exchange_rate para ARS
      amount_usd: finalAmountUsd || null,
      date_paid: date_paid || null,
      date_due: date_due || date_paid,
      status: status || "PENDING", // Cambiar default a PENDING para evitar duplicados
      reference: notes || null,
      account_id, // Cuenta financiera obligatoria
    }

    const { data: payment, error: paymentError } = await (supabase.from("payments") as any)
      .insert(paymentData)
      .select()
      .single()

    if (paymentError) {
      console.error("Error creating payment:", paymentError)
      return NextResponse.json({ error: `Error al crear pago: ${paymentError.message}` }, { status: 500 })
    }

    // IMPORTANTE: SIEMPRE crear movimiento en la cuenta financiera para actualizar el saldo
    // Esto se hace para TODOS los pagos (PENDING o PAID)
    try {
      const { createFinancialAccountMovement } = await import("@/lib/accounting/create-financial-account-movement")
      await createFinancialAccountMovement({
        paymentId: payment.id,
        accountId: account_id,
        amount: parseFloat(amount),
        currency: currency as "ARS" | "USD",
        direction: direction as "INCOME" | "EXPENSE",
        operationId: operation_id || null,
        datePaid: date_paid || undefined,
        reference: notes || null,
        method: method || "Transferencia",
        userId: user.id,
        supabase,
        exchangeRate: exchange_rate ? parseFloat(exchange_rate) : null, // Pasar tipo de cambio explícito
      })
      console.log(`✅ Movimiento creado en cuenta financiera ${account_id} para pago ${payment.id}`)
    } catch (financialAccountError: any) {
      console.error("❌ Error creando movimiento en cuenta financiera:", financialAccountError)
      // Eliminar el pago si no se pudo crear el movimiento en la cuenta financiera
      await (supabase.from("payments") as any)
        .delete()
        .eq("id", payment.id)
      
      return NextResponse.json({ 
        error: "Error crítico: No se pudo crear movimiento en cuenta financiera: " + (financialAccountError.message || "Error desconocido")
      }, { status: 500 })
    }

    // Solo crear movimientos contables en RESULTADO si el pago está PAID explícitamente
    // Los movimientos en RESULTADO son para contabilidad (plan contable)
    if (status === "PAID") {
      try {
        // Obtener datos de la operación si existe para pasarlos directamente
        let operationData: any = null
        if (operation_id) {
          const { data: op } = await (supabase.from("operations") as any)
            .select("id, agency_id, seller_id, seller_secondary_id, operator_id, sale_currency, operator_cost_currency")
            .eq("id", operation_id)
            .maybeSingle()
          operationData = op
        }

        // Preparar datos del pago para pasarlos directamente (evita buscar de nuevo)
        const paymentDataForMarkPaid = {
          ...payment,
          operations: operationData,
        }

        // Usar la función compartida para marcar el pago como pagado
        // Pasamos los datos del pago directamente para evitar problemas de timing
        const { markPaymentAsPaid } = await import("@/lib/accounting/mark-payment-paid")
        console.log(`🔄 Marcando pago ${payment.id} como pagado con cuenta financiera ${account_id}`)
        
        const markPaidData = await markPaymentAsPaid({
          paymentId: payment.id,
          datePaid: date_paid || new Date().toISOString().split("T")[0],
          reference: notes || null,
          userId: user.id,
          supabase,
          paymentData: paymentDataForMarkPaid, // Pasar datos directamente
        })

        console.log(`✅ Pago ${payment.id} creado y marcado como pagado con ledger ${markPaidData.ledger_movement_id}`)

      } catch (accountingError: any) {
        console.error("❌ Error creating accounting movements in RESULTADO:", accountingError)
        // El movimiento en cuenta financiera ya se creó, así que el pago es válido
        // Solo retornar warning sobre el movimiento en RESULTADO
        return NextResponse.json({ 
          payment,
          warning: "Pago creado y saldo de cuenta actualizado, pero hubo error en movimientos contables (RESULTADO): " + (accountingError.message || "Error desconocido")
        }, { status: 201 }) // 201 porque el pago se creó y el saldo se actualizó
      }
    } else {
      console.log(`ℹ️ Pago ${payment.id} creado con status ${status || "PENDING"}, no se crearán movimientos contables hasta que se marque como PAID`)
    }

    return NextResponse.json({ payment })
  } catch (error) {
    console.error("Error in POST /api/payments:", error)
    return NextResponse.json({ error: "Error al registrar pago" }, { status: 500 })
  }
}

/**
 * GET /api/payments
 * Obtener pagos, opcionalmente filtrados por operación
 * Con paginación: page (default: 1) y limit (default: 50, max: 200)
 */
export async function GET(request: Request) {
  try {
    const { user } = await getCurrentUser()
    const supabase = await createServerClient()
    const { searchParams } = new URL(request.url)
    
    // CRÍTICO: Obtener agencias del usuario para filtrar
    const { getUserAgencyIds } = await import("@/lib/permissions-api")
    const userAgencyIds = await getUserAgencyIds(supabase, user.id, user.role as any)
    
    const operationId = searchParams.get("operationId")
    const dateFrom = searchParams.get("dateFrom")
    const dateTo = searchParams.get("dateTo")
    const currency = searchParams.get("currency")
    const agencyId = searchParams.get("agencyId")
    const direction = searchParams.get("direction")
    
    // Paginación: usar page en vez de offset para mejor UX
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
    const requestedLimit = parseInt(searchParams.get("limit") || "50")
    const limit = Math.min(requestedLimit, 200) // Máximo 200
    const offset = (page - 1) * limit

    // Query base con relación a operations para obtener agency_id
    let query = supabase.from("payments").select(`
      *,
      operations:operation_id(
        id,
        agency_id,
        agencies:agency_id(
          id,
          name
        )
      )
    `, { count: "exact" })
    
    if (operationId) {
      // CRÍTICO: Validar que la operación pertenezca a la agencia del usuario
      if (user.role !== "SUPER_ADMIN") {
        const { data: operation } = await supabase
          .from("operations")
          .select("id, agency_id")
          .eq("id", operationId)
          .single()
        
        if (!operation || (userAgencyIds.length > 0 && !userAgencyIds.includes((operation as any).agency_id))) {
          return NextResponse.json({ payments: [], pagination: { total: 0, page, limit, totalPages: 0, hasMore: false } })
        }
      }
      query = query.eq("operation_id", operationId)
    } else if (user.role !== "SUPER_ADMIN") {
      // Si no hay operationId, filtrar por operaciones de las agencias del usuario
      if (userAgencyIds.length === 0) {
        return NextResponse.json({ payments: [], pagination: { total: 0, page, limit, totalPages: 0, hasMore: false } })
      }
      
      const { data: operations } = await supabase
        .from("operations")
        .select("id")
        .in("agency_id", userAgencyIds)
      
      const operationIds = (operations || []).map((op: any) => op.id)
      
      if (operationIds.length === 0) {
        return NextResponse.json({ payments: [], pagination: { total: 0, page, limit, totalPages: 0, hasMore: false } })
      }
      
      query = query.in("operation_id", operationIds)
    }

    // Aplicar filtro de direction (INCOME o EXPENSE)
    if (direction && direction !== "ALL") {
      query = query.eq("direction", direction)
    }

    // Aplicar filtros de fecha (usar date_due como referencia principal)
    if (dateFrom) {
      query = query.gte("date_due", dateFrom)
    }
    if (dateTo) {
      query = query.lte("date_due", dateTo)
    }

    // Aplicar filtro de moneda
    if (currency && currency !== "ALL") {
      query = query.eq("currency", currency)
    }

    // Aplicar paginación y ordenamiento
    const { data: payments, error, count } = await query
      .order("date_due", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error("Error fetching payments:", error)
      return NextResponse.json({ error: "Error al obtener pagos" }, { status: 500 })
    }

    // Filtrar por agencia si está especificada
    let filteredPayments = payments || []
    if (agencyId && agencyId !== "ALL") {
      // CRÍTICO: Validar que la agencia pertenezca al usuario
      if (user.role !== "SUPER_ADMIN" && !userAgencyIds.includes(agencyId)) {
        return NextResponse.json({ error: "No tiene permiso para ver pagos de esta agencia" }, { status: 403 })
      }
      filteredPayments = filteredPayments.filter((p: any) => 
        p.operations?.agency_id === agencyId
      )
    } else if (user.role !== "SUPER_ADMIN") {
      // Si no hay agencyId específico, filtrar por agencias del usuario
      filteredPayments = filteredPayments.filter((p: any) => 
        p.operations?.agency_id && userAgencyIds.includes(p.operations.agency_id)
      )
    }

    const totalPages = count ? Math.ceil(count / limit) : 0

    return NextResponse.json({ 
      payments: filteredPayments,
      pagination: {
        total: count || 0,
        page,
        limit,
        totalPages,
        hasMore: page < totalPages
      }
    })
  } catch (error) {
    console.error("Error in GET /api/payments:", error)
    return NextResponse.json({ error: "Error al obtener pagos" }, { status: 500 })
  }
}

/**
 * DELETE /api/payments
 * Eliminar un pago y todos sus movimientos contables asociados
 */
export async function DELETE(request: Request) {
  try {
    const { user } = await getCurrentUser()
    const supabase = await createServerClient()
    const { searchParams } = new URL(request.url)
    
    const paymentId = searchParams.get("paymentId")

    if (!paymentId) {
      return NextResponse.json({ error: "paymentId es requerido" }, { status: 400 })
    }

    // 1. Obtener el pago con su ledger_movement_id
    const { data: payment, error: fetchError } = await (supabase.from("payments") as any)
      .select("*, operation_id")
      .eq("id", paymentId)
      .single()

    if (fetchError || !payment) {
      return NextResponse.json({ error: "Pago no encontrado" }, { status: 404 })
    }

    // 2. Eliminar movimiento de caja relacionado
    const { error: cashError } = await (supabase.from("cash_movements") as any)
      .delete()
      .eq("payment_id", paymentId)

    if (cashError) {
      console.warn("Warning: Could not delete cash movement:", cashError)
    }

    // 3. Eliminar TODOS los ledger movements asociados al pago (no solo el referenciado)
    // Un pago puede generar múltiples movimientos contables (ingreso, costo, IVA, etc.)
    if (payment.ledger_movement_id) {
      // Primero, desmarcar operator_payment si existe
      await (supabase.from("operator_payments") as any)
        .update({
          status: "PENDING",
          ledger_movement_id: null,
          updated_at: new Date().toISOString()
        })
        .eq("ledger_movement_id", payment.ledger_movement_id)
    }

    // Eliminar todos los ledger movements que referencian este pago
    const { error: ledgerError } = await (supabase.from("ledger_movements") as any)
      .delete()
      .eq("payment_id", paymentId)

    if (ledgerError) {
      console.warn("Warning: Could not delete ledger movements by payment_id:", ledgerError)
      // Fallback: eliminar por ledger_movement_id si existe
      if (payment.ledger_movement_id) {
        await (supabase.from("ledger_movements") as any)
          .delete()
          .eq("id", payment.ledger_movement_id)
      }
    }

    // 4. Eliminar el pago
    const { error: deleteError } = await (supabase.from("payments") as any)
      .delete()
      .eq("id", paymentId)

    if (deleteError) {
      console.error("Error deleting payment:", deleteError)
      return NextResponse.json({ error: "Error al eliminar pago" }, { status: 500 })
    }

    console.log(`✅ Pago ${paymentId} eliminado junto con sus movimientos contables`)
    console.log(`  ✓ Cash movement eliminado`)
    console.log(`  ✓ Ledger movement eliminado (si existía)`)
    console.log(`  ✓ Operator payment revertido a PENDING (si estaba marcado como pagado)`)

    // Invalidar caché del dashboard (los KPIs cambian al eliminar un pago)
    revalidateTag(CACHE_TAGS.DASHBOARD)

    return NextResponse.json({ success: true, message: "Pago eliminado correctamente. Los movimientos contables fueron revertidos." })
  } catch (error) {
    console.error("Error in DELETE /api/payments:", error)
    return NextResponse.json({ error: "Error al eliminar pago" }, { status: 500 })
  }
}
