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
    const limit = searchParams.get("limit") || "5"

      const supabase = await createServerClient()

      // Get user agencies
      const { data: userAgencies } = await supabase
        .from("user_agencies")
        .select("agency_id")
        .eq("user_id", user.id)

      const agencyIds = (userAgencies || []).map((ua: any) => ua.agency_id)

      // Seguridad multi-tenant: si no hay agencias asignadas y no es SUPER_ADMIN, no devolver datos
      if (user.role !== "SUPER_ADMIN" && agencyIds.length === 0) {
        console.warn("[destinations] Usuario sin agencias asignadas, devolviendo vacío")
        return NextResponse.json({ destinations: [] })
      }

      let query = supabase.from("operations").select("destination, sale_amount_total, margin_amount, currency, sale_currency, departure_date, created_at").neq("status", "CANCELLED")

      // Apply role-based filtering
      if (user.role === "SELLER") {
        query = query.eq("seller_id", user.id)
      } else if (agencyIds.length > 0 && user.role !== "SUPER_ADMIN") {
        query = query.in("agency_id", agencyIds)
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
        console.error("Error fetching destinations data:", error)
        throw new Error("Error al obtener datos de destinos")
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

      // Group by destination (USD)
      const destinationStats = operationsArray.reduce((acc: any, op: any) => {
        const destination = op.destination || "Sin destino"

        if (!acc[destination]) {
          acc[destination] = {
            destination,
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
          acc[destination].totalSales += rate ? saleAmount / rate : 0
          acc[destination].totalMargin += rate ? marginAmount / rate : 0
        } else {
          acc[destination].totalSales += saleAmount
          acc[destination].totalMargin += marginAmount
        }
        acc[destination].operationsCount += 1

        return acc
      }, {})

      const destinations = Object.values(destinationStats)
        .map((dest: any) => ({
          ...dest,
          avgMarginPercent: dest.totalSales > 0 ? (dest.totalMargin / dest.totalSales) * 100 : 0,
        }))
        .sort((a: any, b: any) => b.totalSales - a.totalSales)
        .slice(0, Number(limit))

    return NextResponse.json({ destinations })
  } catch (error: any) {
    console.error("Error in GET /api/analytics/destinations:", error)
    return NextResponse.json({ error: error.message || "Error al obtener datos de destinos" }, { status: 500 })
  }
}
