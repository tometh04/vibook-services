import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/auth"
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

    // Obtener la cuenta a eliminar
    const { data: account, error: accountError } = await (supabase.from("financial_accounts") as any)
      .select("*")
      .eq("id", accountId)
      .single()

    if (accountError || !account) {
      return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 })
    }

    // Calcular el balance actual
    let currentBalance: number
    try {
      currentBalance = await getAccountBalance(accountId, supabase)
    } catch (error) {
      console.error(`Error calculando balance de cuenta ${accountId}:`, error)
      currentBalance = parseFloat(account.initial_balance || "0")
    }

    // Si hay saldo y no se especificó una cuenta de destino, no permitir eliminar
    if (Math.abs(currentBalance) > 0.01 && !transferToAccountId) {
      return NextResponse.json(
        { 
          error: "La cuenta tiene saldo y debe transferirse antes de eliminar",
          balance: currentBalance,
          currency: account.currency
        },
        { status: 400 }
      )
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

    // Verificar si hay movimientos de ledger asociados a esta cuenta
    const { data: ledgerMovements, error: ledgerError } = await (supabase.from("ledger_movements") as any)
      .select("id")
      .eq("account_id", accountId)
      .limit(1)

    if (ledgerError) {
      console.error("Error verificando movimientos de ledger:", ledgerError)
    }

    // Si hay movimientos, no eliminar físicamente, solo marcar como inactiva
    // Esto preserva el historial contable
    if (ledgerMovements && ledgerMovements.length > 0) {
      const { error: updateError } = await (supabase.from("financial_accounts") as any)
        .update({ is_active: false })
        .eq("id", accountId)

      if (updateError) {
        console.error("Error desactivando cuenta:", updateError)
        return NextResponse.json({ error: "Error al desactivar cuenta" }, { status: 500 })
      }

      return NextResponse.json({ 
        success: true,
        message: "Cuenta desactivada (tiene movimientos históricos)",
        transferred: transferToAccountId ? true : false
      })
    } else {
      // Si no hay movimientos, eliminar físicamente
      const { error: deleteError } = await (supabase.from("financial_accounts") as any)
        .delete()
        .eq("id", accountId)

      if (deleteError) {
        console.error("Error eliminando cuenta:", deleteError)
        return NextResponse.json({ error: "Error al eliminar cuenta" }, { status: 500 })
      }

      return NextResponse.json({ 
        success: true,
        message: "Cuenta eliminada exitosamente",
        transferred: transferToAccountId ? true : false
      })
    }
  } catch (error: any) {
    console.error("Error in DELETE /api/accounting/financial-accounts/[id]:", error)
    return NextResponse.json({ error: "Error al eliminar cuenta" }, { status: 500 })
  }
}
