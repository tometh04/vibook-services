import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/auth"
import { getExchangeRatesBatch, getLatestExchangeRate } from "@/lib/accounting/exchange-rates"
import { verifyFeatureAccess } from "@/lib/billing/subscription-middleware"

export async function GET(request: Request) {
  try {
    const { user } = await getCurrentUser()
    const supabase = await createServerClient()
    const { searchParams } = new URL(request.url)

    const featureAccess = await verifyFeatureAccess(user.id, user.role, "reports")
    if (!featureAccess.hasAccess) {
      return NextResponse.json(
        { error: featureAccess.message || "No tiene acceso a Reportes" },
        { status: 403 }
      )
    }

    const dateFrom = searchParams.get("dateFrom")
    const dateTo = searchParams.get("dateTo")
    const sellerId = searchParams.get("sellerId")
    const agencyId = searchParams.get("agencyId")
    const groupBy = searchParams.get("groupBy") || "day" // day, week, month

    // CRÍTICO: Obtener agencias del usuario para filtro obligatorio
    const { getUserAgencyIds } = await import("@/lib/permissions-api")
    const userAgencyIds = await getUserAgencyIds(supabase, user.id, user.role as any)

    // Base query
    let query = (supabase
      .from("operations") as any)
      .select(`
        id,
        destination,
        operation_date,
        departure_date,
        sale_amount_total,
        operator_cost,
        margin_amount,
        margin_percentage,
        currency,
        sale_currency,
        status,
        seller_id,
        agency_id,
        sellers:seller_id(id, name),
        agencies:agency_id(id, name)
      `)
      .not("status", "eq", "CANCELLED")

    // Filtros de fecha
    if (dateFrom) {
      query = query.gte("operation_date", dateFrom)
    }
    if (dateTo) {
      query = query.lte("operation_date", dateTo)
    }

    // Filtro de vendedor (si no es SELLER, puede ver todos)
    if (sellerId && sellerId !== "ALL") {
      query = query.eq("seller_id", sellerId)
    } else if (user.role === "SELLER") {
      query = query.eq("seller_id", user.id)
    }

    // CRÍTICO: Filtro obligatorio de agencia (multi-tenancy)
    if (user.role !== "SUPER_ADMIN") {
      if (agencyId && agencyId !== "ALL" && userAgencyIds.includes(agencyId)) {
        query = query.eq("agency_id", agencyId)
      } else if (userAgencyIds.length > 0) {
        query = query.in("agency_id", userAgencyIds)
      } else {
        return NextResponse.json({ operations: [], totals: { count: 0, sale_total_usd: 0, cost_total_usd: 0, margin_total_usd: 0 }, byPeriod: [], bySeller: [] })
      }
    } else if (agencyId && agencyId !== "ALL") {
      query = query.eq("agency_id", agencyId)
    }

    const { data: operations, error } = await query.order("operation_date", { ascending: true }) as { data: any[] | null, error: any }

    if (error) {
      console.error("Error fetching sales report:", error)
      return NextResponse.json({ error: "Error al obtener reporte" }, { status: 500 })
    }

    const operationsArray = operations || []
    const latestExchangeRate = await getLatestExchangeRate(supabase) || 1000
    const arsOperations = operationsArray.filter((op: any) => (op.sale_currency || op.currency || "USD") === "ARS")
    const rateDates = arsOperations.map((op: any) => op.operation_date || op.departure_date || op.created_at || new Date())
    const exchangeRatesMap = await getExchangeRatesBatch(supabase, rateDates)

    const getRateForOperation = (op: any) => {
      const dateValue = op.operation_date || op.departure_date || op.created_at || new Date()
      const dateStr = typeof dateValue === "string"
        ? dateValue.split("T")[0]
        : dateValue.toISOString().split("T")[0]
      const rate = exchangeRatesMap.get(dateStr) || 0
      return rate > 0 ? rate : latestExchangeRate
    }

    const enrichedOperations = operationsArray.map((op: any) => {
      const currency = op.sale_currency || op.currency || "USD"
      const sale = Number(op.sale_amount_total) || 0
      const cost = Number(op.operator_cost) || 0
      const margin = Number(op.margin_amount) || 0
      if (currency === "ARS") {
        const rate = getRateForOperation(op)
        const divisor = rate || 1
        return {
          ...op,
          sale_amount_usd: sale / divisor,
          operator_cost_usd: cost / divisor,
          margin_amount_usd: margin / divisor,
          exchange_rate_used: rate,
        }
      }
      return {
        ...op,
        sale_amount_usd: sale,
        operator_cost_usd: cost,
        margin_amount_usd: margin,
        exchange_rate_used: null,
      }
    })

    // Calcular totales (USD)
    const totals = {
      count: enrichedOperations.length || 0,
      sale_total_usd: 0,
      cost_total_usd: 0,
      margin_total_usd: 0,
    }

    for (const op of enrichedOperations) {
      totals.sale_total_usd += Number(op.sale_amount_usd) || 0
      totals.cost_total_usd += Number(op.operator_cost_usd) || 0
      totals.margin_total_usd += Number(op.margin_amount_usd) || 0
    }

    // Agrupar por período
    const grouped: Record<string, any> = {}
    
    for (const op of enrichedOperations) {
      const date = new Date((op.operation_date || op.departure_date) + "T12:00:00")
      let key = ""
      
      if (groupBy === "day") {
        key = date.toISOString().split("T")[0]
      } else if (groupBy === "week") {
        // Obtener el lunes de la semana
        const d = new Date(date)
        const day = d.getDay()
        const diff = d.getDate() - day + (day === 0 ? -6 : 1)
        d.setDate(diff)
        key = d.toISOString().split("T")[0]
      } else if (groupBy === "month") {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
      }

      if (!grouped[key]) {
        grouped[key] = {
          period: key,
          count: 0,
          sale_usd: 0,
          margin_usd: 0,
        }
      }

      grouped[key].count++
      grouped[key].sale_usd += Number(op.sale_amount_usd) || 0
      grouped[key].margin_usd += Number(op.margin_amount_usd) || 0
    }

    const byPeriod = Object.values(grouped).sort((a: any, b: any) => 
      a.period.localeCompare(b.period)
    )

    // Agrupar por vendedor
    const bySeller: Record<string, any> = {}
    
    for (const op of enrichedOperations) {
      const sellerId = op.seller_id || "unknown"
      const sellerName = (op.sellers as any)?.name || "Sin asignar"
      
      if (!bySeller[sellerId]) {
        bySeller[sellerId] = {
          seller_id: sellerId,
          seller_name: sellerName,
          count: 0,
          sale_usd: 0,
          margin_usd: 0,
        }
      }

      bySeller[sellerId].count++
      bySeller[sellerId].sale_usd += Number(op.sale_amount_usd) || 0
      bySeller[sellerId].margin_usd += Number(op.margin_amount_usd) || 0
    }

    const sellerData = Object.values(bySeller).sort((a: any, b: any) => 
      b.sale_usd - a.sale_usd
    )

    return NextResponse.json({
      operations: enrichedOperations,
      totals,
      byPeriod,
      bySeller: sellerData,
    })
  } catch (error) {
    console.error("Error in GET /api/reports/sales:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
