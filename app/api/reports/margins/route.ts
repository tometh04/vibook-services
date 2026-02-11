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
    const viewType = searchParams.get("viewType") || "seller" // seller, operator, product, detail

    // Base query
    let query = (supabase
      .from("operations") as any)
      .select(`
        id,
        file_code,
        destination,
        operation_date,
        departure_date,
        created_at,
        sale_amount_total,
        operator_cost,
        margin_amount,
        margin_percentage,
        currency,
        sale_currency,
        status,
        product_type,
        seller_id,
        agency_id,
        operator_id,
        sellers:seller_id(id, name),
        agencies:agency_id(id, name),
        operators:operator_id(id, name)
      `)
      .not("status", "eq", "CANCELLED")

    // Filtros de fecha
    if (dateFrom) {
      query = query.gte("operation_date", dateFrom)
    }
    if (dateTo) {
      query = query.lte("operation_date", dateTo)
    }

    // Filtro de vendedor
    if (sellerId && sellerId !== "ALL" && sellerId !== "") {
      query = query.eq("seller_id", sellerId)
    } else if (user.role === "SELLER") {
      query = query.eq("seller_id", user.id)
    }

    // CRÍTICO: Obtener agencias del usuario para filtro obligatorio
    const { getUserAgencyIds } = await import("@/lib/permissions-api")
    const userAgencyIds = await getUserAgencyIds(supabase, user.id, user.role as any)

    // CRÍTICO: Filtro obligatorio de agencia (multi-tenancy)
    if (user.role !== "SUPER_ADMIN") {
      if (agencyId && agencyId !== "ALL" && agencyId !== "" && userAgencyIds.includes(agencyId)) {
        query = query.eq("agency_id", agencyId)
      } else if (userAgencyIds.length > 0) {
        query = query.in("agency_id", userAgencyIds)
      } else {
        return NextResponse.json({ totals: { count: 0, total_sale_usd: 0, total_cost_usd: 0, total_margin_usd: 0 }, operations: [] })
      }
    } else if (agencyId && agencyId !== "ALL" && agencyId !== "") {
      query = query.eq("agency_id", agencyId)
    }

    const { data: operations, error } = await query.order("operation_date", { ascending: false }) as { data: any[] | null, error: any }

    if (error) {
      console.error("Error fetching margins report:", error)
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
    const totals: any = {
      count: enrichedOperations.length || 0,
      total_sale_usd: 0,
      total_cost_usd: 0,
      total_margin_usd: 0,
      currency: "USD",
      total_sale: 0,
      total_cost: 0,
      total_margin: 0,
      total_sale_other: 0,
      total_margin_other: 0,
      avg_margin_percent: 0,
    }

    for (const op of enrichedOperations) {
      totals.total_sale_usd += Number(op.sale_amount_usd) || 0
      totals.total_cost_usd += Number(op.operator_cost_usd) || 0
      totals.total_margin_usd += Number(op.margin_amount_usd) || 0
    }

    totals.total_sale = totals.total_sale_usd
    totals.total_cost = totals.total_cost_usd
    totals.total_margin = totals.total_margin_usd

    totals.avg_margin_percent = totals.total_sale > 0 ? (totals.total_margin / totals.total_sale) * 100 : 0

    let result: any = { totals, operations: enrichedOperations }

    // Agrupar por vendedor
    if (viewType === "seller" || viewType === "all") {
      const bySeller: Record<string, any> = {}
      
      for (const op of enrichedOperations) {
        const sellerId = op.seller_id || "unknown"
        const sellerName = (op.sellers as any)?.name || "Sin asignar"
        
        if (!bySeller[sellerId]) {
          bySeller[sellerId] = {
            seller_id: sellerId,
            seller_name: sellerName,
            count: 0,
            total_sale_usd: 0,
            total_cost_usd: 0,
            total_margin_usd: 0,
            margins: [],
          }
        }

        bySeller[sellerId].count++
        bySeller[sellerId].total_sale_usd += Number(op.sale_amount_usd) || 0
        bySeller[sellerId].total_cost_usd += Number(op.operator_cost_usd) || 0
        bySeller[sellerId].total_margin_usd += Number(op.margin_amount_usd) || 0
        bySeller[sellerId].margins.push(Number(op.margin_percentage) || 0)
      }

      const sellerData = Object.values(bySeller).map((s: any) => {
        const currency = "USD"
        const total_sale = s.total_sale_usd
        const total_cost = s.total_cost_usd
        const total_margin = s.total_margin_usd
        const avg_margin_percent = total_sale > 0 ? (total_margin / total_sale) * 100 : 0

        return {
          ...s,
          currency,
          total_sale,
          total_cost,
          total_margin,
          avg_margin_percent,
        }
      }).sort((a: any, b: any) => b.total_margin - a.total_margin)

      result.bySeller = sellerData
    }

    // Agrupar por operador
    if (viewType === "operator" || viewType === "all") {
      const byOperator: Record<string, any> = {}
      
      for (const op of enrichedOperations) {
        const operatorId = op.operator_id || "unknown"
        const operatorName = (op.operators as any)?.name || "Sin operador"
        
        if (!byOperator[operatorId]) {
          byOperator[operatorId] = {
            operator_id: operatorId,
            operator_name: operatorName,
            count: 0,
            total_cost_usd: 0,
            total_margin_usd: 0,
            margins: [],
          }
        }

        byOperator[operatorId].count++
        byOperator[operatorId].total_cost_usd += Number(op.operator_cost_usd) || 0
        byOperator[operatorId].total_margin_usd += Number(op.margin_amount_usd) || 0
        byOperator[operatorId].margins.push(Number(op.margin_percentage) || 0)
      }

      const operatorData = Object.values(byOperator).map((o: any) => {
        const currency = "USD"
        const total_cost = o.total_cost_usd
        const total_margin = o.total_margin_usd
        const avg_margin_percent = total_cost > 0 ? (total_margin / total_cost) * 100 : 0

        return {
          ...o,
          currency,
          total_cost,
          total_margin,
          avg_margin_percent,
        }
      }).sort((a: any, b: any) => b.total_margin - a.total_margin)

      result.byOperator = operatorData
    }

    // Agrupar por tipo de producto
    if (viewType === "product" || viewType === "all") {
      const byProduct: Record<string, any> = {}
      
      for (const op of enrichedOperations) {
        const productType = op.product_type || "Sin clasificar"
        
        if (!byProduct[productType]) {
          byProduct[productType] = {
            product_type: productType,
            count: 0,
            total_sale_usd: 0,
            total_margin_usd: 0,
            margins: [],
          }
        }

        byProduct[productType].count++
        byProduct[productType].total_sale_usd += Number(op.sale_amount_usd) || 0
        byProduct[productType].total_margin_usd += Number(op.margin_amount_usd) || 0
        byProduct[productType].margins.push(Number(op.margin_percentage) || 0)
      }

      const productData = Object.values(byProduct).map((p: any) => {
        const currency = "USD"
        const total_sale = p.total_sale_usd
        const total_margin = p.total_margin_usd
        const avg_margin_percent = total_sale > 0 ? (total_margin / total_sale) * 100 : 0

        return {
          ...p,
          currency,
          total_sale,
          total_margin,
          avg_margin_percent,
        }
      }).sort((a: any, b: any) => b.total_margin - a.total_margin)

      result.byProduct = productData
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error in GET /api/reports/margins:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
