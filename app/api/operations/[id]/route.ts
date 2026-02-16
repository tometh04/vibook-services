import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/auth"
import { verifySubscriptionAccess } from "@/lib/billing/subscription-middleware"
import { updateSaleIVA, updatePurchaseIVA, deleteSaleIVA, deletePurchaseIVA } from "@/lib/accounting/iva"
import { revalidateTag, CACHE_TAGS } from "@/lib/cache"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await getCurrentUser()
    const supabase = await createServerClient()
    const { id: operationId } = await params

    // CRÍTICO: Validar que la operación pertenezca a la agencia del usuario
    const { getUserAgencyIds } = await import("@/lib/permissions-api")
    const agencyIds = await getUserAgencyIds(supabase, user.id, user.role as any)
    
    let operationQuery = supabase
      .from("operations")
      .select(`
        *,
        sellers:seller_id(id, name, email),
        operators:operator_id(id, name, contact_email, contact_phone),
        agencies:agency_id(id, name, city),
        leads:lead_id(id, contact_name, destination, status)
      `)
      .eq("id", operationId)
    
    // Filtrar por agency_id si no es SUPER_ADMIN
    if (user.role !== "SUPER_ADMIN") {
      if (agencyIds.length === 0) {
        return NextResponse.json({ error: "Operación no encontrada" }, { status: 404 })
      }
      operationQuery = operationQuery.in("agency_id", agencyIds)
    }
    
    const { data: operation, error: operationError } = await operationQuery.single()

    if (operationError || !operation) {
      return NextResponse.json({ error: "Operación no encontrada" }, { status: 404 })
    }

    // Type assertion for operation
    const op = operation as any

    // Check permissions específicas de SELLER
    const userRole = user.role as string
    if (userRole === "SELLER" && op.seller_id !== user.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }

  // OPTIMIZACIÓN: Paralelizar todas las queries relacionadas
  const [
    operationCustomersResult,
    documentsResult,
    paymentsResult,
    alertsResult
  ] = await Promise.all([
    supabase
      .from("operation_customers")
      .select(`
        *,
        customers:customer_id(*)
      `)
      .eq("operation_id", operationId),
    supabase
      .from("documents")
      .select("*")
      .eq("operation_id", operationId)
      .order("uploaded_at", { ascending: false }),
    supabase
      .from("payments")
      .select(`
        *,
        financial_accounts:account_id(id, name)
      `)
      .eq("operation_id", operationId)
      .order("date_due", { ascending: true }),
    supabase
      .from("alerts")
      .select("*")
      .eq("operation_id", operationId)
      .order("date_due", { ascending: true }),
  ])

  const operationCustomers = operationCustomersResult.data || []
  const documents = documentsResult.data || []
  const payments = paymentsResult.data || []
  const alerts = alertsResult.data || []

  return NextResponse.json({
    operation,
    customers: operationCustomers,
    documents: documents,
    payments: payments,
    alerts: alerts,
  })
  } catch (error) {
    console.error("Error in GET /api/operations/[id]:", error)
    return NextResponse.json({ error: "Error al obtener operación" }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await getCurrentUser()
    // Verificar suscripción activa para operaciones de escritura
    const subCheck = await verifySubscriptionAccess(user.id, user.role)
    if (!subCheck.hasAccess) {
      return NextResponse.json({ error: subCheck.message || "Suscripción no activa" }, { status: 403 })
    }

    const supabase = await createServerClient()
    const { id: operationId } = await params
    const body = await request.json()

    // CRÍTICO: Validar que la operación pertenezca a la agencia del usuario
    const { getUserAgencyIds } = await import("@/lib/permissions-api")
    const agencyIds = await getUserAgencyIds(supabase, user.id, user.role as any)
    
    let operationQuery = supabase
      .from("operations")
      .select("*")
      .eq("id", operationId)
    
    // Filtrar por agency_id si no es SUPER_ADMIN
    if (user.role !== "SUPER_ADMIN") {
      if (agencyIds.length === 0) {
        return NextResponse.json({ error: "Operación no encontrada" }, { status: 404 })
      }
      operationQuery = operationQuery.in("agency_id", agencyIds)
    }
    
    const { data: currentOperation } = await operationQuery.single()

    if (!currentOperation) {
      return NextResponse.json({ error: "Operación no encontrada" }, { status: 404 })
    }

    // Type assertion for operation
    const currentOp = currentOperation as any

    // Check permissions específicas de SELLER
    const userRole = user.role as string
    if (userRole === "SELLER" && currentOp.seller_id !== user.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }
    
    // CRÍTICO: Validar agency_id en el body si se intenta cambiar
    if (body.agency_id && user.role !== "SUPER_ADMIN" && !agencyIds.includes(body.agency_id)) {
      return NextResponse.json({ error: "No tiene permiso para mover la operación a esta agencia" }, { status: 403 })
    }

    // Validaciones de fechas
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (body.operation_date) {
      const operationDate = new Date(body.operation_date)
      operationDate.setHours(0, 0, 0, 0)
      
      if (operationDate > today) {
        return NextResponse.json({ error: "La fecha de operación no puede ser futura" }, { status: 400 })
      }
    }

    if (body.departure_date) {
      const departureDate = new Date(body.departure_date)
      departureDate.setHours(0, 0, 0, 0)
      
      const operationDate = body.operation_date 
        ? new Date(body.operation_date) 
        : new Date(currentOp.operation_date)
      operationDate.setHours(0, 0, 0, 0)

      if (departureDate < operationDate) {
        return NextResponse.json({ error: "La fecha de salida debe ser posterior a la fecha de operación" }, { status: 400 })
      }
    }

    // Validaciones de montos
    if (body.sale_amount_total !== undefined && body.sale_amount_total < 0) {
      return NextResponse.json({ error: "El monto de venta no puede ser negativo" }, { status: 400 })
    }

    if (body.operator_cost !== undefined && body.operator_cost < 0) {
      return NextResponse.json({ error: "El costo de operador no puede ser negativo" }, { status: 400 })
    }

    // Detectar cambio de moneda
    const oldCurrency = currentOp.currency || currentOp.sale_currency || "ARS"
    const newCurrency = body.currency || body.sale_currency || oldCurrency
    const currencyChanged = oldCurrency !== newCurrency

    // Calculate margin if amounts changed
    let updateData: any = { ...body }
    const oldSaleAmount = currentOp.sale_amount_total
    const oldOperatorCost = currentOp.operator_cost
    const newSaleAmount = body.sale_amount_total ?? oldSaleAmount
    const newOperatorCost = body.operator_cost ?? oldOperatorCost
    
    if (body.sale_amount_total !== undefined || body.operator_cost !== undefined) {
      updateData.margin_amount = newSaleAmount - newOperatorCost
      updateData.margin_percentage = newSaleAmount > 0 ? (updateData.margin_amount / newSaleAmount) * 100 : 0
    }

    updateData.updated_at = new Date().toISOString()

    // Update operation
    const { data: operation, error: updateError } = await (supabase.from("operations") as any)
      .update(updateData)
      .eq("id", operationId)
      .select()
      .single()

    if (updateError || !operation) {
      console.error("Error updating operation:", updateError)
      return NextResponse.json({ error: "Error al actualizar operación" }, { status: 400 })
    }

    const op = operation as any
    const currency = op.currency || op.sale_currency || "ARS"

    // ============================================
    // MANEJAR CAMBIO DE MONEDA
    // ============================================
    if (currencyChanged) {
      try {
        console.log(`⚠️ Cambio de moneda detectado: ${oldCurrency} → ${newCurrency}`)
        console.log(`⚠️ ADVERTENCIA: Se cambió la moneda de la operación. Los movimientos contables existentes mantienen su moneda original.`)
        console.log(`⚠️ Considera recalcular movimientos contables si es necesario.`)
        // TODO: En el futuro, implementar recálculo automático de movimientos contables
        // cuando cambia la moneda de una operación
      } catch (error) {
        console.error("Error handling currency change:", error)
      }
    }

    // ============================================
    // ACTUALIZAR IVA SI CAMBIARON LOS MONTOS
    // ============================================
    // Si cambió el monto de venta o el costo del operador, actualizar IVA de venta (calculado sobre ganancia)
    if ((body.sale_amount_total !== undefined && body.sale_amount_total !== oldSaleAmount) ||
        (body.operator_cost !== undefined && body.operator_cost !== oldOperatorCost)) {
      try {
        // Obtener monedas de la operación actualizada
        const saleCurrency = op.sale_currency || op.currency || "ARS"
        const operatorCostCurrency = op.operator_cost_currency || op.currency || "ARS"
        
        // Convertir costo del operador a la misma moneda de venta si es necesario
        let operatorCostForIVA = newOperatorCost
        if (operatorCostCurrency !== saleCurrency && newOperatorCost > 0) {
          // Usar el TC de la operación (del body o el existente)
          const opExchangeRate = body.exchange_rate ? Number(body.exchange_rate) : (op.exchange_rate ? Number(op.exchange_rate) : null)
          if (opExchangeRate && opExchangeRate > 0) {
            if (operatorCostCurrency === "USD" && saleCurrency === "ARS") {
              operatorCostForIVA = newOperatorCost * opExchangeRate
            } else if (operatorCostCurrency === "ARS" && saleCurrency === "USD") {
              operatorCostForIVA = newOperatorCost / opExchangeRate
            }
          } else {
            console.warn("⚠️ No hay tipo de cambio para convertir moneda en actualización de IVA")
          }
        }
        
        await updateSaleIVA(supabase, operationId, newSaleAmount, saleCurrency, operatorCostForIVA)
        const ganancia = newSaleAmount - operatorCostForIVA
        console.log(`✅ IVA Ventas actualizado para operación ${operationId} (IVA sobre ganancia: ${ganancia} ${saleCurrency})`)
      } catch (error) {
        console.error("Error updating sale IVA:", error)
      }
    }

    // IVA de compra se calcula sobre el costo del operador (sin cambios)
    if (body.operator_cost !== undefined && body.operator_cost !== oldOperatorCost) {
      try {
        await updatePurchaseIVA(supabase, operationId, newOperatorCost, currency)
        console.log(`✅ IVA Compras actualizado para operación ${operationId}: ${newOperatorCost}`)
      } catch (error) {
        console.error("Error updating purchase IVA:", error)
      }
    }

    // ============================================
    // ACTUALIZAR OPERATOR_PAYMENT SI CAMBIÓ EL COSTO
    // ============================================
    if (body.operator_cost !== undefined && body.operator_cost !== oldOperatorCost) {
      try {
        // Buscar operator_payment pendiente
        const { data: operatorPayment } = await (supabase.from("operator_payments") as any)
          .select("id, status")
          .eq("operation_id", operationId)
          .eq("status", "PENDING")
          .maybeSingle()

        if (operatorPayment) {
          await (supabase.from("operator_payments") as any)
            .update({ 
              amount: newOperatorCost,
              currency: currency,
              updated_at: new Date().toISOString()
            })
            .eq("id", operatorPayment.id)
          console.log(`✅ Operator payment actualizado para operación ${operationId}: ${newOperatorCost}`)
        }
      } catch (error) {
        console.error("Error updating operator payment:", error)
      }
    }

    // Si el status cambió a CONFIRMED o RESERVED, generar alerta de documentación faltante
    if (body.status === "CONFIRMED" || body.status === "RESERVED" || op.status === "CONFIRMED" || op.status === "RESERVED") {
      try {
        const { generateMissingDocsAlert } = await import("@/lib/alerts/accounting-alerts")
        await generateMissingDocsAlert(supabase, op.agency_id, operationId, op.seller_id)
      } catch (error) {
        console.error("Error generating missing docs alert:", error)
      }
    }

    // Invalidar caché del dashboard (los KPIs cambian al editar una operación)
    revalidateTag(CACHE_TAGS.DASHBOARD)

    return NextResponse.json({ success: true, operation })
  } catch (error) {
    console.error("Error in PATCH /api/operations/[id]:", error)
    return NextResponse.json({ error: "Error al actualizar operación" }, { status: 500 })
  }
}

/**
 * DELETE /api/operations/[id]
 * Eliminar una operación y todos sus datos relacionados
 * IMPORTANTE: Esta acción es irreversible
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await getCurrentUser()
    // Verificar suscripción activa para operaciones de escritura
    const subCheck = await verifySubscriptionAccess(user.id, user.role)
    if (!subCheck.hasAccess) {
      return NextResponse.json({ error: subCheck.message || "Suscripción no activa" }, { status: 403 })
    }

    const supabase = await createServerClient()
    const { id: operationId } = await params

    // Verificar permisos (solo ADMIN y SUPER_ADMIN pueden eliminar)
    const userRole = user.role as string
    if (!["ADMIN", "SUPER_ADMIN"].includes(userRole)) {
      return NextResponse.json({ error: "Solo administradores pueden eliminar operaciones" }, { status: 403 })
    }

    // CRÍTICO: Validar que la operación pertenezca a la agencia del usuario
    const { getUserAgencyIds } = await import("@/lib/permissions-api")
    const agencyIds = await getUserAgencyIds(supabase, user.id, user.role as any)
    
    let operationQuery = supabase
      .from("operations")
      .select("*, lead_id")
      .eq("id", operationId)
    
    // Filtrar por agency_id si no es SUPER_ADMIN
    if (user.role !== "SUPER_ADMIN") {
      if (agencyIds.length === 0) {
        return NextResponse.json({ error: "Operación no encontrada" }, { status: 404 })
      }
      operationQuery = operationQuery.in("agency_id", agencyIds)
    }
    
    const { data: operation } = await operationQuery.single()

    if (!operation) {
      return NextResponse.json({ error: "Operación no encontrada" }, { status: 404 })
    }

    const op = operation as any

    console.log(`🗑️ Iniciando eliminación de operación ${operationId}...`)

    // 1. Eliminar registros de IVA
    try {
      await deleteSaleIVA(supabase, operationId)
      await deletePurchaseIVA(supabase, operationId)
      console.log(`  ✓ IVA eliminado`)
    } catch (error) {
      console.error("Error deleting IVA:", error)
    }

    // 2. Eliminar pagos y sus movimientos contables
    try {
      const { data: payments } = await (supabase
        .from("payments")
        .select("id, ledger_movement_id")
        .eq("operation_id", operationId) as any)

      if (payments && payments.length > 0) {
        for (const payment of payments as any[]) {
          // Eliminar cash_movement asociado
          await (supabase.from("cash_movements") as any)
            .delete()
            .eq("payment_id", payment.id)

          // Eliminar ledger_movement asociado
          if (payment.ledger_movement_id) {
            await (supabase.from("ledger_movements") as any)
              .delete()
              .eq("id", payment.ledger_movement_id)
          }
        }
        // Los pagos se eliminan por CASCADE, pero lo hacemos explícito
        await (supabase.from("payments") as any).delete().eq("operation_id", operationId)
        console.log(`  ✓ ${payments.length} pagos eliminados con sus movimientos`)
      }
    } catch (error) {
      console.error("Error deleting payments:", error)
    }

    // 3. Eliminar ledger_movements de la operación (los que no son de pagos)
    try {
      await (supabase.from("ledger_movements") as any)
        .delete()
        .eq("operation_id", operationId)
      console.log(`  ✓ Ledger movements eliminados`)
    } catch (error) {
      console.error("Error deleting ledger movements:", error)
    }

    // 4. Eliminar cash_movements de la operación
    try {
      await (supabase.from("cash_movements") as any)
        .delete()
        .eq("operation_id", operationId)
      console.log(`  ✓ Cash movements eliminados`)
    } catch (error) {
      console.error("Error deleting cash movements:", error)
    }

    // 5. Eliminar operator_payments
    try {
      await (supabase.from("operator_payments") as any)
        .delete()
        .eq("operation_id", operationId)
      console.log(`  ✓ Operator payments eliminados`)
    } catch (error) {
      console.error("Error deleting operator payments:", error)
    }

    // 6. Eliminar alertas
    try {
      await supabase.from("alerts").delete().eq("operation_id", operationId)
      console.log(`  ✓ Alertas eliminadas`)
    } catch (error) {
      console.error("Error deleting alerts:", error)
    }

    // 7. Eliminar documentos (el storage se limpia con policies)
    try {
      await supabase.from("documents").delete().eq("operation_id", operationId)
      console.log(`  ✓ Documentos eliminados`)
    } catch (error) {
      console.error("Error deleting documents:", error)
    }

    // 9. Si hay lead asociado, revertirlo a IN_PROGRESS
    if (op.lead_id) {
      try {
        await (supabase.from("leads") as any)
          .update({ status: "IN_PROGRESS" })
          .eq("id", op.lead_id)
        console.log(`  ✓ Lead ${op.lead_id} revertido a IN_PROGRESS`)
      } catch (error) {
        console.error("Error reverting lead:", error)
      }
    }

    // 10. Finalmente eliminar la operación (esto cascadea operation_customers)
    const { error: deleteError } = await supabase
      .from("operations")
      .delete()
      .eq("id", operationId)

    if (deleteError) {
      console.error("Error deleting operation:", deleteError)
      return NextResponse.json({ error: "Error al eliminar operación" }, { status: 500 })
    }

    console.log(`✅ Operación ${operationId} eliminada completamente`)

    // Invalidar caché del dashboard (los KPIs cambian al eliminar una operación)
    revalidateTag(CACHE_TAGS.DASHBOARD)

    return NextResponse.json({ 
      success: true, 
      message: "Operación eliminada correctamente",
      leadReverted: op.lead_id ? true : false
    })
  } catch (error) {
    console.error("Error in DELETE /api/operations/[id]:", error)
    return NextResponse.json({ error: "Error al eliminar operación" }, { status: 500 })
  }
}
