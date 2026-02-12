import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/auth"
import { getAccountBalancesBatch } from "@/lib/accounting/ledger"

export const runtime = 'nodejs'

export async function GET() {
  try {
    const { user } = await getCurrentUser()
    const supabase = await createServerClient()

    // 1. Get financial_accounts
    const { data: accounts, error: accountsError } = await (supabase.from("financial_accounts") as any)
      .select("id, name, type, currency, initial_balance, chart_account_id")
      .order("name")

    const accountIds = (accounts || []).map((a: any) => a.id)

    // 2. Simular EXACTAMENTE lo que hace getAccountBalancesBatch - Query 2
    const { data: movementsViaIn, error: movementsViaInError } = await (supabase
      .from("ledger_movements") as any)
      .select("account_id, type, amount_original, currency, exchange_rate")
      .in("account_id", accountIds)

    // 3. Query SIN filtro .in() - solo select all
    const { data: allMovements, error: allMovementsError } = await (supabase
      .from("ledger_movements") as any)
      .select("id, account_id, type, amount_original, currency")

    // 4. Query con .eq() por cada account
    const eqResults: any[] = []
    for (const accId of accountIds) {
      const { data: eqMov, error: eqErr } = await (supabase
        .from("ledger_movements") as any)
        .select("id, account_id, type, amount_original")
        .eq("account_id", accId)
      eqResults.push({
        accountId: accId,
        found: eqMov?.length || 0,
        error: eqErr?.message || null,
        movements: eqMov?.map((m: any) => ({ id: m.id?.slice(0,8), type: m.type, amount: m.amount_original }))
      })
    }

    // 5. Llamar a getAccountBalancesBatch directamente
    let batchResult: any = null
    let batchError: string | null = null
    try {
      const balancesMap = await getAccountBalancesBatch(accountIds, supabase)
      batchResult = Object.fromEntries(balancesMap)
    } catch (e: any) {
      batchError = e.message
    }

    // 6. Query con chart_of_accounts JOIN (como hace getAccountBalancesBatch Query 1)
    const { data: accountsWithChart, error: chartError } = await (supabase
      .from("financial_accounts") as any)
      .select(`
        id,
        initial_balance,
        currency,
        chart_account_id,
        chart_of_accounts:chart_account_id(
          category
        )
      `)
      .in("id", accountIds)

    return NextResponse.json({
      test_1_accounts: {
        count: accounts?.length || 0,
        ids: accountIds,
        error: accountsError?.message,
      },
      test_2_movements_via_in: {
        count: movementsViaIn?.length || 0,
        error: movementsViaInError?.message,
        data: movementsViaIn?.map((m: any) => ({
          aid: m.account_id?.slice(0,8),
          type: m.type,
          amount: m.amount_original
        })),
      },
      test_3_all_movements: {
        count: allMovements?.length || 0,
        error: allMovementsError?.message,
        by_account: allMovements?.reduce((acc: any, m: any) => {
          const key = m.account_id?.slice(0,8) || 'NULL'
          acc[key] = (acc[key] || 0) + 1
          return acc
        }, {}),
      },
      test_4_eq_per_account: eqResults,
      test_5_batch_function: {
        result: batchResult,
        error: batchError,
      },
      test_6_accounts_with_chart: {
        data: accountsWithChart?.map((a: any) => ({
          id: a.id?.slice(0,8),
          initial_balance: a.initial_balance,
          currency: a.currency,
          category: a.chart_of_accounts?.category,
        })),
        error: chartError?.message,
      }
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
