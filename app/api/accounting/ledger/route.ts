import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/auth"
import { getLedgerMovements } from "@/lib/accounting/ledger"

export async function GET(request: Request) {
  try {
    const { user } = await getCurrentUser()
    
    // Verificar permiso de acceso a contabilidad
    const { canAccessModule } = await import("@/lib/permissions")
    const userRole = user.role as any
    if (!canAccessModule(userRole, "accounting")) {
      return NextResponse.json({ error: "No tiene permiso para ver contabilidad" }, { status: 403 })
    }

    const supabase = await createServerClient()
    const { searchParams } = new URL(request.url)

    // CRÍTICO: Obtener agencias del usuario para filtro obligatorio
    const { getUserAgencyIds } = await import("@/lib/permissions-api")
    const userAgencyIds = await getUserAgencyIds(supabase, user.id, user.role as any)

    // Build filters
    const filters: Parameters<typeof getLedgerMovements>[1] = {
      dateFrom: searchParams.get("dateFrom") || undefined,
      dateTo: searchParams.get("dateTo") || undefined,
      type: (searchParams.get("type") as any) || "ALL",
      currency: (searchParams.get("currency") as any) || "ALL",
      accountId: searchParams.get("accountId") || "ALL",
      sellerId: searchParams.get("sellerId") || "ALL",
      operatorId: searchParams.get("operatorId") || "ALL",
      operationId: searchParams.get("operationId") || undefined,
      leadId: searchParams.get("leadId") || undefined,
    }

    // Get ledger movements
    const movements = await getLedgerMovements(supabase, filters)

    // CRÍTICO: Filtro obligatorio de agencia (multi-tenancy)
    let filteredMovements = movements || []

    if (user.role === "SELLER") {
      // Sellers can only see their own movements
      filteredMovements = filteredMovements.filter((m: any) => m.seller_id === user.id)
    } else if (user.role !== "SUPER_ADMIN" && userAgencyIds.length > 0) {
      // Filtrar por agencias del usuario - obtener operations de sus agencias
      const { data: operations } = await supabase
        .from("operations")
        .select("id, agency_id")
        .in("agency_id", userAgencyIds)

      const operationIds = new Set((operations || []).map((op: any) => op.id))

      // También obtener las cuentas financieras del usuario para movimientos sin operación
      const { data: userAccounts } = await (supabase.from("financial_accounts") as any)
        .select("id")
        .in("agency_id", userAgencyIds)

      const userAccountIds = new Set((userAccounts || []).map((acc: any) => acc.id))

      filteredMovements = filteredMovements.filter((m: any) => {
        // Si tiene operation_id, verificar que pertenece a la agencia del usuario
        if (m.operation_id) {
          return operationIds.has(m.operation_id)
        }
        // Si tiene account_id, verificar que pertenece a cuenta del usuario
        if (m.account_id) {
          return userAccountIds.has(m.account_id)
        }
        // Si tiene created_by, verificar que es del usuario
        if (m.created_by === user.id) {
          return true
        }
        // Sin operación ni cuenta, no incluir (prevenir leak)
        return false
      })
    } else if (user.role !== "SUPER_ADMIN") {
      // Sin agencias, no mostrar nada
      filteredMovements = []
    }

    return NextResponse.json({ movements: filteredMovements })
  } catch (error) {
    console.error("Error in GET /api/accounting/ledger:", error)
    return NextResponse.json({ error: "Error al obtener movimientos contables" }, { status: 500 })
  }
}
