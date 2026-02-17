import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/auth"
import { getUserAgencyIds } from "@/lib/permissions-api"

export const dynamic = "force-dynamic"

// GET - Obtener operaciones pendientes de facturar
export async function GET() {
  try {
    const { user } = await getCurrentUser()

    if (!["SUPER_ADMIN", "ADMIN", "CONTABLE"].includes(user.role)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }

    const supabase = await createServerClient()
    const agencyIds = await getUserAgencyIds(supabase, user.id, user.role as any)

    if (agencyIds.length === 0) {
      return NextResponse.json({ operations: [] })
    }

    // Get all operation IDs that already have an authorized invoice
    const { data: invoicedOps } = await supabase
      .from("invoices")
      .select("operation_id")
      .in("agency_id", agencyIds)
      .eq("status", "authorized")
      .not("operation_id", "is", null)

    const invoicedOpIds = (invoicedOps || []).map((i: any) => i.operation_id).filter(Boolean)

    // Get operations that are confirmed+ and NOT already invoiced
    // Valid DB statuses: PRE_RESERVATION, RESERVED, CONFIRMED, CANCELLED, TRAVELLED, CLOSED
    let query = supabase
      .from("operations")
      .select(`
        id,
        file_code,
        destination,
        sale_amount_total,
        currency,
        departure_date,
        return_date,
        status,
        operation_customers(
          role,
          customers:customer_id(
            id,
            first_name,
            last_name,
            document_type,
            document_number,
            email
          )
        )
      `)
      .in("agency_id", agencyIds)
      .in("status", ["CONFIRMED", "TRAVELLED", "CLOSED"])
      .order("created_at", { ascending: false })
      .limit(50)

    // Exclude already invoiced operations
    if (invoicedOpIds.length > 0) {
      query = query.not("id", "in", `(${invoicedOpIds.join(",")})`)
    }

    const { data: operations, error } = await query

    if (error) {
      console.error("Error fetching pending invoices:", error)
      return NextResponse.json({ operations: [], warning: error.message })
    }

    const formattedOperations = (operations || []).map((op: any) => {
      // Get main customer from operation_customers junction table
      const mainCustomerRelation = op.operation_customers?.find(
        (oc: any) => oc.role === "MAIN"
      ) || op.operation_customers?.[0]
      const customer = mainCustomerRelation?.customers || null

      return {
        id: op.id,
        file_code: op.file_code,
        customer_id: customer?.id || null,
        customer_name: customer
          ? `${customer.first_name} ${customer.last_name}`
          : "Sin cliente",
        customer_doc_type: customer?.document_type || null,
        customer_doc_number: customer?.document_number || null,
        destination: op.destination || "-",
        sale_amount_total: parseFloat(op.sale_amount_total) || 0,
        sale_currency: op.currency || "ARS",
        departure_date: op.departure_date,
        return_date: op.return_date,
        status: op.status,
      }
    })

    return NextResponse.json({ operations: formattedOperations })
  } catch (error: any) {
    console.error("Error in GET /api/accounting/invoicing/pending:", error)
    return NextResponse.json({ operations: [], error: error.message || "Error interno" })
  }
}
