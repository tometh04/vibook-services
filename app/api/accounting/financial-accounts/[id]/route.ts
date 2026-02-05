import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/auth"
import { getUserAgencyIds } from "@/lib/permissions-api"
import { getAccountBalance, createLedgerMovement, calculateARSEquivalent } from "@/lib/accounting/ledger"
import { getExchangeRate, getLatestExchangeRate } from "@/lib/accounting/exchange-rates"
import { canPerformAction } from "@/lib/permissions-api"

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await getCurrentUser()
    const supabase = await createServerClient()

    // Verificar permisos
    if (!canPerformAction(user, "accounting", "write")) {
      return NextResponse.json({ error: "No tiene permiso para eliminar cuentas" }, { status: 403 })
    }

    const { id: accountId } = await params
    const { searchParams } = new URL(request.url)
    const transferToAccountId = searchParams.get("transferTo")
    const confirmDeleteAll = searchParams.get("confirmDeleteAll") === "true" // Confirmación para eliminar todo

    // Obtener la cuenta a eliminar
    const { data: account, error: accountError } = await (supabase.from("financial_accounts") as any)
      .select("*")
      .eq("id", accountId)
      .single()

    if (accountError || !account) {
      return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 })
    }

    const agencyIds = await getUserAgencyIds(supabase, user.id, user.role as any)
    if (user.role !== "SUPER_ADMIN" && (!account.agency_id || !agencyIds.includes(account.agency_id))) {
      return NextResponse.json({ error: "No tiene acceso a esta cuenta" }, { status: 403 })
    }

    // Calcular el balance actual
    let currentBalance: number
    try {
      currentBalance = await getAccountBalance(accountId, supabase)
    } catch (error) {
      console.error(`Error calculando balance de cuenta ${accountId}:`, error)
      currentBalance = parseFloat(account.initial_balance || "0")
    }

    // Verificar cuántas cuentas financieras activas quedan
    let activeAccountsQuery = (supabase.from("financial_accounts") as any)
      .select("id")
      .eq("is_active", true)

    if (user.role !== "SUPER_ADMIN") {
      activeAccountsQuery = activeAccountsQuery.in("agency_id", agencyIds)
    }

    const { data: allActiveAccounts, error: accountsCountError } = await activeAccountsQuery
    
    const activeAccountsCount = (allActiveAccounts || []).length

    // CASO ESPECIAL: Si solo queda una cuenta financiera, se puede eliminar todo
    const isLastAccount = activeAccountsCount === 1

    // Si hay saldo y no se especificó una cuenta de destino, no permitir eliminar
    // EXCEPTO si es la última cuenta (caso especial)
    if (Math.abs(currentBalance) > 0.01 && !transferToAccountId && !isLastAccount) {
      return NextResponse.json(
        { 
          error: "La cuenta tiene saldo y debe transferirse antes de eliminar",
          balance: currentBalance,
          currency: account.currency
        },
        { status: 400 }
      )
    }

    // CASO ESPECIAL: Si es la última cuenta, requiere confirmación explícita
    if (isLastAccount) {
      if (!confirmDeleteAll) {
        return NextResponse.json(
          { 
            error: "Esta es la última cuenta financiera activa. Eliminarla borrará todos los movimientos contables del sistema.",
            requiresConfirmation: true,
            message: "Para confirmar la eliminación completa, incluya el parámetro 'confirmDeleteAll=true' en la URL."
          },
          { status: 400 }
        )
      }
      
      console.log(`⚠️ Eliminando última cuenta financiera con confirmación. Se eliminarán todos los movimientos contables.`)
      
      // Contar movimientos que se eliminarán
      const { count: movementsCount } = await (supabase.from("ledger_movements") as any)
        .select("*", { count: "exact", head: true })
        .eq("account_id", accountId)
      
      // Eliminar todos los movimientos de ledger asociados a esta cuenta
      const { error: deleteMovementsError } = await (supabase.from("ledger_movements") as any)
        .delete()
        .eq("account_id", accountId)
      
      if (deleteMovementsError) {
        console.error("Error eliminando movimientos de ledger:", deleteMovementsError)
        return NextResponse.json({ error: "Error al eliminar movimientos contables" }, { status: 500 })
      }
      
      // Eliminar la cuenta permanentemente
      const { error: deleteError } = await (supabase.from("financial_accounts") as any)
        .delete()
        .eq("id", accountId)
      
      if (deleteError) {
        console.error("Error eliminando cuenta:", deleteError)
        return NextResponse.json({ error: "Error al eliminar cuenta" }, { status: 500 })
      }
      
      return NextResponse.json({ 
        success: true,
        message: `Última cuenta financiera eliminada. Se eliminaron ${movementsCount || 0} movimientos contables.`,
        isLastAccount: true,
        movementsDeleted: movementsCount || 0
      })
    }

    // Si se especificó una cuenta de destino, transferir el saldo
    if (transferToAccountId && Math.abs(currentBalance) > 0.01) {
      // Verificar que la cuenta de destino existe y está activa
      const { data: destinationAccount, error: destError } = await (supabase.from("financial_accounts") as any)
        .select("*")
        .eq("id", transferToAccountId)
        .eq("is_active", true)
        .single()

      if (destError || !destinationAccount) {
        return NextResponse.json({ error: "Cuenta de destino no encontrada o inactiva" }, { status: 404 })
      }

      if (user.role !== "SUPER_ADMIN" && (!destinationAccount.agency_id || !agencyIds.includes(destinationAccount.agency_id))) {
        return NextResponse.json({ error: "No tiene acceso a la cuenta de destino" }, { status: 403 })
      }

      // Verificar que las monedas coincidan
      if (account.currency !== destinationAccount.currency) {
        return NextResponse.json(
          { error: `Las monedas no coinciden. La cuenta origen es ${account.currency} y la destino es ${destinationAccount.currency}` },
          { status: 400 }
        )
      }

      // Verificar que no sea la misma cuenta
      if (accountId === transferToAccountId) {
        return NextResponse.json({ error: "No se puede transferir a la misma cuenta" }, { status: 400 })
      }

      // Calcular exchange rate si es necesario
      let exchangeRate: number | null = null
      if (account.currency === "USD") {
        exchangeRate = await getExchangeRate(supabase, new Date())
        if (!exchangeRate) {
          exchangeRate = await getLatestExchangeRate(supabase)
        }
        if (!exchangeRate) {
          exchangeRate = 1000 // Fallback
        }
      }

      const amountARS = calculateARSEquivalent(
        Math.abs(currentBalance),
        account.currency as "ARS" | "USD",
        exchangeRate
      )

      // Crear movimiento de salida en la cuenta origen (EXPENSE para reducir el balance)
      await createLedgerMovement(
        {
          operation_id: null,
          lead_id: null,
          type: currentBalance > 0 ? "EXPENSE" : "INCOME", // Si el balance es positivo, EXPENSE lo reduce. Si es negativo, INCOME lo aumenta
          concept: `Transferencia de saldo al eliminar cuenta - Transferido a ${destinationAccount.name}`,
          currency: account.currency as "ARS" | "USD",
          amount_original: Math.abs(currentBalance),
          exchange_rate: exchangeRate,
          amount_ars_equivalent: amountARS,
          method: "BANK",
          account_id: accountId,
          seller_id: null,
          operator_id: null,
          receipt_number: null,
          notes: `Transferencia automática al eliminar cuenta "${account.name}"`,
          created_by: user.id,
        },
        supabase
      )

      // Crear movimiento de entrada en la cuenta destino (INCOME para aumentar el balance)
      await createLedgerMovement(
        {
          operation_id: null,
          lead_id: null,
          type: currentBalance > 0 ? "INCOME" : "EXPENSE", // Si el balance es positivo, INCOME lo aumenta. Si es negativo, EXPENSE lo reduce
          concept: `Transferencia de saldo desde cuenta eliminada - ${account.name}`,
          currency: account.currency as "ARS" | "USD",
          amount_original: Math.abs(currentBalance),
          exchange_rate: exchangeRate,
          amount_ars_equivalent: amountARS,
          method: "BANK",
          account_id: transferToAccountId,
          seller_id: null,
          operator_id: null,
          receipt_number: null,
          notes: `Transferencia automática desde cuenta "${account.name}" que fue eliminada`,
          created_by: user.id,
        },
        supabase
      )

      console.log(`✅ Saldo de ${currentBalance} ${account.currency} transferido de ${account.name} a ${destinationAccount.name}`)
    }

    // Eliminar la cuenta permanentemente (no soft-delete)
    // Según las especificaciones, la eliminación es permanente
    const { error: deleteError } = await (supabase.from("financial_accounts") as any)
      .delete()
      .eq("id", accountId)

    if (deleteError) {
      console.error("Error eliminando cuenta:", deleteError)
      return NextResponse.json({ error: "Error al eliminar cuenta" }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      message: "Cuenta eliminada permanentemente",
      transferred: transferToAccountId ? true : false
    })
  } catch (error: any) {
    console.error("Error in DELETE /api/accounting/financial-accounts/[id]:", error)
    return NextResponse.json({ error: "Error al eliminar cuenta" }, { status: 500 })
  }
}
