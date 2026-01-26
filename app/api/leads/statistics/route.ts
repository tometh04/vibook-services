import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/auth"
import { getUserAgencyIds } from "@/lib/permissions-api"
import { subMonths, format } from "date-fns"
import { es } from "date-fns/locale"

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { user } = await getCurrentUser()
    const supabase = await createServerClient()
    const { searchParams } = new URL(request.url)

    // Parámetros de filtro
    const agencyId = searchParams.get("agencyId")
    const months = parseInt(searchParams.get("months") || "12")

    // Obtener agencias del usuario
    const agencyIds = await getUserAgencyIds(supabase, user.id, user.role as any)

    // Si no es SUPER_ADMIN y no tiene agencias, retornar datos vacíos
    if (user.role !== "SUPER_ADMIN" && agencyIds.length === 0) {
      return NextResponse.json({
        overview: {
          totalLeads: 0,
          activeLeads: 0,
          wonLeads: 0,
          lostLeads: 0,
          conversionRate: 0,
          totalQuoted: 0,
          totalDeposits: 0,
          newThisMonth: 0,
          avgBudget: 0,
          avgAdults: 0,
          avgChildren: 0,
          avgInfants: 0,
          totalPassengers: 0,
        },
        pipeline: [],
        distributions: {
          bySource: [],
          byRegion: [],
          byDestination: [],
          bySeller: [],
          byBudget: [],
        },
        trends: {
          monthly: [],
        },
        rankings: {
          topSellers: [],
          topSources: [],
          topDestinations: [],
        },
      })
    }

    // Query de leads con TODOS los campos relevantes
    let leadsQuery = supabase
      .from("leads")
      .select(`
        id,
        status,
        source,
        region,
        destination,
        contact_name,
        contact_phone,
        contact_email,
        contact_instagram,
        assigned_seller_id,
        quoted_price,
        has_deposit,
        deposit_amount,
        deposit_currency,
        deposit_method,
        deposit_date,
        budget_min,
        budget_max,
        budget_currency,
        departure_date,
        return_date,
        adults,
        children,
        infants,
        created_at,
        updated_at,
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
      return NextResponse.json({ 
        error: "Error al obtener leads",
        details: leadsError.message 
      }, { status: 500 })
    }

    // Si no hay leads, retornar estructura vacía
    if (!leads || leads.length === 0) {
      const now = new Date()
      const monthlyStats: Array<{
        month: string
        monthName: string
        newLeads: number
        wonLeads: number
        lostLeads: number
        quotedLeads: number
        totalQuoted: number
        totalDeposits: number
      }> = []

      for (let i = 0; i < months; i++) {
        const date = subMonths(now, months - 1 - i)
        monthlyStats.push({
          month: format(date, "yyyy-MM"),
          monthName: format(date, "MMM yy", { locale: es }),
          newLeads: 0,
          wonLeads: 0,
          lostLeads: 0,
          quotedLeads: 0,
          totalQuoted: 0,
          totalDeposits: 0,
        })
      }

      return NextResponse.json({
        overview: {
          totalLeads: 0,
          activeLeads: 0,
          wonLeads: 0,
          lostLeads: 0,
          conversionRate: 0,
          totalQuoted: 0,
          totalDeposits: 0,
          newThisMonth: 0,
          avgBudget: 0,
          avgAdults: 0,
          avgChildren: 0,
          avgInfants: 0,
          totalPassengers: 0,
        },
        pipeline: [
          { status: "NEW", label: "Nuevo", count: 0, value: 0 },
          { status: "IN_PROGRESS", label: "En Progreso", count: 0, value: 0 },
          { status: "QUOTED", label: "Cotizado", count: 0, value: 0 },
          { status: "WON", label: "Ganado", count: 0, value: 0 },
          { status: "LOST", label: "Perdido", count: 0, value: 0 },
        ],
        distributions: {
          bySource: [],
          byRegion: [],
          byDestination: [],
          bySeller: [],
          byBudget: [],
        },
        trends: {
          monthly: monthlyStats,
        },
        rankings: {
          topSellers: [],
          topSources: [],
          topDestinations: [],
        },
      })
    }

    // Obtener nombres de vendedores en batch
    const sellerIds = new Set<string>()
    for (const lead of leads || []) {
      if (lead.assigned_seller_id) {
        sellerIds.add(lead.assigned_seller_id)
      }
    }

    const sellerNamesMap = new Map<string, string>()
    if (sellerIds.size > 0) {
      const { data: sellers, error: sellersError } = await supabase
        .from("users")
        .select("id, name")
        .in("id", Array.from(sellerIds))
      
      if (sellersError) {
        console.error("Error fetching sellers:", sellersError)
        // Continuar sin nombres de vendedores en lugar de fallar completamente
      } else if (sellers) {
        for (const seller of sellers) {
          sellerNamesMap.set(seller.id, seller.name || "Sin nombre")
        }
      }
    }

    const now = new Date()

    // Pipeline de ventas (por estado)
    const pipeline: Record<string, { status: string, label: string, count: number, value: number }> = {
      NEW: { status: "NEW", label: "Nuevo", count: 0, value: 0 },
      IN_PROGRESS: { status: "IN_PROGRESS", label: "En Progreso", count: 0, value: 0 },
      QUOTED: { status: "QUOTED", label: "Cotizado", count: 0, value: 0 },
      WON: { status: "WON", label: "Ganado", count: 0, value: 0 },
      LOST: { status: "LOST", label: "Perdido", count: 0, value: 0 },
    }

    // Por origen (source)
    const bySource: Record<string, { source: string, count: number, won: number, conversionRate: number, totalQuoted: number, totalDeposits: number }> = {}

    // Por región
    const byRegion: Record<string, { region: string, count: number, won: number, conversionRate: number, totalQuoted: number }> = {}

    // Por destino (top destinos)
    const byDestination: Record<string, { destination: string, count: number, won: number, conversionRate: number }> = {}

    // Por vendedor
    const bySeller: Record<string, { id: string, name: string, leads: number, won: number, conversionRate: number, totalQuoted: number }> = {}

    // Por mes
    const monthlyStats: Record<string, {
      month: string
      monthName: string
      newLeads: number
      wonLeads: number
      lostLeads: number
      quotedLeads: number
      totalQuoted: number
      totalDeposits: number
    }> = {}

    // Inicializar meses
    for (let i = 0; i < months; i++) {
      const date = subMonths(now, months - 1 - i)
      const key = format(date, "yyyy-MM")
      monthlyStats[key] = {
        month: key,
        monthName: format(date, "MMM yy", { locale: es }),
        newLeads: 0,
        wonLeads: 0,
        lostLeads: 0,
        quotedLeads: 0,
        totalQuoted: 0,
        totalDeposits: 0,
      }
    }

    // Procesar leads
    let totalLeads = 0
    let totalWon = 0
    let totalLost = 0
    let totalQuoted = 0
    let totalDeposits = 0
    let totalBudget = 0
    let totalBudgetCount = 0
    let totalAdults = 0
    let totalChildren = 0
    let totalInfants = 0

    for (const lead of leads || []) {
      totalLeads++

      // Pipeline
      if (pipeline[lead.status]) {
        pipeline[lead.status].count++
        if (lead.quoted_price) {
          const quoted = parseFloat(String(lead.quoted_price)) || 0
          pipeline[lead.status].value += quoted
          totalQuoted += quoted
        }
      }

      // Por estado
      if (lead.status === "WON") totalWon++
      if (lead.status === "LOST") totalLost++

      // Por origen
      const source = lead.source || "Other"
      if (!bySource[source]) {
        bySource[source] = { source, count: 0, won: 0, conversionRate: 0, totalQuoted: 0, totalDeposits: 0 }
      }
      bySource[source].count++
      if (lead.status === "WON") bySource[source].won++
      if (lead.quoted_price) {
        bySource[source].totalQuoted += parseFloat(String(lead.quoted_price)) || 0
      }
      if (lead.has_deposit && lead.deposit_amount) {
        const deposit = parseFloat(String(lead.deposit_amount)) || 0
        bySource[source].totalDeposits += deposit
        totalDeposits += deposit
      }

      // Por región
      const region = lead.region || "OTROS"
      if (!byRegion[region]) {
        byRegion[region] = { region, count: 0, won: 0, conversionRate: 0, totalQuoted: 0 }
      }
      byRegion[region].count++
      if (lead.status === "WON") byRegion[region].won++
      if (lead.quoted_price) {
        byRegion[region].totalQuoted += parseFloat(String(lead.quoted_price)) || 0
      }

      // Por destino
      const destination = lead.destination || "Sin destino"
      if (!byDestination[destination]) {
        byDestination[destination] = { destination, count: 0, won: 0, conversionRate: 0 }
      }
      byDestination[destination].count++
      if (lead.status === "WON") byDestination[destination].won++

      // Por vendedor
      if (lead.assigned_seller_id) {
        const sellerName = sellerNamesMap.get(lead.assigned_seller_id) || "Sin nombre"
        if (!bySeller[lead.assigned_seller_id]) {
          bySeller[lead.assigned_seller_id] = {
            id: lead.assigned_seller_id,
            name: sellerName,
            leads: 0,
            won: 0,
            conversionRate: 0,
            totalQuoted: 0,
          }
        }
        bySeller[lead.assigned_seller_id].leads++
        if (lead.status === "WON") bySeller[lead.assigned_seller_id].won++
        if (lead.quoted_price) {
          bySeller[lead.assigned_seller_id].totalQuoted += parseFloat(String(lead.quoted_price)) || 0
        }
      }

      // Por mes
      if (lead.created_at) {
        const monthKey = format(new Date(lead.created_at), "yyyy-MM")
        if (monthlyStats[monthKey]) {
          monthlyStats[monthKey].newLeads++
          if (lead.status === "WON") monthlyStats[monthKey].wonLeads++
          if (lead.status === "LOST") monthlyStats[monthKey].lostLeads++
          if (lead.status === "QUOTED") {
            monthlyStats[monthKey].quotedLeads++
            if (lead.quoted_price) {
              monthlyStats[monthKey].totalQuoted += parseFloat(String(lead.quoted_price)) || 0
            }
          }
          if (lead.has_deposit && lead.deposit_amount) {
            monthlyStats[monthKey].totalDeposits += parseFloat(String(lead.deposit_amount)) || 0
          }
        }
      }

      // Estadísticas de presupuesto
      if (lead.budget_min || lead.budget_max) {
        const budgetMin = lead.budget_min ? parseFloat(String(lead.budget_min)) : 0
        const budgetMax = lead.budget_max ? parseFloat(String(lead.budget_max)) : 0
        const budgetAvg = budgetMax > 0 ? (budgetMin + budgetMax) / 2 : budgetMin
        if (budgetAvg > 0) {
          totalBudget += budgetAvg
          totalBudgetCount++
        }
      }

      // Estadísticas de pasajeros
      totalAdults += lead.adults ? parseInt(String(lead.adults)) : 0
      totalChildren += lead.children ? parseInt(String(lead.children)) : 0
      totalInfants += lead.infants ? parseInt(String(lead.infants)) : 0
    }

    // Calcular tasas de conversión
    Object.values(bySource).forEach(s => {
      s.conversionRate = s.count > 0 ? Math.round((s.won / s.count) * 100 * 10) / 10 : 0
    })

    Object.values(byRegion).forEach(r => {
      r.conversionRate = r.count > 0 ? Math.round((r.won / r.count) * 100 * 10) / 10 : 0
    })

    Object.values(byDestination).forEach(d => {
      d.conversionRate = d.count > 0 ? Math.round((d.won / d.count) * 100 * 10) / 10 : 0
    })

    Object.values(bySeller).forEach(s => {
      s.conversionRate = s.leads > 0 ? Math.round((s.won / s.leads) * 100 * 10) / 10 : 0
    })

    // Conversion rate general
    const overallConversionRate = totalLeads > 0 ? Math.round((totalWon / totalLeads) * 100 * 10) / 10 : 0

    // Top vendedores por conversión
    const topSellers = Object.values(bySeller)
      .filter(s => s.leads >= 5) // Mínimo 5 leads para ser considerado
      .sort((a, b) => b.conversionRate - a.conversionRate)
      .slice(0, 10)

    // Top orígenes
    const topSources = Object.values(bySource)
      .filter(s => s.count > 0)
      .sort((a, b) => b.count - a.count)

    // Top regiones
    const topRegions = Object.values(byRegion)
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)

    // Top destinos
    const topDestinations = Object.values(byDestination)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // Leads activos (no ganados ni perdidos)
    const activeLeads = totalLeads - totalWon - totalLost

    // Leads este mes
    const thisMonth = format(now, "yyyy-MM")
    const newThisMonth = monthlyStats[thisMonth]?.newLeads || 0

    // Promedio de presupuesto
    const avgBudget = totalBudgetCount > 0 ? Math.round(totalBudget / totalBudgetCount) : 0

    // Promedio de pasajeros por lead
    const avgAdults = totalLeads > 0 ? Math.round((totalAdults / totalLeads) * 10) / 10 : 0
    const avgChildren = totalLeads > 0 ? Math.round((totalChildren / totalLeads) * 10) / 10 : 0
    const avgInfants = totalLeads > 0 ? Math.round((totalInfants / totalLeads) * 10) / 10 : 0

    // Distribución por presupuesto
    const budgetRanges = [
      { range: "$0 - $500k", min: 0, max: 500000, count: 0 },
      { range: "$500k - $1M", min: 500000, max: 1000000, count: 0 },
      { range: "$1M - $2M", min: 1000000, max: 2000000, count: 0 },
      { range: "$2M - $5M", min: 2000000, max: 5000000, count: 0 },
      { range: "+$5M", min: 5000000, max: Infinity, count: 0 },
    ]

    for (const lead of leads || []) {
      if (lead.budget_min || lead.budget_max) {
        const budgetMin = lead.budget_min ? parseFloat(String(lead.budget_min)) : 0
        const budgetMax = lead.budget_max ? parseFloat(String(lead.budget_max)) : 0
        const budgetAvg = budgetMax > 0 ? (budgetMin + budgetMax) / 2 : budgetMin
        if (budgetAvg > 0) {
          const range = budgetRanges.find(r => budgetAvg >= r.min && budgetAvg < r.max)
          if (range) range.count++
        }
      }
    }

    return NextResponse.json({
      overview: {
        totalLeads,
        activeLeads,
        wonLeads: totalWon,
        lostLeads: totalLost,
        conversionRate: overallConversionRate,
        totalQuoted,
        totalDeposits,
        newThisMonth,
        avgBudget,
        avgAdults,
        avgChildren,
        avgInfants,
        totalPassengers: totalAdults + totalChildren + totalInfants,
      },
      pipeline: Object.values(pipeline),
      distributions: {
        bySource: topSources,
        byRegion: topRegions,
        byDestination: topDestinations,
        bySeller: topSellers,
        byBudget: budgetRanges.filter(r => r.count > 0),
      },
      trends: {
        monthly: Object.values(monthlyStats),
      },
      rankings: {
        topSellers,
        topSources,
        topDestinations,
      },
    })
  } catch (error: any) {
    console.error("Error in GET /api/leads/statistics:", error)
    console.error("Error stack:", error.stack)
    return NextResponse.json(
      { 
        error: error.message || "Error al obtener estadísticas",
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}
