import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/auth"
import { getUserAgencyIds } from "@/lib/permissions-api"
import { subMonths, format } from "date-fns"
import { es } from "date-fns/locale"
import { getExchangeRatesBatch, getLatestExchangeRate } from "@/lib/accounting/exchange-rates"
import { verifyFeatureAccess } from "@/lib/billing/subscription-middleware"

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { user } = await getCurrentUser()
    const supabase = await createServerClient()
    const { searchParams } = new URL(request.url)

    // Parámetros de filtro
    const agencyId = searchParams.get("agencyId")
    const months = parseInt(searchParams.get("months") || "12")

    const featureAccess = await verifyFeatureAccess(
      user.id,
      user.role,
      "crm",
      agencyId && agencyId !== "ALL" ? agencyId : undefined
    )
    if (!featureAccess.hasAccess) {
      return NextResponse.json(
        { error: featureAccess.message || "No tiene acceso al CRM" },
        { status: 403 }
      )
    }

    // Obtener agencias del usuario
    const agencyIds = await getUserAgencyIds(supabase, user.id, user.role as any)

    // Query de leads - EXACTAMENTE igual a sales/statistics
    let leadsQuery = (supabase.from("leads") as any)
      .select(`
        id,
        status,
        source,
        region,
        destination,
        created_at,
        assigned_seller_id,
        has_deposit,
        deposit_amount,
        deposit_currency,
        deposit_date,
        agency_id
      `)

    // Filtrar por agencia
    if (agencyId && agencyId !== "ALL") {
      leadsQuery = leadsQuery.eq("agency_id", agencyId)
    } else if (user.role !== "SUPER_ADMIN" && agencyIds.length > 0) {
      leadsQuery = leadsQuery.in("agency_id", agencyIds)
    }

    const { data: leads, error: leadsError } = await leadsQuery

    if (leadsError) {
      console.error("Error fetching leads:", leadsError)
      return NextResponse.json({ error: "Error al obtener leads" }, { status: 500 })
    }

    const now = new Date()

    // Pipeline de ventas (por estado) - EXACTAMENTE igual
    const pipeline: Record<string, { status: string, label: string, count: number, value: number }> = {
      NEW: { status: "NEW", label: "Nuevo", count: 0, value: 0 },
      IN_PROGRESS: { status: "IN_PROGRESS", label: "En Progreso", count: 0, value: 0 },
      QUOTED: { status: "QUOTED", label: "Cotizado", count: 0, value: 0 },
      WON: { status: "WON", label: "Ganado", count: 0, value: 0 },
      LOST: { status: "LOST", label: "Perdido", count: 0, value: 0 },
    }

    // Por origen (source) - EXACTAMENTE igual
    const bySource: Record<string, { source: string, count: number, won: number, conversionRate: number }> = {
      Instagram: { source: "Instagram", count: 0, won: 0, conversionRate: 0 },
      WhatsApp: { source: "WhatsApp", count: 0, won: 0, conversionRate: 0 },
      "Meta Ads": { source: "Meta Ads", count: 0, won: 0, conversionRate: 0 },
      Other: { source: "Otro", count: 0, won: 0, conversionRate: 0 },
    }

    // Por región - EXACTAMENTE igual
    const byRegion: Record<string, { region: string, count: number, won: number }> = {}

    // Por vendedor - EXACTAMENTE igual
    const bySeller: Record<string, { id: string, name: string, leads: number, won: number, conversionRate: number }> = {}

    // Por mes - EXACTAMENTE igual
    const monthlyStats: Record<string, {
      month: string
      monthName: string
      newLeads: number
      wonLeads: number
      lostLeads: number
    }> = {}

    // Inicializar meses - EXACTAMENTE igual
    for (let i = 0; i < months; i++) {
      const date = subMonths(now, months - 1 - i)
      const key = format(date, "yyyy-MM")
      monthlyStats[key] = {
        month: key,
        monthName: format(date, "MMM yy", { locale: es }),
        newLeads: 0,
        wonLeads: 0,
        lostLeads: 0,
      }
    }

    const latestExchangeRate = await getLatestExchangeRate(supabase) || 1000
    const leadsArray = leads || []
    const arsDeposits = leadsArray.filter((lead: any) => lead.has_deposit && lead.deposit_amount && (lead.deposit_currency || "USD") === "ARS")
    const rateDates = arsDeposits.map((lead: any) => lead.deposit_date || lead.created_at || new Date())
    const exchangeRatesMap = await getExchangeRatesBatch(supabase, rateDates)

    const getRateForLead = (lead: any) => {
      const dateValue = lead.deposit_date || lead.created_at || new Date()
      const dateStr = typeof dateValue === "string"
        ? dateValue.split("T")[0]
        : dateValue.toISOString().split("T")[0]
      const rate = exchangeRatesMap.get(dateStr) || 0
      return rate > 0 ? rate : latestExchangeRate
    }

    // Procesar leads - EXACTAMENTE igual
    let totalLeads = 0
    let totalWon = 0
    let totalLost = 0
    let totalDeposits = 0

    for (const lead of leadsArray) {
      totalLeads++

      // Pipeline
      if (pipeline[lead.status]) {
        pipeline[lead.status].count++
        if (lead.has_deposit && lead.deposit_amount) {
          const depositAmount = parseFloat(lead.deposit_amount) || 0
          const currency = lead.deposit_currency || "USD"
          const depositUsd = currency === "ARS"
            ? (depositAmount / (getRateForLead(lead) || 1))
            : depositAmount
          pipeline[lead.status].value += depositUsd
          totalDeposits += depositUsd
        }
      }

      // Por estado
      if (lead.status === "WON") totalWon++
      if (lead.status === "LOST") totalLost++

      // Por origen
      const source = lead.source || "Other"
      if (bySource[source]) {
        bySource[source].count++
        if (lead.status === "WON") bySource[source].won++
      }

      // Por región
      const region = lead.region || "OTROS"
      if (!byRegion[region]) {
        byRegion[region] = { region, count: 0, won: 0 }
      }
      byRegion[region].count++
      if (lead.status === "WON") byRegion[region].won++

      // Por vendedor
      if (lead.assigned_seller_id) {
        if (!bySeller[lead.assigned_seller_id]) {
          bySeller[lead.assigned_seller_id] = {
            id: lead.assigned_seller_id,
            name: 'Vendedor',
            leads: 0,
            won: 0,
            conversionRate: 0,
          }
        }
        bySeller[lead.assigned_seller_id].leads++
        if (lead.status === "WON") bySeller[lead.assigned_seller_id].won++
      }

      // Por mes
      if (lead.created_at) {
        const monthKey = format(new Date(lead.created_at), "yyyy-MM")
        if (monthlyStats[monthKey]) {
          monthlyStats[monthKey].newLeads++
          if (lead.status === "WON") monthlyStats[monthKey].wonLeads++
          if (lead.status === "LOST") monthlyStats[monthKey].lostLeads++
        }
      }
    }

    // Calcular tasas de conversión - EXACTAMENTE igual
    Object.values(bySource).forEach(s => {
      s.conversionRate = s.count > 0 ? (s.won / s.count) * 100 : 0
    })

    Object.values(bySeller).forEach(s => {
      s.conversionRate = s.leads > 0 ? (s.won / s.leads) * 100 : 0
    })

    // Conversion rate general - EXACTAMENTE igual
    const overallConversionRate = totalLeads > 0 ? (totalWon / totalLeads) * 100 : 0

    // Top vendedores por conversión - EXACTAMENTE igual
    const topSellers = Object.values(bySeller)
      .filter(s => s.leads >= 5) // Mínimo 5 leads para ser considerado
      .sort((a, b) => b.conversionRate - a.conversionRate)
      .slice(0, 5)

    // Top orígenes - EXACTAMENTE igual
    const topSources = Object.values(bySource)
      .filter(s => s.count > 0)
      .sort((a, b) => b.conversionRate - a.conversionRate)

    // Top regiones - EXACTAMENTE igual
    const topRegions = Object.values(byRegion)
      .sort((a, b) => b.count - a.count)
      .slice(0, 6)

    // Leads activos (no ganados ni perdidos) - EXACTAMENTE igual
    const activeLeads = totalLeads - totalWon - totalLost

    // Leads este mes - EXACTAMENTE igual
    const thisMonth = format(now, "yyyy-MM")
    const newThisMonth = monthlyStats[thisMonth]?.newLeads || 0

    // Retornar EXACTAMENTE la misma estructura que sales/statistics
    return NextResponse.json({
      overview: {
        totalLeads,
        activeLeads,
        wonLeads: totalWon,
        lostLeads: totalLost,
        conversionRate: Math.round(overallConversionRate * 10) / 10,
        totalDeposits,
        newThisMonth,
      },
      pipeline: Object.values(pipeline),
      distributions: {
        bySource: topSources,
        byRegion: topRegions,
        bySeller: topSellers,
      },
      trends: {
        monthly: Object.values(monthlyStats),
      },
      rankings: {
        topSellers,
        topSources,
      },
    })
  } catch (error: any) {
    console.error("Error in GET /api/leads/statistics:", error)
    return NextResponse.json(
      { error: error.message || "Error al obtener estadísticas" },
      { status: 500 }
    )
  }
}
