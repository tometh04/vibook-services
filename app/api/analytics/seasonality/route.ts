import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/auth"
import { startOfMonth, endOfMonth, subMonths, format, getMonth, getYear } from "date-fns"
import { es } from "date-fns/locale"
import { getExchangeRatesBatch, getLatestExchangeRate } from "@/lib/accounting/exchange-rates"

export async function GET(request: Request) {
  try {
    const { user } = await getCurrentUser()
    const supabase = await createServerClient()
    const { searchParams } = new URL(request.url)

    // Parámetros de filtro
    const months = parseInt(searchParams.get("months") || "12")
    const agencyId = searchParams.get("agencyId")

    // Fecha de inicio (N meses atrás)
    const startDate = startOfMonth(subMonths(new Date(), months - 1))
    const endDate = endOfMonth(new Date())

    // Obtener agencias del usuario
    const { data: userAgencies } = await supabase
      .from("user_agencies")
      .select("agency_id")
      .eq("user_id", user.id)

    const agencyIds = (userAgencies || []).map((ua: any) => ua.agency_id)

    // Seguridad multi-tenant: si no hay agencias asignadas y no es SUPER_ADMIN, no devolver datos
    if (user.role !== "SUPER_ADMIN" && agencyIds.length === 0) {
      console.warn("[seasonality] Usuario sin agencias asignadas, devolviendo vacío")
      return NextResponse.json({
        success: true,
        period: {
          start: format(startDate, "yyyy-MM-dd"),
          end: format(endDate, "yyyy-MM-dd"),
          months,
        },
        monthlyData: [],
        summary: {
          avgMonthlySales: 0,
          avgMonthlyMargin: 0,
          avgMonthlyOperations: 0,
          bestMonth: null,
          worstMonth: null,
          trend: { percentage: 0, direction: "up" },
        },
      })
    }

    // Query base
    let query = (supabase.from("operations") as any)
      .select("sale_amount_total, margin_amount, currency, sale_currency, departure_date, created_at")
      .not("status", "eq", "CANCELLED")
      .gte("created_at", startDate.toISOString())
      .lte("created_at", endDate.toISOString())

    // Filtrar por agencia
    if (agencyId && agencyId !== "ALL") {
      query = query.eq("agency_id", agencyId)
    } else if (user.role !== "SUPER_ADMIN" && agencyIds.length > 0) {
      query = query.in("agency_id", agencyIds)
    }

    const { data: operations, error } = await query

    if (error) {
      console.error("Error fetching operations:", error)
      return NextResponse.json({ error: "Error al obtener datos" }, { status: 500 })
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

    // Generar estructura de meses
    const monthsData: Record<string, {
      month: string
      monthName: string
      year: number
      sales: number
      margin: number
      operationCount: number
    }> = {}

    // Inicializar todos los meses del período
    for (let i = 0; i < months; i++) {
      const date = subMonths(new Date(), months - 1 - i)
      const key = format(date, "yyyy-MM")
      monthsData[key] = {
        month: key,
        monthName: format(date, "MMM yyyy", { locale: es }),
        year: getYear(date),
        sales: 0,
        margin: 0,
        operationCount: 0,
      }
    }

    // Agregar datos de operaciones
    for (const op of operationsArray) {
      const date = new Date(op.created_at)
      const key = format(date, "yyyy-MM")
      if (monthsData[key]) {
        const currency = op.sale_currency || op.currency || "USD"
        const saleAmount = op.sale_amount_total || 0
        const marginAmount = op.margin_amount || 0
        if (currency === "ARS") {
          const rate = getRateForOperation(op)
          const divisor = rate || 1
          monthsData[key].sales += saleAmount / divisor
          monthsData[key].margin += marginAmount / divisor
        } else {
          monthsData[key].sales += saleAmount
          monthsData[key].margin += marginAmount
        }
        monthsData[key].operationCount += 1
      }
    }

    const monthlyData = Object.values(monthsData)

    // Calcular promedio mensual
    const avgMonthlySales = monthlyData.reduce((sum, m) => sum + m.sales, 0) / months
    const avgMonthlyMargin = monthlyData.reduce((sum, m) => sum + m.margin, 0) / months
    const avgMonthlyOperations = monthlyData.reduce((sum, m) => sum + m.operationCount, 0) / months

    // Encontrar mejor y peor mes
    const sortedBySales = [...monthlyData].sort((a, b) => b.sales - a.sales)
    const bestMonth = sortedBySales[0]
    const worstMonth = sortedBySales[sortedBySales.length - 1]

    // Tendencia (comparar últimos 3 meses con anteriores 3)
    const recent3 = monthlyData.slice(-3)
    const previous3 = monthlyData.slice(-6, -3)
    const recent3Avg = recent3.reduce((sum, m) => sum + m.sales, 0) / 3
    const previous3Avg = previous3.length > 0 
      ? previous3.reduce((sum, m) => sum + m.sales, 0) / previous3.length 
      : recent3Avg
    const trendPercentage = previous3Avg > 0 
      ? ((recent3Avg - previous3Avg) / previous3Avg) * 100 
      : 0

    return NextResponse.json({
      success: true,
      period: {
        start: format(startDate, "yyyy-MM-dd"),
        end: format(endDate, "yyyy-MM-dd"),
        months,
      },
      monthlyData,
      summary: {
        avgMonthlySales,
        avgMonthlyMargin,
        avgMonthlyOperations,
        bestMonth,
        worstMonth,
        trend: {
          percentage: trendPercentage,
          direction: trendPercentage >= 0 ? "up" : "down",
        },
      },
    })
  } catch (error: any) {
    console.error("Error in seasonality analytics:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
