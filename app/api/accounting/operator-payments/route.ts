import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/auth"
import { getOverdueOperatorPayments, updateOverduePayments } from "@/lib/accounting/operator-payments"

export async function GET(request: Request) {
  try {
    const { user } = await getCurrentUser()
    const supabase = await createServerClient()
    const { searchParams } = new URL(request.url)

    const operatorId = searchParams.get("operatorId") || undefined
    const status = searchParams.get("status") || undefined
    const agencyId = searchParams.get("agencyId")
    const dueDateFrom = searchParams.get("dueDateFrom")
    const dueDateTo = searchParams.get("dueDateTo")

    console.log("[OperatorPayments API] Params:", { operatorId, status, agencyId, dueDateFrom, dueDateTo })

    // Update overdue payments first
    await updateOverduePayments(supabase)

    // Build query
    let query = (supabase.from("operator_payments") as any)
      .select(
        `
        *,
        operations:operation_id (id, destination, file_code, sale_amount_total, agency_id),
        operators:operator_id (id, name, contact_email)
      `
      )
      .order("due_date", { ascending: true })

    if (operatorId) {
      query = query.eq("operator_id", operatorId)
    }

    if (status) {
      query = query.eq("status", status)
    }

    // Filtro de fecha de vencimiento
    if (dueDateFrom) {
      query = query.gte("due_date", dueDateFrom)
    }
    if (dueDateTo) {
      // Agregar hora 23:59:59 para incluir todo el día
      query = query.lte("due_date", `${dueDateTo}T23:59:59`)
    }

    const { data: payments, error } = await query

    if (error) {
      console.error("Error fetching operator payments:", error)
      return NextResponse.json({ error: "Error al obtener pagos a operadores" }, { status: 500 })
    }

    console.log("[OperatorPayments API] Total payments found:", payments?.length || 0)

    // Filtrar por agencia si se especifica
    let filteredPayments = payments || []
    if (agencyId && agencyId !== "ALL") {
      filteredPayments = filteredPayments.filter((p: any) => {
        const operation = p.operations
        return operation && operation.agency_id === agencyId
      })
    }

    return NextResponse.json({ payments: filteredPayments })
  } catch (error) {
    console.error("Error in GET /api/accounting/operator-payments:", error)
    return NextResponse.json({ error: "Error al obtener pagos a operadores" }, { status: 500 })
  }
}

