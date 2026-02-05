import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/auth"
import { getUserAgencyIds } from "@/lib/permissions-api"
import { getExchangeRate, getLatestExchangeRate } from "@/lib/accounting/exchange-rates"

export async function GET(request: Request) {
  try {
    const { user } = await getCurrentUser()
    const supabase = await createServerClient()
    
    const { searchParams } = new URL(request.url)
    const dateFrom = searchParams.get("dateFrom")
    const dateTo = searchParams.get("dateTo")

    if (!dateFrom || !dateTo) {
      return NextResponse.json({ error: "Faltan parámetros dateFrom y dateTo" }, { status: 400 })
    }

    const agencyIds = await getUserAgencyIds(supabase, user.id, user.role as any)

    if (user.role !== "SUPER_ADMIN" && agencyIds.length === 0) {
      return NextResponse.json({ dailyBalances: [] })
    }

    // OPTIMIZACIÓN: Obtener todas las cuentas y movimientos en 2 queries en lugar de N*D queries
    // (N = número de cuentas, D = número de días)
    
    // Query 1: Obtener todas las cuentas financieras
    let accountsQuery = (supabase.from("financial_accounts") as any)
      .select("*")
      .in("type", ["CASH_ARS", "CASH_USD", "SAVINGS_ARS", "SAVINGS_USD", "CHECKING_ARS", "CHECKING_USD"])

    if (user.role !== "SUPER_ADMIN") {
      accountsQuery = accountsQuery.in("agency_id", agencyIds)
    }

    const { data: accounts } = await accountsQuery

    if (!accounts || accounts.length === 0) {
      return NextResponse.json({ dailyBalances: [] })
    }

    const accountIds = accounts.map((acc: any) => acc.id)
    
    // Query 2: Obtener TODOS los movimientos de todas las cuentas hasta la fecha final
    const { data: allMovements } = await (supabase.from("ledger_movements") as any)
      .select("account_id, amount_ars_equivalent, type, created_at")
      .in("account_id", accountIds)
      .lte("created_at", `${dateTo}T23:59:59`)

    // Tipo de cambio de referencia para convertir ARS -> USD (base del sistema)
    let fxRate = await getExchangeRate(supabase, new Date(dateFrom))
    if (!fxRate) {
      fxRate = await getLatestExchangeRate(supabase)
    }
    if (!fxRate || fxRate <= 0) {
      console.warn(`[DailyBalance] No se encontró tipo de cambio válido. Usando fallback 1000.`)
      fxRate = 1000
    }

    // Crear mapa de cuenta -> balance inicial (en USD base)
    const accountsMap = new Map<string, { initialBalance: number }>()
    for (const account of accounts) {
      const initialBalance = parseFloat(account.initial_balance || "0")
      const initialBalanceUsd = account.currency === "ARS" ? initialBalance / fxRate : initialBalance
      accountsMap.set(account.id, {
        initialBalance: initialBalanceUsd,
      })
    }

    // Agrupar movimientos por cuenta y fecha
    // Estructura: Map<accountId, Map<dateStr, movements[]>>
    const movementsByAccountAndDate = new Map<string, Map<string, any[]>>()
    
    for (const movement of allMovements || []) {
      const accountId = movement.account_id
      const movementDate = new Date(movement.created_at).toISOString().split("T")[0]
      
      if (!movementsByAccountAndDate.has(accountId)) {
        movementsByAccountAndDate.set(accountId, new Map())
      }
      
      const accountMovements = movementsByAccountAndDate.get(accountId)!
      if (!accountMovements.has(movementDate)) {
        accountMovements.set(movementDate, [])
      }
      
      accountMovements.get(movementDate)!.push(movement)
    }

    // Calcular balance diario
    const startDate = new Date(dateFrom)
    const endDate = new Date(dateTo)
    const dailyBalances: Array<{ date: string; balance: number }> = []

    // Generar todas las fechas del rango
    const allDates: string[] = []
    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
      allDates.push(date.toISOString().split("T")[0])
    }

    // Calcular balance acumulado por cuenta hasta cada fecha
    const accountBalancesByDate = new Map<string, Map<string, number>>() // Map<accountId, Map<dateStr, balance>>

    for (const accountId of accountIds) {
      const accountInfo = accountsMap.get(accountId)!
      let runningBalance = accountInfo.initialBalance
      const balancesForAccount = new Map<string, number>()
      
      const accountMovementsByDate = movementsByAccountAndDate.get(accountId) || new Map()
      
      for (const dateStr of allDates) {
        // Agregar movimientos de este día
        const dayMovements = accountMovementsByDate.get(dateStr) || []
        for (const movement of dayMovements) {
          const amount = parseFloat(movement.amount_ars_equivalent || "0")
          if (movement.type === "INCOME" || movement.type === "FX_GAIN") {
            runningBalance += amount
          } else if (movement.type === "EXPENSE" || movement.type === "FX_LOSS" || movement.type === "OPERATOR_PAYMENT") {
            runningBalance -= amount
          }
        }
        
        balancesForAccount.set(dateStr, runningBalance)
      }
      
      accountBalancesByDate.set(accountId, balancesForAccount)
    }

    // Calcular total por día sumando todas las cuentas
    for (const dateStr of allDates) {
      let totalBalance = 0
      
      for (const accountId of accountIds) {
        const accountBalances = accountBalancesByDate.get(accountId)
        const balance = accountBalances?.get(dateStr) || 0
        totalBalance += balance
      }
      
      dailyBalances.push({
        date: dateStr,
        balance: totalBalance,
      })
    }

    return NextResponse.json({ dailyBalances })
  } catch (error) {
    console.error("Error in GET /api/cash/daily-balance:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
