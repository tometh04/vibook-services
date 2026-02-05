import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/auth"
import { getUserAgencyIds } from "@/lib/permissions-api"
import { canPerformAction } from "@/lib/permissions-api"
import { createLedgerMovement, calculateARSEquivalent, validateAccountBalanceForExpense, getAccountBalance } from "@/lib/accounting/ledger"
import { getExchangeRate, getLatestExchangeRate } from "@/lib/accounting/exchange-rates"

/**
 * POST /api/accounting/financial-accounts/transfer
 * Transfiere dinero entre cuentas financieras
 * 
 * Según especificaciones:
 * - Las transferencias entre cuentas financieras son dos movimientos (EXPENSE + INCOME)
 * - Siempre deben ser de la misma moneda (ARS→ARS, USD→USD)
 * - Si hay transferencia entre monedas diferentes, debe haber un tipo de cambio obligatorio
 */
export async function POST(request: Request) {
  try {
    const { user } = await getCurrentUser()

    if (!canPerformAction(user, "accounting", "write")) {
      return NextResponse.json({ error: "No tiene permiso para transferir entre cuentas" }, { status: 403 })
    }

    const supabase = await createServerClient()
    const body = await request.json()

    const {
      from_account_id,
      to_account_id,
      amount,
      currency,
      exchange_rate,
      transfer_date,
      reference,
      notes,
    } = body

    // Validar campos requeridos
    if (!from_account_id || !to_account_id || !amount || amount <= 0) {
      return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 })
    }

    // No se puede transferir a la misma cuenta
    if (from_account_id === to_account_id) {
      return NextResponse.json({ error: "No se puede transferir a la misma cuenta" }, { status: 400 })
    }

    // Obtener ambas cuentas
    const { data: accounts, error: accountsError } = await (supabase.from("financial_accounts") as any)
      .select("*")
      .in("id", [from_account_id, to_account_id])

    if (accountsError || !accounts || accounts.length !== 2) {
      return NextResponse.json({ error: "Una o ambas cuentas no fueron encontradas" }, { status: 404 })
    }

    // OPTIMIZACIÓN: Usar Map para acceso O(1) en lugar de find() O(n)
    const accountsMap = new Map<string, any>()
    for (const account of accounts) {
      accountsMap.set(account.id, account)
    }

    const fromAccount = accountsMap.get(from_account_id)
    const toAccount = accountsMap.get(to_account_id)

    if (!fromAccount || !toAccount) {
      return NextResponse.json({ error: "Cuentas no encontradas" }, { status: 404 })
    }

    const agencyIds = await getUserAgencyIds(supabase, user.id, user.role as any)
    if (user.role !== "SUPER_ADMIN") {
      if (!fromAccount.agency_id || !agencyIds.includes(fromAccount.agency_id)) {
        return NextResponse.json({ error: "No tiene acceso a la cuenta origen" }, { status: 403 })
      }
      if (!toAccount.agency_id || !agencyIds.includes(toAccount.agency_id)) {
        return NextResponse.json({ error: "No tiene acceso a la cuenta destino" }, { status: 403 })
      }
    }

    // Verificar que las cuentas estén activas
    if (!fromAccount.is_active || !toAccount.is_active) {
      return NextResponse.json({ error: "Una o ambas cuentas están inactivas" }, { status: 400 })
    }

    // Determinar la moneda de la transferencia
    // Si no se especifica currency, usar la moneda de la cuenta origen
    const transferCurrency = currency || fromAccount.currency

    // Validar monedas
    if (fromAccount.currency !== toAccount.currency) {
      // Transferencia entre monedas diferentes: requiere tipo de cambio
      if (!exchange_rate) {
        return NextResponse.json(
          { 
            error: "Las monedas no coinciden y se requiere un tipo de cambio obligatorio para realizar la transferencia",
            from_currency: fromAccount.currency,
            to_currency: toAccount.currency
          },
          { status: 400 }
        )
      }
    } else {
      // Misma moneda: la currency debe coincidir
      if (currency && currency !== fromAccount.currency) {
        return NextResponse.json(
          { error: `La moneda especificada (${currency}) no coincide con la moneda de las cuentas (${fromAccount.currency})` },
          { status: 400 }
        )
      }
    }

    // Validar saldo suficiente en cuenta origen
    // Solo validar si la moneda coincide (si no coincide, se convertirá)
    if (transferCurrency === fromAccount.currency) {
      try {
        await validateAccountBalanceForExpense(from_account_id, amount, transferCurrency as "ARS" | "USD", supabase)
      } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
    }

    // Calcular exchange rate si es necesario
    let finalExchangeRate: number | null = null
    let amountInFromCurrency = amount
    let amountInToCurrency = amount

    if (fromAccount.currency !== toAccount.currency) {
      // Transferencia entre monedas diferentes
      finalExchangeRate = exchange_rate || null
      
      if (!finalExchangeRate) {
        // Intentar obtener el tipo de cambio del día
        const rateDate = transfer_date ? new Date(transfer_date) : new Date()
        finalExchangeRate = await getExchangeRate(supabase, rateDate)
        
        if (!finalExchangeRate) {
          finalExchangeRate = await getLatestExchangeRate(supabase)
        }
        
        if (!finalExchangeRate) {
          return NextResponse.json(
            { error: "No se pudo obtener tasa de cambio para la transferencia entre monedas diferentes" },
            { status: 400 }
          )
        }
      }

      // Convertir el monto a la moneda de destino
      if (fromAccount.currency === "USD" && toAccount.currency === "ARS") {
        // De USD a ARS: multiplicar por el tipo de cambio
        amountInToCurrency = amount * finalExchangeRate
        amountInFromCurrency = amount // Mantener en USD
      } else if (fromAccount.currency === "ARS" && toAccount.currency === "USD") {
        // De ARS a USD: dividir por el tipo de cambio
        amountInToCurrency = amount / finalExchangeRate
        amountInFromCurrency = amount // Mantener en ARS
      }
    } else {
      // Misma moneda: no necesita conversión
      // USD: NO necesita tipo de cambio (el sistema trabaja en USD)
      // ARS: SÍ necesita tipo de cambio (para convertir a USD)
      if (fromAccount.currency === "ARS") {
        // Para ARS, el tipo de cambio es obligatorio (debería venir del frontend)
        finalExchangeRate = exchange_rate || null
        if (!finalExchangeRate || finalExchangeRate <= 0) {
          const rateDate = transfer_date ? new Date(transfer_date) : new Date()
          finalExchangeRate = await getExchangeRate(supabase, rateDate)
          if (!finalExchangeRate) {
            finalExchangeRate = await getLatestExchangeRate(supabase)
          }
          if (!finalExchangeRate || finalExchangeRate <= 0) {
            return NextResponse.json(
              { error: "El tipo de cambio es obligatorio para transferencias en ARS" },
              { status: 400 }
            )
          }
        }
      }
      // Para USD, finalExchangeRate = null (no se necesita tipo de cambio)
    }

    // Calcular amount_ars_equivalent para ambos movimientos
    // Base del sistema: USD
    // Para USD: amount_ars_equivalent = amount_original
    // Para ARS: amount_ars_equivalent = amount_original / exchange_rate
    let amountUsdFrom: number
    let amountUsdTo: number
    
    if (fromAccount.currency === "ARS") {
      amountUsdFrom = calculateARSEquivalent(amountInFromCurrency, "ARS", finalExchangeRate)
    } else {
      // Para USD, amount_ars_equivalent = amount_original (sin conversión)
      amountUsdFrom = amountInFromCurrency
    }
    
    if (toAccount.currency === "ARS") {
      amountUsdTo = calculateARSEquivalent(amountInToCurrency, "ARS", finalExchangeRate)
    } else {
      // Para USD, amount_ars_equivalent = amount_original (sin conversión)
      amountUsdTo = amountInToCurrency
    }

    // Crear movimiento de salida en cuenta origen (EXPENSE)
    await createLedgerMovement(
      {
        operation_id: null,
        lead_id: null,
        type: "EXPENSE",
        concept: `Transferencia a ${toAccount.name}`,
        currency: fromAccount.currency as "ARS" | "USD",
        amount_original: amountInFromCurrency,
        exchange_rate: fromAccount.currency === "ARS" ? finalExchangeRate : null, // Solo guardar exchange_rate para ARS
        amount_ars_equivalent: amountUsdFrom,
        method: "BANK",
        account_id: from_account_id,
        seller_id: null,
        operator_id: null,
        receipt_number: reference || null,
        notes: notes || `Transferencia a ${toAccount.name}${fromAccount.currency !== toAccount.currency ? ` (TC: ${finalExchangeRate})` : ""}`,
        created_by: user.id,
      },
      supabase
    )

    // Crear movimiento de entrada en cuenta destino (INCOME)
    await createLedgerMovement(
      {
        operation_id: null,
        lead_id: null,
        type: "INCOME",
        concept: `Transferencia desde ${fromAccount.name}`,
        currency: toAccount.currency as "ARS" | "USD",
        amount_original: amountInToCurrency,
        exchange_rate: toAccount.currency === "ARS" ? finalExchangeRate : null, // Solo guardar exchange_rate para ARS
        amount_ars_equivalent: amountUsdTo,
        method: "BANK",
        account_id: to_account_id,
        seller_id: null,
        operator_id: null,
        receipt_number: reference || null,
        notes: notes || `Transferencia desde ${fromAccount.name}${fromAccount.currency !== toAccount.currency ? ` (TC: ${finalExchangeRate})` : ""}`,
        created_by: user.id,
      },
      supabase
    )

    // Si hay transferencia entre monedas diferentes, registrar diferencia de cambio (FX_GAIN/FX_LOSS)
    if (fromAccount.currency !== toAccount.currency && finalExchangeRate) {
      // Calcular el valor teórico en USD (base) de ambos montos
      const fromAmountUsd = calculateARSEquivalent(amountInFromCurrency, fromAccount.currency as "ARS" | "USD", finalExchangeRate)
      const toAmountUsd = calculateARSEquivalent(amountInToCurrency, toAccount.currency as "ARS" | "USD", finalExchangeRate)
      
      // La diferencia de cambio es la diferencia entre lo que salió y lo que entró (en USD)
      const fxDifferenceUsd = fromAmountUsd - toAmountUsd
      
      if (Math.abs(fxDifferenceUsd) > 0.01) { // Solo registrar si la diferencia es significativa (> 1 centavo)
        // Determinar si es ganancia o pérdida cambiaria
        const fxType = fxDifferenceUsd > 0 ? "FX_LOSS" : "FX_GAIN" // Si salió más de lo que entró, es pérdida
        const fxAmountUsd = Math.abs(fxDifferenceUsd)
        const fxAmountOriginal =
          fromAccount.currency === "ARS"
            ? fxAmountUsd * (finalExchangeRate || 1)
            : fxAmountUsd
        
        // Registrar la diferencia de cambio en la cuenta origen
        // Si es FX_LOSS, aumenta el pasivo o disminuye el activo
        // Si es FX_GAIN, disminuye el pasivo o aumenta el activo
        await createLedgerMovement(
          {
            operation_id: null,
            lead_id: null,
            type: fxType,
            concept: `Diferencia de cambio en transferencia a ${toAccount.name}`,
            currency: fromAccount.currency as "ARS" | "USD",
            amount_original: fxAmountOriginal,
            exchange_rate: fromAccount.currency === "ARS" ? finalExchangeRate : null, // Solo guardar exchange_rate para ARS
            amount_ars_equivalent: fxAmountUsd,
            method: "BANK",
            account_id: from_account_id,
            seller_id: null,
            operator_id: null,
            receipt_number: reference || null,
            notes: `Diferencia de cambio: ${fxDifferenceUsd > 0 ? "Pérdida" : "Ganancia"} de ${fxAmountUsd.toFixed(2)} USD en transferencia entre ${fromAccount.currency} y ${toAccount.currency}`,
            created_by: user.id,
          },
          supabase
        )
        
        console.log(`📊 Registrada diferencia de cambio: ${fxType} de ${fxAmountUsd.toFixed(2)} USD`)
      }
    }

    // Obtener balances actualizados
    const fromBalance = await getAccountBalance(from_account_id, supabase)
    const toBalance = await getAccountBalance(to_account_id, supabase)

    return NextResponse.json({
      success: true,
      message: "Transferencia realizada exitosamente",
      transfer: {
        from_account: {
          id: from_account_id,
          name: fromAccount.name,
          currency: fromAccount.currency,
          new_balance: fromBalance,
        },
        to_account: {
          id: to_account_id,
          name: toAccount.name,
          currency: toAccount.currency,
          new_balance: toBalance,
        },
        amount_from: amountInFromCurrency,
        amount_to: amountInToCurrency,
        exchange_rate: finalExchangeRate,
      },
    })
  } catch (error: any) {
    console.error("Error in POST /api/accounting/financial-accounts/transfer:", error)
    return NextResponse.json(
      { error: error.message || "Error al realizar transferencia" },
      { status: 500 }
    )
  }
}
