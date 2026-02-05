import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/auth"
import { getUserAgencyIds } from "@/lib/permissions-api"
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

    const agencyIds = await getUserAgencyIds(supabase, user.id, user.role as any)

    if (user.role !== "SUPER_ADMIN" && agencyIds.length === 0) {
      return NextResponse.json({ payments: [] })
    }

    let allowedAgencyIds = agencyIds
    if (agencyId && agencyId !== "ALL") {
      if (user.role !== "SUPER_ADMIN" && !agencyIds.includes(agencyId)) {
        return NextResponse.json({ error: "No tiene acceso a esta agencia" }, { status: 403 })
      }
      allowedAgencyIds = [agencyId]
    }

    const { data: operationsForAgency } = await supabase
      .from("operations")
      .select("id, seller_id")
      .in("agency_id", allowedAgencyIds)

    let operationIds = (operationsForAgency || []).map((op: any) => op.id)

    if (user.role === "SELLER") {
      operationIds = (operationsForAgency || [])
        .filter((op: any) => op.seller_id === user.id)
        .map((op: any) => op.id)
    }

    if (operationIds.length === 0) {
      return NextResponse.json({ payments: [] })
    }

    // Build query
    let query = (supabase.from("operator_payments") as any)
      .select(
        `
        *,
        operations:operation_id (id, destination, file_code, sale_amount_total, agency_id),
        operators:operator_id (id, name, contact_email)
      `
      )
      .in("operation_id", operationIds)
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

    return NextResponse.json({ payments: payments || [] })
  } catch (error) {
    console.error("Error in GET /api/accounting/operator-payments:", error)
    return NextResponse.json({ error: "Error al obtener pagos a operadores" }, { status: 500 })
  }
}
