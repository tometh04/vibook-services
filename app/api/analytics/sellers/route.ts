import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/auth"
import { getExchangeRatesBatch, getLatestExchangeRate } from "@/lib/accounting/exchange-rates"

// Forzar ruta dinámica (usa cookies para autenticación)
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { user } = await getCurrentUser()
    const { searchParams } = new URL(request.url)

    const dateFrom = searchParams.get("dateFrom")
    const dateTo = searchParams.get("dateTo")
    const agencyId = searchParams.get("agencyId")

      const supabase = await createServerClient()

      // Get user agencies
    const { data: userAgencies, error: userAgenciesError } = await supabase
        .from("user_agencies")
        .select("agency_id")
        .eq("user_id", user.id)

    if (userAgenciesError) {
      console.error("Error fetching user agencies:", userAgenciesError)
      return NextResponse.json({ error: "Error al obtener agencias del usuario" }, { status: 500 })
    }

      const agencyIds = (userAgencies || []).map((ua: any) => ua.agency_id)

    // Seguridad multi-tenant: si no hay agencias asignadas y no es SUPER_ADMIN, no devolver datos
    if (user.role !== "SUPER_ADMIN" && agencyIds.length === 0) {
      console.warn("[sellers] Usuario sin agencias asignadas, devolviendo vacío")
      return NextResponse.json({ sellers: [] })
    }

    // Validate date format if provided
    if (dateFrom && !/^\d{4}-\d{2}-\d{2}$/.test(dateFrom)) {
      console.error("Invalid dateFrom format:", dateFrom)
      return NextResponse.json({ error: "Formato de fecha inválido (dateFrom)" }, { status: 400 })
    }

    if (dateTo && !/^\d{4}-\d{2}-\d{2}$/.test(dateTo)) {
      console.error("Invalid dateTo format:", dateTo)
      return NextResponse.json({ error: "Formato de fecha inválido (dateTo)" }, { status: 400 })
    }

    // First, get operations without the relation to avoid potential issues
      let query = supabase
        .from("operations")
      .select("sale_amount_total, margin_amount, seller_id, currency, sale_currency, departure_date, created_at")
      .neq("status", "CANCELLED")

      // Apply role-based filtering
      if (user.role === "SELLER") {
        query = query.eq("seller_id", user.id)
      } else if (agencyIds.length > 0 && user.role !== "SUPER_ADMIN") {
        query = query.in("agency_id", agencyIds)
      }

      // Apply filters
      if (dateFrom) {
      query = query.gte("created_at", `${dateFrom}T00:00:00.000Z`)
      }

      if (dateTo) {
      query = query.lte("created_at", `${dateTo}T23:59:59.999Z`)
      }

      if (agencyId && agencyId !== "ALL") {
        query = query.eq("agency_id", agencyId)
      }

      const { data: operations, error } = await query

      if (error) {
        console.error("Error fetching sellers data:", error)
      console.error("Error details:", JSON.stringify(error, null, 2))
      return NextResponse.json({ error: "Error al obtener datos de vendedores", details: error.message }, { status: 500 })
    }

    // Get unique seller IDs
    const sellerIds = Array.from(new Set((operations || []).map((op: any) => op.seller_id).filter(Boolean)))

    // Fetch seller data separately
    let sellersData: Record<string, any> = {}
    if (sellerIds.length > 0) {
      const { data: sellers, error: sellersError } = await supabase
        .from("users")
        .select("id, name")
        .in("id", sellerIds)

      if (sellersError) {
        console.error("Error fetching sellers:", sellersError)
        // Continue without seller data rather than failing completely
      } else {
        sellersData = (sellers || []).reduce((acc: any, seller: any) => {
          acc[seller.id] = seller
          return acc
        }, {})
      }
      }

      const operationsArray = operations || []
      const latestExchangeRate = await getLatestExchangeRate(supabase) || 1000
      const arsOperations = operationsArray.filter((op: any) => (op.sale_currency || op.currency || "USD") === "ARS")
      const rateDates = arsOperations.map((op: any) => op.departure_date || op.created_at || new Date())
      const exchangeRatesMap = await getExchangeRatesBatch(supabase, rateDates)

      const getRateForOperation = (op: any) => {
        const dateValue = op.departure_date || op.created_at || new Date()
        const dateStr = typeof dateValue === "string"
          ? dateValue.split("T")[0]
          : dateValue.toISOString().split("T")[0]
        const rate = exchangeRatesMap.get(dateStr) || 0
        return rate > 0 ? rate : latestExchangeRate
      }

      // Group by seller (USD)
      const sellerStats = operationsArray.reduce((acc: any, op: any) => {
        const sellerId = op.seller_id
      if (!sellerId) return acc

      const seller = sellersData[sellerId]
      const sellerName = seller?.name || "Vendedor"

        if (!acc[sellerId]) {
          acc[sellerId] = {
            sellerId,
            sellerName,
            totalSales: 0,
            totalMargin: 0,
            operationsCount: 0,
          }
        }

        const currency = op.sale_currency || op.currency || "USD"
        const saleAmount = op.sale_amount_total || 0
        const marginAmount = op.margin_amount || 0
        if (currency === "ARS") {
          const rate = getRateForOperation(op)
          acc[sellerId].totalSales += rate ? saleAmount / rate : 0
          acc[sellerId].totalMargin += rate ? marginAmount / rate : 0
        } else {
          acc[sellerId].totalSales += saleAmount
          acc[sellerId].totalMargin += marginAmount
        }
        acc[sellerId].operationsCount += 1

        return acc
      }, {})

      const sellers = Object.values(sellerStats).map((seller: any) => ({
        id: seller.sellerId,
        name: seller.sellerName,
        totalSales: seller.totalSales,
        margin: seller.totalMargin,
        operationsCount: seller.operationsCount,
        avgMarginPercent: seller.totalSales > 0 ? (seller.totalMargin / seller.totalSales) * 100 : 0,
      }))

      // Sort by total sales descending
      sellers.sort((a: any, b: any) => b.totalSales - a.totalSales)

    return NextResponse.json({ sellers })
  } catch (error: any) {
    console.error("Error in GET /api/analytics/sellers:", error)
    return NextResponse.json({ error: error.message || "Error al obtener datos de vendedores" }, { status: 500 })
  }
}
