import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/auth"
import { canPerformAction } from "@/lib/permissions-api"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await getCurrentUser()
    const { id: operationId } = await params
    const supabase = await createServerClient()

    // CRÍTICO: Validar que la operación pertenezca a la agencia del usuario
    const { getUserAgencyIds } = await import("@/lib/permissions-api")
    const agencyIds = await getUserAgencyIds(supabase, user.id, user.role as any)
    
    let operationQuery = supabase
      .from("operations")
      .select("id, agency_id")
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

    const { data, error } = await supabase
      .from("operation_customers")
      .select(`
        id,
        operation_id,
        customer_id,
        role,
        customers (
          id,
          first_name,
          last_name,
          email,
          phone
        )
      `)
      .eq("operation_id", operationId)

    if (error) {
      console.error("Error fetching operation customers:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ customers: data || [] })
  } catch (error: any) {
    console.error("Error in GET /api/operations/[id]/customers:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await getCurrentUser()
    
    if (!canPerformAction(user, "operations", "write")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }

    const { id: operationId } = await params
    const supabase = await createServerClient()
    const body = await request.json()

    // CRÍTICO: Validar que la operación pertenezca a la agencia del usuario
    const { getUserAgencyIds } = await import("@/lib/permissions-api")
    const agencyIds = await getUserAgencyIds(supabase, user.id, user.role as any)
    
    let operationQuery = supabase
      .from("operations")
      .select("id, agency_id")
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

    const { customer_id, role } = body

    if (!customer_id) {
      return NextResponse.json({ error: "customer_id es requerido" }, { status: 400 })
    }
    
    // CRÍTICO: Validar que el cliente pertenezca a la misma agencia
    const { data: customer } = await supabase
      .from("customers")
      .select("id, agency_id")
      .eq("id", customer_id)
      .single()
    
    if (!customer) {
      return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 })
    }
    
    const customerData = customer as { id: string; agency_id: string | null }
    const operationData = operation as { id: string; agency_id: string | null }
    
    if (user.role !== "SUPER_ADMIN" && customerData.agency_id && operationData.agency_id && customerData.agency_id !== operationData.agency_id) {
      return NextResponse.json({ error: "El cliente no pertenece a la misma agencia que la operación" }, { status: 403 })
    }
    
    if (user.role !== "SUPER_ADMIN" && (!customerData.agency_id || !operationData.agency_id)) {
      return NextResponse.json({ error: "Cliente u operación sin agencia asignada" }, { status: 400 })
    }

    // Verificar que no exista ya
    const { data: existing } = await (supabase.from("operation_customers") as any)
      .select("id")
      .eq("operation_id", operationId)
      .eq("customer_id", customer_id)
      .single()

    if (existing) {
      return NextResponse.json({ error: "El cliente ya está en esta operación" }, { status: 400 })
    }

    // Si el rol es MAIN, verificar que no exista otro MAIN
    if (role === "MAIN") {
      const { data: existingMain } = await (supabase.from("operation_customers") as any)
        .select("id")
        .eq("operation_id", operationId)
        .eq("role", "MAIN")
        .single()

      if (existingMain) {
        return NextResponse.json({ error: "Ya existe un pasajero principal" }, { status: 400 })
      }
    }

    // Insertar
    const { data, error } = await (supabase.from("operation_customers") as any)
      .insert({
        operation_id: operationId,
        customer_id,
        role: role || "COMPANION",
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating operation customer:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ operationCustomer: data }, { status: 201 })
  } catch (error: any) {
    console.error("Error in POST /api/operations/[id]/customers:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

