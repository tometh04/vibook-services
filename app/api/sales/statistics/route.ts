import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { subMonths, format } from "date-fns"
import { es } from "date-fns/locale"

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const supabase = await createServerClient()
  
  // Autenticación
  const { data: { user: authUser } } = await supabase.auth.getUser()
  
  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  }

  // Usuario de DB
  const { data: user } = await supabase
    .from('users')
    .select('id, role')
    .eq('auth_id', authUser.id)
    .single()

  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const months = parseInt(searchParams.get("months") || "12")

  // Obtener agencias
  let agencyIds: string[] = []
  
  if (user.role === "SUPER_ADMIN") {
    const { data: agencies } = await supabase.from("agencies").select("id")
    agencyIds = (agencies || []).map((a: any) => a.id)
  } else {
    const { data: userAgencies } = await supabase
      .from("user_agencies")
      .select("agency_id")
      .eq("user_id", user.id)
    agencyIds = (userAgencies || []).map((ua: any) => ua.agency_id).filter(Boolean)
  }

  // Query de leads
  let leadsQuery = supabase.from("leads").select("id, status, source, region, created_at, assigned_seller_id, deposit_amount")

  if (user.role !== "SUPER_ADMIN" && agencyIds.length > 0) {
    leadsQuery = leadsQuery.in("agency_id", agencyIds)
  }

  const { data: leads, error: leadsError } = await leadsQuery

  if (leadsError) {
    return NextResponse.json({ error: "Error al obtener leads: " + leadsError.message }, { status: 500 })
  }

  const now = new Date()

  // Inicializar estructuras
  const pipeline: Record<string, { status: string, label: string, count: number, value: number }> = {
    NEW: { status: "NEW", label: "Nuevo", count: 0, value: 0 },
    IN_PROGRESS: { status: "IN_PROGRESS", label: "En Progreso", count: 0, value: 0 },
    QUOTED: { status: "QUOTED", label: "Cotizado", count: 0, value: 0 },
    WON: { status: "WON", label: "Ganado", count: 0, value: 0 },
    LOST: { status: "LOST", label: "Perdido", count: 0, value: 0 },
  }

  const bySource: Record<string, { source: string, count: number, won: number, conversionRate: number }> = {}
  const byRegion: Record<string, { region: string, count: number, won: number }> = {}

  const monthlyStats: Record<string, { month: string, monthName: string, newLeads: number, wonLeads: number, lostLeads: number }> = {}

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
    }
  }

  // Procesar leads
  let totalLeads = 0, totalWon = 0, totalLost = 0, totalDeposits = 0

  for (const lead of leads || []) {
    totalLeads++

    if (pipeline[lead.status]) {
      pipeline[lead.status].count++
      if (lead.deposit_amount) {
        const amount = parseFloat(lead.deposit_amount) || 0
        pipeline[lead.status].value += amount
        totalDeposits += amount
      }
    }

    if (lead.status === "WON") totalWon++
    if (lead.status === "LOST") totalLost++

    // Por origen
    const source = lead.source || "Otro"
    if (!bySource[source]) {
      bySource[source] = { source, count: 0, won: 0, conversionRate: 0 }
    }
    bySource[source].count++
    if (lead.status === "WON") bySource[source].won++

    // Por región
    const region = lead.region || "OTROS"
    if (!byRegion[region]) {
      byRegion[region] = { region, count: 0, won: 0 }
    }
    byRegion[region].count++
    if (lead.status === "WON") byRegion[region].won++

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

  // Calcular conversiones
  Object.values(bySource).forEach(s => {
    s.conversionRate = s.count > 0 ? (s.won / s.count) * 100 : 0
  })

  const conversionRate = totalLeads > 0 ? (totalWon / totalLeads) * 100 : 0
  const thisMonth = format(now, "yyyy-MM")

  return NextResponse.json({
    overview: {
      totalLeads,
      activeLeads: totalLeads - totalWon - totalLost,
      wonLeads: totalWon,
      lostLeads: totalLost,
      conversionRate: Math.round(conversionRate * 10) / 10,
      totalDeposits,
      newThisMonth: monthlyStats[thisMonth]?.newLeads || 0,
    },
    pipeline: Object.values(pipeline),
    distributions: {
      bySource: Object.values(bySource).filter(s => s.count > 0).sort((a, b) => b.count - a.count),
      byRegion: Object.values(byRegion).sort((a, b) => b.count - a.count).slice(0, 6),
      bySeller: [],
    },
    trends: {
      monthly: Object.values(monthlyStats),
    },
    rankings: {
      topSellers: [],
      topSources: Object.values(bySource).filter(s => s.count > 0).sort((a, b) => b.conversionRate - a.conversionRate),
    },
  })
}
