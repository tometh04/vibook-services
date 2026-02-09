import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/auth"
import { getAccountBalance, getAccountBalancesBatch } from "@/lib/accounting/ledger"
import { getExchangeRatesBatch, getLatestExchangeRate } from "@/lib/accounting/exchange-rates"
import { verifyFeatureAccess } from "@/lib/billing/subscription-middleware"

export async function GET(request: Request) {
  try {
    const { user } = await getCurrentUser()

    const featureAccess = await verifyFeatureAccess(user.id, user.role, "reports")
    if (!featureAccess.hasAccess) {
      return NextResponse.json(
        { error: featureAccess.message || "No tiene acceso a Reportes" },
        { status: 403 }
      )
    }
    
    // Solo SUPER_ADMIN, ADMIN y CONTABLE pueden ver flujo de caja
    if (!["SUPER_ADMIN", "ADMIN", "CONTABLE"].includes(user.role)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }

    const supabase = await createServerClient()
    const { searchParams } = new URL(request.url)

    const dateFrom = searchParams.get("dateFrom")
    const dateTo = searchParams.get("dateTo")
    const currency = searchParams.get("currency") || "ALL"
    const agencyId = searchParams.get("agencyId") || "ALL"

    // Obtener movimientos de caja con información de operaciones para filtrar por agencia
    let query = (supabase
      .from("cash_movements") as any)
      .select(`
        *,
        operations:operation_id(agency_id)
      `)
      .order("movement_date", { ascending: true })

    if (dateFrom) {
      query = query.gte("movement_date", dateFrom)
    }
    if (dateTo) {
      query = query.lte("movement_date", dateTo + "T23:59:59")
    }
    if (currency !== "ALL") {
      query = query.eq("currency", currency)
    }

    const { data: movementsRaw, error } = await query as { data: any[] | null, error: any }

    // Filtrar por agencia si es necesario
    let movements = movementsRaw
    if (agencyId !== "ALL" && movements) {
      movements = movements.filter((mov: any) => {
        // Si tiene operation_id, verificar la agencia de la operación
        if (mov.operation_id && mov.operations) {
          return mov.operations.agency_id === agencyId
        }
        // Si no tiene operación, no podemos filtrar (se incluye)
        return true
      })
    }

    if (error) {
      console.error("Error fetching cash flow:", error)
      return NextResponse.json({ error: "Error al obtener flujo de caja" }, { status: 500 })
    }

    const movementsArray = movements || []
    const latestExchangeRate = await getLatestExchangeRate(supabase) || 1000
    const arsMovements = movementsArray.filter((mov: any) => (mov.currency || "ARS") === "ARS")
    const rateDates = arsMovements.map((mov: any) => mov.movement_date || mov.created_at || new Date())
    const exchangeRatesMap = await getExchangeRatesBatch(supabase, rateDates)

    const getRateForMovement = (mov: any) => {
      const dateValue = mov.movement_date || mov.created_at || new Date()
      const dateStr = typeof dateValue === "string"
        ? dateValue.split("T")[0]
        : dateValue.toISOString().split("T")[0]
      const rate = exchangeRatesMap.get(dateStr) || 0
      return rate > 0 ? rate : latestExchangeRate
    }

    const toUsd = (amount: number, currency: string, mov: any) => {
      if (currency === "ARS") {
        const rate = getRateForMovement(mov)
        return rate ? amount / rate : 0
      }
      return amount
    }

    // Calcular totales (USD)
    const totals = {
      income_usd: 0,
      expense_usd: 0,
      net_usd: 0,
    }

    // Agrupar por categoría
    const byCategory: Record<string, any> = {}

    // Agrupar por día
    const byDay: Record<string, any> = {}

    for (const mov of movementsArray) {
      const amount = Number(mov.amount) || 0
      const isIncome = mov.type === "INCOME"
      const curr = mov.currency || "ARS"
      const amountUsd = toUsd(amount, curr, mov)

      // Totales
      if (isIncome) {
        totals.income_usd += amountUsd
      } else {
        totals.expense_usd += amountUsd
      }

      // Por categoría
      const cat = mov.category || "OTRO"
      if (!byCategory[cat]) {
        byCategory[cat] = {
          category: cat,
          income_usd: 0,
          expense_usd: 0,
        }
      }
      if (isIncome) {
        byCategory[cat].income_usd += amountUsd
      } else {
        byCategory[cat].expense_usd += amountUsd
      }

      // Por día
      const day = mov.movement_date?.split("T")[0] || "unknown"
      if (!byDay[day]) {
        byDay[day] = {
          date: day,
          income_usd: 0,
          expense_usd: 0,
        }
      }
      if (isIncome) {
        byDay[day].income_usd += amountUsd
      } else {
        byDay[day].expense_usd += amountUsd
      }
    }

    totals.net_usd = totals.income_usd - totals.expense_usd

    // Convertir a arrays ordenados
    const categoryData = Object.values(byCategory).sort((a: any, b: any) => 
      (b.income_usd - b.expense_usd) - (a.income_usd - a.expense_usd)
    )

    const dailyData = Object.values(byDay).sort((a: any, b: any) => 
      a.date.localeCompare(b.date)
    )

    // Calcular balance acumulado
    let balanceUsd = 0
    const dailyWithBalance = dailyData.map((d: any) => {
      balanceUsd += d.income_usd - d.expense_usd
      return {
        ...d,
        balance_usd: balanceUsd,
      }
    })

    // Obtener balances actuales de todas las cuentas financieras
    let accountsQuery = (supabase.from("financial_accounts") as any)
      .select(`
        id,
        name,
        type,
        currency,
        initial_balance,
        agency_id,
        agencies:agency_id(id, name)
      `)
      .eq("is_active", true)

    // Filtrar por agencia si es necesario
    if (agencyId !== "ALL") {
      accountsQuery = accountsQuery.eq("agency_id", agencyId)
    }

    // Filtrar por moneda si es necesario (solo para cuentas, no para movimientos que ya están filtrados)
    const { data: accounts } = await accountsQuery
      .order("agency_id", { ascending: true })
      .order("type", { ascending: true })

    // OPTIMIZACIÓN: Calcular balances en batch (2 queries en lugar de N*2)
    const accountIds = (accounts || []).map((acc: any) => acc.id)
    let balancesMap = new Map<string, number>()
    
    if (accountIds.length > 0) {
      try {
        balancesMap = await getAccountBalancesBatch(accountIds, supabase)
      } catch (error) {
        console.error("Error calculating balances in batch:", error)
        // Fallback: calcular balances individualmente si falla el batch
        for (const accountId of accountIds) {
          try {
            const balance = await getAccountBalance(accountId, supabase)
            balancesMap.set(accountId, balance)
          } catch (err) {
            console.error(`Error calculating balance for account ${accountId}:`, err)
            balancesMap.set(accountId, 0)
          }
        }
      }
    }

    // Mapear cuentas con sus balances
    const accountsWithBalance = (accounts || []).map((account: any) => {
      const balance = balancesMap.get(account.id) ?? account.initial_balance ?? 0
      const currency = account.currency || "ARS"
      const balanceUsd = currency === "ARS" ? (latestExchangeRate ? balance / latestExchangeRate : 0) : balance
      return {
        ...account,
        current_balance: balance,
        current_balance_usd: balanceUsd,
      }
    })

    // Calcular totales en USD por agencia
    const balanceSummary: any = {
      total_usd: 0,
      by_agency: {} as Record<string, { usd: number; accounts: any[]; agency_name?: string }>,
    }

    for (const account of accountsWithBalance) {
      const agencyId = account.agency_id || "sin-agencia"
      const agencyName = account.agencies?.name || "Sin agencia"
      
      if (!balanceSummary.by_agency[agencyId]) {
        balanceSummary.by_agency[agencyId] = {
          usd: 0,
          accounts: [],
          agency_name: agencyName,
        }
      }

      balanceSummary.total_usd += account.current_balance_usd || 0
      balanceSummary.by_agency[agencyId].usd += account.current_balance_usd || 0

      balanceSummary.by_agency[agencyId].accounts.push(account)
    }

    return NextResponse.json({
      totals,
      byCategory: categoryData,
      byDay: dailyWithBalance,
      movementsCount: movements?.length || 0,
      accountBalances: {
        summary: balanceSummary,
        accounts: accountsWithBalance,
      },
    })
  } catch (error) {
    console.error("Error in GET /api/reports/cash-flow:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
