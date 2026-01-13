import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/auth"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await getCurrentUser()
    const { id: customerId } = await params
    const supabase = await createServerClient()

    // CRÍTICO: Validar que el cliente pertenezca a la agencia del usuario
    const { getUserAgencyIds } = await import("@/lib/permissions-api")
    const agencyIds = await getUserAgencyIds(supabase, user.id, user.role as any)
    
    // Verificar que el cliente existe y pertenece a las agencias del usuario
    let customerQuery = supabase
      .from("customers")
      .select("id, agency_id")
      .eq("id", customerId)
    
    if (user.role !== "SUPER_ADMIN") {
      if (agencyIds.length === 0) {
        return NextResponse.json({ operations: [] })
      }
      customerQuery = customerQuery.in("agency_id", agencyIds)
    }
    
    const { data: customer } = await customerQuery.single()
    
    if (!customer) {
      return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 })
    }

    // Obtener todas las operaciones donde el cliente es pasajero
    const { data: operationCustomers } = await supabase
      .from("operation_customers")
      .select("operation_id")
      .eq("customer_id", customerId)

    if (!operationCustomers || operationCustomers.length === 0) {
      return NextResponse.json({ operations: [] })
    }

    const operationIds = operationCustomers.map((oc: any) => oc.operation_id)

    // Obtener las operaciones - CRÍTICO: Filtrar por agency_id
    let operationsQuery = supabase
      .from("operations")
      .select(`
        id,
        file_code,
        destination,
        departure_date,
        return_date,
        status,
        type
      `)
      .in("id", operationIds)
    
    // Filtrar por agency_id si no es SUPER_ADMIN
    if (user.role !== "SUPER_ADMIN" && agencyIds.length > 0) {
      operationsQuery = operationsQuery.in("agency_id", agencyIds)
    }
    
    const { data: operations, error } = await operationsQuery.order("departure_date", { ascending: false })

    if (error) {
      console.error("Error fetching customer operations:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ operations: operations || [] })
  } catch (error: any) {
    console.error("Error in GET /api/customers/[id]/operations:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

