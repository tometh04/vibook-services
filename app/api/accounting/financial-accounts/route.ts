import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/auth"
import { getUserAgencyIds } from "@/lib/permissions-api"
import { getAccountBalance, isAccountingOnlyAccount, getAccountBalancesBatch, filterAccountingOnlyAccountsBatch } from "@/lib/accounting/ledger"
import { canPerformAction } from "@/lib/permissions-api"

export async function GET(request: Request) {
  try {
    const { user } = await getCurrentUser()
    const supabase = await createServerClient()
    const { searchParams } = new URL(request.url)
    const excludeAccountingOnly = searchParams.get("excludeAccountingOnly") === "true"
    const agencyId = searchParams.get("agencyId")

    const agencyIds = await getUserAgencyIds(supabase, user.id, user.role as any)

    if (user.role !== "SUPER_ADMIN" && agencyIds.length === 0) {
      return NextResponse.json({ accounts: [] })
    }

    // Get all financial accounts with agency info
    let accountsQuery = (supabase.from("financial_accounts") as any)
      .select(`
        *,
        agencies:agency_id(id, name)
      `)
      .order("agency_id", { ascending: true })
      .order("type", { ascending: true })
      .order("currency", { ascending: true })

    if (user.role !== "SUPER_ADMIN") {
      accountsQuery = accountsQuery.in("agency_id", agencyIds)
    }

    if (agencyId && agencyId !== "ALL") {
      if (user.role !== "SUPER_ADMIN" && !agencyIds.includes(agencyId)) {
        return NextResponse.json({ error: "No tiene acceso a esta agencia" }, { status: 403 })
      }
      accountsQuery = accountsQuery.eq("agency_id", agencyId)
    }

    const { data: accounts, error: accountsError } = await accountsQuery

    if (accountsError) {
      console.error("Error fetching financial accounts:", accountsError)
      return NextResponse.json({ error: "Error al obtener cuentas financieras" }, { status: 500 })
    }

    // OPTIMIZACIÓN: Filtrar cuentas contables en batch si se solicita
    let filteredAccounts = accounts || []
    if (excludeAccountingOnly && filteredAccounts.length > 0) {
      const accountIds = filteredAccounts.map((acc: any) => acc.id)
      const accountingOnlyAccountIds = await filterAccountingOnlyAccountsBatch(accountIds, supabase)
      filteredAccounts = filteredAccounts.filter((acc: any) => !accountingOnlyAccountIds.has(acc.id))
    }

    // OPTIMIZACIÓN: Calcular balances en batch (2 queries en lugar de N*2)
    const accountIds = filteredAccounts.map((acc: any) => acc.id)
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
    const accountsWithBalance = filteredAccounts.map((account: any) => {
      const balance = balancesMap.get(account.id) ?? account.initial_balance ?? 0
      return {
        ...account,
        agency_id: account.agency_id, // Asegurar que agency_id esté presente
        current_balance: balance,
      }
    })

    return NextResponse.json({ accounts: accountsWithBalance })
  } catch (error) {
    console.error("Error in GET /api/accounting/financial-accounts:", error)
    return NextResponse.json({ error: "Error al obtener cuentas financieras" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { user } = await getCurrentUser()
    const supabase = await createServerClient()

    // Verificar permisos
    if (!canPerformAction(user, "accounting", "write")) {
      return NextResponse.json({ error: "No tiene permiso para crear cuentas" }, { status: 403 })
    }

    const body = await request.json()
    const {
      name,
      type,
      currency,
      agency_id,
      initial_balance,
      account_number,
      bank_name,
      card_number,
      card_holder,
      card_expiry_date,
      asset_type,
      asset_description,
      asset_quantity,
      notes,
      is_active,
      chart_account_id, // OBLIGATORIO según especificaciones
    } = body

    const agencyIds = await getUserAgencyIds(supabase, user.id, user.role as any)

    let resolvedAgencyId = agency_id
    if (!resolvedAgencyId) {
      if (user.role === "SUPER_ADMIN") {
        return NextResponse.json({ error: "agency_id es requerido" }, { status: 400 })
      }
      if (agencyIds.length === 1) {
        resolvedAgencyId = agencyIds[0]
      } else {
        return NextResponse.json({ error: "Debe seleccionar una agencia" }, { status: 400 })
      }
    }

    if (user.role !== "SUPER_ADMIN" && !agencyIds.includes(resolvedAgencyId)) {
      return NextResponse.json({ error: "No tiene permiso para esta agencia" }, { status: 403 })
    }

    // Validar campos requeridos
    if (!name || !type || !currency || !resolvedAgencyId) {
      return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 })
    }

    // Si no se proporciona chart_account_id, asignarlo automáticamente según tipo
    let finalChartAccountId = chart_account_id
    
    if (!finalChartAccountId) {
      // Mapeo automático de tipo de cuenta a código del plan de cuentas
      const typeToAccountCodeMap: Record<string, string> = {
        "CASH_ARS": "1.1.01",      // Caja ARS
        "CASH_USD": "1.1.01",      // Caja USD
        "CHECKING_ARS": "1.1.02",  // Bancos ARS
        "CHECKING_USD": "1.1.02",  // Bancos USD
        "SAVINGS_ARS": "1.1.02",   // Bancos ARS (caja de ahorro)
        "SAVINGS_USD": "1.1.02",   // Bancos USD (caja de ahorro)
        "CREDIT_CARD": "1.1.04",    // Mercado Pago
        "ASSETS": "1.1.05",        // Activos
      }

      const accountCode = typeToAccountCodeMap[type]
      
      if (accountCode) {
        // Buscar el chart_account_id por código
        const { data: chartAccount, error: chartError } = await (supabase.from("chart_of_accounts") as any)
          .select("id, account_code, account_name, is_active")
          .eq("account_code", accountCode)
          .eq("is_active", true)
          .maybeSingle()

        if (!chartError && chartAccount) {
          finalChartAccountId = chartAccount.id
          console.log(`✅ Asignado automáticamente chart_account_id ${accountCode} (${chartAccount.account_name}) para tipo ${type}`)
        } else {
          return NextResponse.json(
            { 
              error: `No se encontró una cuenta del plan de cuentas con código ${accountCode} para el tipo ${type}. Por favor, especifique chart_account_id manualmente.` 
            },
            { status: 400 }
          )
        }
      } else {
        return NextResponse.json(
          { 
            error: `No se puede asignar automáticamente chart_account_id para el tipo ${type}. Por favor, especifique chart_account_id manualmente.` 
          },
          { status: 400 }
        )
      }
    }

    // Verificar que el chart_account_id existe y está activo
    const { data: chartAccount, error: chartError } = await (supabase.from("chart_of_accounts") as any)
      .select("id, account_code, account_name, category, is_active")
      .eq("id", finalChartAccountId)
      .single()

    if (chartError || !chartAccount) {
      return NextResponse.json(
        { error: "El plan de cuentas especificado no existe" },
        { status: 400 }
      )
    }

    if (!chartAccount.is_active) {
      return NextResponse.json(
        { error: "El plan de cuentas especificado está inactivo" },
        { status: 400 }
      )
    }

    // Validar tipo
    const validTypes = [
      "SAVINGS_ARS",
      "SAVINGS_USD",
      "CHECKING_ARS",
      "CHECKING_USD",
      "CASH_ARS",
      "CASH_USD",
      "CREDIT_CARD",
      "ASSETS",
    ]
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: "Tipo de cuenta inválido" }, { status: 400 })
    }

    // Preparar datos para inserción
    const accountData: any = {
      name,
      type,
      currency,
      agency_id: resolvedAgencyId,
      initial_balance: Number(initial_balance) || 0,
      chart_account_id: finalChartAccountId, // Asignado automáticamente o proporcionado
      notes: notes || null,
      is_active: is_active !== undefined ? is_active : true,
      created_by: user.id,
    }

    // Campos opcionales según tipo
    if (account_number) accountData.account_number = account_number
    if (bank_name) accountData.bank_name = bank_name
    if (card_number) accountData.card_number = card_number.slice(-4) // Solo últimos 4 dígitos
    if (card_holder) accountData.card_holder = card_holder
    if (card_expiry_date) accountData.card_expiry_date = card_expiry_date
    if (asset_type) accountData.asset_type = asset_type
    if (asset_description) accountData.asset_description = asset_description
    if (asset_quantity !== undefined) accountData.asset_quantity = Number(asset_quantity) || 0

    const { data: account, error: insertError } = await (supabase.from("financial_accounts") as any)
      .insert(accountData)
      .select()
      .single()

    if (insertError) {
      console.error("Error creating financial account:", insertError)
      return NextResponse.json({ error: "Error al crear cuenta: " + insertError.message }, { status: 500 })
    }

    return NextResponse.json({ account }, { status: 201 })
  } catch (error: any) {
    console.error("Error in POST /api/accounting/financial-accounts:", error)
    return NextResponse.json({ error: "Error al crear cuenta" }, { status: 500 })
  }
}
