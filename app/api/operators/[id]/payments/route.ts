import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/auth"
import { getUserAgencyIds } from "@/lib/permissions-api"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await getCurrentUser()
    const { id: operatorId } = await params
    const supabase = await createServerClient()

    const { data: operator, error: operatorError } = await (supabase.from("operators") as any)
      .select("id, agency_id")
      .eq("id", operatorId)
      .single()

    if (operatorError || !operator) {
      return NextResponse.json({ error: "Operador no encontrado" }, { status: 404 })
    }

    const agencyIds = await getUserAgencyIds(supabase, user.id, user.role as any)
    if (user.role !== "SUPER_ADMIN" && (!operator.agency_id || !agencyIds.includes(operator.agency_id))) {
      return NextResponse.json({ error: "No tiene acceso a este operador" }, { status: 403 })
    }

    // Obtener todas las operaciones de este operador
    let operationsQuery = supabase
      .from("operations")
      .select("id")
      .eq("operator_id", operatorId)

    if (user.role !== "SUPER_ADMIN") {
      operationsQuery = operationsQuery.in("agency_id", agencyIds)
    }

    const { data: operations } = await operationsQuery

    if (!operations || operations.length === 0) {
      return NextResponse.json({ payments: [] })
    }

    const operationIds = operations.map((op: any) => op.id)

    // Obtener pagos de esas operaciones (solo EXPENSE - lo que se le debe al operador)
    const { data: payments, error } = await (supabase.from("payments") as any)
      .select(`
        id,
        amount,
        currency,
        direction,
        status,
        date_due,
        date_paid,
        method,
        payer_type,
        operations:operation_id (
          id,
          destination,
          file_code
        )
      `)
      .in("operation_id", operationIds)
      .eq("payer_type", "OPERATOR")
      .order("date_due", { ascending: false })

    if (error) {
      console.error("Error fetching operator payments:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ payments: payments || [] })
  } catch (error: any) {
    console.error("Error in GET /api/operators/[id]/payments:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
