import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { subMonths, format } from "date-fns"
import { es } from "date-fns/locale"
import { getExchangeRatesBatch, getLatestExchangeRate } from "@/lib/accounting/exchange-rates"

export const dynamic = 'force-dynamic'

// Helper para parsear números de forma segura
const safeParseFloat = (value: any): number => {
  if (value === null || value === undefined || value === '') return 0
  const parsed = parseFloat(value)
  return isNaN(parsed) ? 0 : parsed
}

// Helper para obtener fecha segura
const safeDate = (dateStr: any): Date | null => {
  if (!dateStr) return null
  try {
    const date = new Date(dateStr)
    return isNaN(date.getTime()) ? null : date
  } catch {
    return null
  }
}

export async function GET(request: Request) {
  try {
    const supabase = await createServerClient()
    
    // Autenticación
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !authUser) {
      console.error("[Operations Statistics] Auth error:", authError)
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }

    // Usuario de DB
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, role')
      .eq('auth_id', authUser.id)
      .single()

    if (userError || !user) {
      console.error("[Operations Statistics] User error:", userError)
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const agencyId = searchParams.get("agencyId")
    const months = Math.max(1, Math.min(24, parseInt(searchParams.get("months") || "12")))

    // Obtener agencias del usuario
    let agencyIds: string[] = []
    
    if (user.role === "SUPER_ADMIN") {
      const { data: agencies, error: agenciesError } = await supabase.from("agencies").select("id")
      if (agenciesError) {
        console.error("[Operations Statistics] Error fetching agencies:", agenciesError)
      } else {
        agencyIds = (agencies || []).map((a: any) => a.id).filter(Boolean)
      }
    } else {
      const { data: userAgencies, error: uaError } = await supabase
        .from("user_agencies")
        .select("agency_id")
        .eq("user_id", user.id)
      
      if (uaError) {
        console.error("[Operations Statistics] Error fetching user_agencies:", uaError)
      } else {
        agencyIds = (userAgencies || []).map((ua: any) => ua?.agency_id).filter(Boolean)
      }
    }

    console.log(`[Operations Statistics] User ${user.id} (${user.role}) - Agencies: ${agencyIds.length}`)

    // Si no tiene agencias y no es SUPER_ADMIN, retornar datos vacíos válidos
    if (user.role !== "SUPER_ADMIN" && agencyIds.length === 0) {
      return NextResponse.json({
        overview: {
          totalOperations: 0,
          confirmedOperations: 0,
          pendingOperations: 0,
          cancelledOperations: 0,
          totalSales: 0,
          totalMargin: 0,
          avgMarginPercentage: 0,
          avgTicket: 0,
          conversionRate: 0,
        },
        distributions: {
          byStatus: [],
          byDestination: [],
        },
        trends: {
          monthly: [],
        },
        rankings: {
          topDestinations: [],
          topSellers: [],
        },
      })
    }

    // Query de operaciones
    let operationsQuery = supabase
      .from("operations")
      .select("id, destination, status, sale_amount_total, operator_cost, margin_amount, margin_percentage, currency, sale_currency, departure_date, created_at, agency_id, seller_id")

    // Filtrar por agencia
    if (agencyId && agencyId !== "ALL") {
      operationsQuery = operationsQuery.eq("agency_id", agencyId)
    } else if (user.role !== "SUPER_ADMIN" && agencyIds.length > 0) {
      operationsQuery = operationsQuery.in("agency_id", agencyIds)
    }

    // Filtrar por período (meses) para no traer operaciones de toda la historia
    const dateThreshold = subMonths(new Date(), months).toISOString()
    operationsQuery = operationsQuery.gte("created_at", dateThreshold)

    const { data: operations, error: operationsError } = await operationsQuery

    if (operationsError) {
      console.error("[Operations Statistics] Query error:", operationsError)
      return NextResponse.json({ 
        error: "Error al obtener operaciones: " + operationsError.message 
      }, { status: 500 })
    }

    const opsList = operations || []
    console.log(`[Operations Statistics] Found ${opsList.length} operations`)

    const now = new Date()

    const latestExchangeRate = await getLatestExchangeRate(supabase) || 1000
    const arsOperations = opsList.filter((op: any) => (op.sale_currency || op.currency || "USD") === "ARS")
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

    const toUsd = (amount: number, op: any) => {
      const currency = op.sale_currency || op.currency || "USD"
      if (currency === "ARS") {
        const rate = getRateForOperation(op)
        return rate ? amount / rate : 0
      }
      return amount
    }

    // Inicializar estructuras
    const statusCounts: Record<string, number> = {
      PRE_RESERVATION: 0,
      RESERVED: 0,
      CONFIRMED: 0,
      CANCELLED: 0,
      TRAVELLED: 0,
      CLOSED: 0,
    }

    const statusLabels: Record<string, string> = {
      PRE_RESERVATION: "Pre-reserva",
      RESERVED: "Reservado",
      CONFIRMED: "Confirmado",
      CANCELLED: "Cancelado",
      TRAVELLED: "Viajado",
      CLOSED: "Cerrado",
    }

    const destinationStats: Record<string, {
      destination: string
      count: number
      totalSales: number
      totalMargin: number
      avgMargin: number
    }> = {}

    const monthlyStats: Record<string, {
      month: string
      monthName: string
      count: number
      sales: number
      margin: number
    }> = {}

    // Inicializar meses
    for (let i = 0; i < months; i++) {
      const date = subMonths(now, months - 1 - i)
      const key = format(date, "yyyy-MM")
      monthlyStats[key] = {
        month: key,
        monthName: format(date, "MMM yy", { locale: es }),
        count: 0,
        sales: 0,
        margin: 0,
      }
    }

    const revenueStatuses = new Set(["PRE_RESERVATION", "RESERVED", "CONFIRMED", "TRAVELLED", "CLOSED"])
    const confirmedStatuses = new Set(["CONFIRMED", "TRAVELLED", "CLOSED"])

    // Procesar operaciones
    let totalSales = 0
    let totalMargin = 0
    let totalOperations = 0
    let confirmedOperations = 0
    let salesOperations = 0

    for (const op of opsList) {
      if (!op || !op.id) continue

      // Contar por estado
      const status = op.status || 'UNKNOWN'
      if (statusCounts[status] !== undefined) {
        statusCounts[status]++
      }

      totalOperations++
      if (confirmedStatuses.has(status)) {
        confirmedOperations++
      }

      // Estadísticas financieras para operaciones con venta registrada
      if (revenueStatuses.has(status)) {
        salesOperations++
        const saleAmount = safeParseFloat(op.sale_amount_total)
        const marginAmount = safeParseFloat(op.margin_amount)
        const saleAmountUsd = toUsd(saleAmount, op)
        const marginAmountUsd = toUsd(marginAmount, op)

        totalSales += saleAmountUsd
        totalMargin += marginAmountUsd

        // Por destino
        const dest = (op.destination || "Sin destino").trim()
        if (!destinationStats[dest]) {
          destinationStats[dest] = {
            destination: dest,
            count: 0,
            totalSales: 0,
            totalMargin: 0,
            avgMargin: 0,
          }
        }
        destinationStats[dest].count++
        destinationStats[dest].totalSales += saleAmountUsd
        destinationStats[dest].totalMargin += marginAmountUsd

        // Por mes (usando departure_date o created_at como fallback)
        const dateToUse = op.departure_date || op.created_at
        if (dateToUse) {
          const date = safeDate(dateToUse)
          if (date) {
            const monthKey = format(date, "yyyy-MM")
            if (monthlyStats[monthKey]) {
              monthlyStats[monthKey].count++
              monthlyStats[monthKey].sales += saleAmountUsd
              monthlyStats[monthKey].margin += marginAmountUsd
            }
          }
        }
      }
    }

    // Calcular promedios de destinos
    Object.values(destinationStats).forEach(d => {
      d.avgMargin = d.totalSales > 0 ? (d.totalMargin / d.totalSales) * 100 : 0
    })

    // Top 10 destinos por ventas
    const topDestinations = Object.values(destinationStats)
      .filter(d => d.totalSales > 0)
      .sort((a, b) => b.totalSales - a.totalSales)
      .slice(0, 10)

    // Conversión de estados a array (solo los que tienen count > 0)
    const statusDistribution = Object.entries(statusCounts)
      .filter(([_, count]) => count > 0)
      .map(([status, count]) => ({
        status,
        label: statusLabels[status] || status,
        count,
      }))

    // Conversión de meses a array
    const monthlyTrend = Object.values(monthlyStats)

    // Estadísticas de rentabilidad
    const avgMarginPercentage = totalSales > 0 ? (totalMargin / totalSales) * 100 : 0
    const avgTicket = salesOperations > 0 ? totalSales / salesOperations : 0

    // Operaciones pendientes
    const pendingOperations = opsList.filter((op: any) => {
      if (!op) return false
      const status = op.status || ''
      const departureDate = safeDate(op.departure_date)
      return ["CONFIRMED", "RESERVED"].includes(status) && departureDate && departureDate > now
    }).length

    // Conversión rate
    const conversionRate = totalOperations > 0 
      ? ((confirmedOperations / totalOperations) * 100) 
      : 0

    // Top vendedores
    const sellerStats: Record<string, {
      id: string
      name: string
      count: number
      sales: number
      margin: number
    }> = {}

    for (const op of opsList) {
      if (!op) continue
      const status = op.status || ''
      if (revenueStatuses.has(status) && op.seller_id) {
        const sellerId = op.seller_id
        if (!sellerStats[sellerId]) {
          sellerStats[sellerId] = {
            id: sellerId,
            name: 'Vendedor',
            count: 0,
            sales: 0,
            margin: 0,
          }
        }
        sellerStats[sellerId].count++
        const saleAmount = safeParseFloat(op.sale_amount_total)
        const marginAmount = safeParseFloat(op.margin_amount)
        sellerStats[sellerId].sales += toUsd(saleAmount, op)
        sellerStats[sellerId].margin += toUsd(marginAmount, op)
      }
    }

    // Obtener nombres de vendedores
    const sellerIds = Object.keys(sellerStats)
    const sellerNamesMap: Record<string, string> = {}
    
    if (sellerIds.length > 0) {
      const { data: sellers, error: sellersError } = await supabase
        .from("users")
        .select("id, name")
        .in("id", sellerIds)
      
      if (sellersError) {
        console.error("[Operations Statistics] Error fetching sellers:", sellersError)
      } else if (sellers) {
        sellers.forEach((seller: any) => {
          if (seller && seller.id) {
            sellerNamesMap[seller.id] = seller.name || "Sin nombre"
          }
        })
      }
    }

    // Top 5 vendedores
    const topSellers = Object.values(sellerStats)
      .filter(s => s.sales > 0)
      .map(seller => ({
        ...seller,
        name: sellerNamesMap[seller.id] || seller.name
      }))
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 5)

    console.log(`[Operations Statistics] Final:`, {
      totalOps: totalOperations,
      confirmed: confirmedOperations,
      sales: totalSales,
      margin: totalMargin,
      destinations: topDestinations.length,
      sellers: topSellers.length,
    })

    return NextResponse.json({
      overview: {
        totalOperations,
        confirmedOperations,
        pendingOperations,
        cancelledOperations: statusCounts.CANCELLED || 0,
        totalSales: Math.round(totalSales),
        totalMargin: Math.round(totalMargin),
        avgMarginPercentage: Math.round(avgMarginPercentage * 10) / 10,
        avgTicket: Math.round(avgTicket),
        conversionRate: Math.round(conversionRate * 10) / 10,
      },
      distributions: {
        byStatus: statusDistribution,
        byDestination: topDestinations,
      },
      trends: {
        monthly: monthlyTrend,
      },
      rankings: {
        topDestinations,
        topSellers,
      },
    })
  } catch (error: any) {
    console.error("[Operations Statistics] Unexpected error:", error)
    return NextResponse.json({
      error: "Error inesperado: " + (error?.message || "Unknown error"),
      overview: {
        totalOperations: 0,
        confirmedOperations: 0,
        pendingOperations: 0,
        cancelledOperations: 0,
        totalSales: 0,
        totalMargin: 0,
        avgMarginPercentage: 0,
        avgTicket: 0,
        conversionRate: 0,
      },
      distributions: {
        byStatus: [],
        byDestination: [],
      },
      trends: {
        monthly: [],
      },
      rankings: {
        topDestinations: [],
        topSellers: [],
      },
    }, { status: 500 })
  }
}
