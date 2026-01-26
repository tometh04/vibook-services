/**
 * EXCHANGE RATES SERVICE
 * 
 * Maneja la obtención y gestión de tasas de cambio para conversión de monedas
 */

import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"

export interface ExchangeRate {
  id: string
  rate_date: string
  from_currency: "USD"
  to_currency: "ARS"
  rate: number
  source?: string | null
  notes?: string | null
  created_at: string
  created_by?: string | null
  updated_at: string
}

/**
 * Obtener la tasa de cambio para una fecha específica
 * Si no hay tasa exacta para esa fecha, devuelve la más cercana anterior
 * Si no hay ninguna tasa, devuelve null
 */
export async function getExchangeRate(
  supabase: SupabaseClient<Database>,
  date: Date | string,
  fromCurrency: "USD" = "USD",
  toCurrency: "ARS" = "ARS"
): Promise<number | null> {
  const dateStr = typeof date === "string" ? date : date.toISOString().split("T")[0]

  // Primero intentar obtener usando la función SQL (si existe)
  // Si la función no existe (PGRST202), usar directamente el fallback sin loguear error
  const { data, error } = await (supabase.rpc as any)("get_exchange_rate", {
    p_date: dateStr,
    p_from_currency: fromCurrency,
    p_to_currency: toCurrency,
  })

  if (error) {
    // Si el error es porque la función no existe (PGRST202), no loguear como error
    // Solo loguear como warning si es otro tipo de error
    if (error.code !== "PGRST202") {
      console.warn("Error calling get_exchange_rate function (using fallback):", error.message)
    }
    // Fallback: buscar directamente
    const { data: directData, error: directError } = await (supabase
      .from("exchange_rates") as any)
      .select("rate")
      .eq("from_currency", fromCurrency)
      .eq("to_currency", toCurrency)
      .lte("rate_date", dateStr)
      .order("rate_date", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (directError || !directData) {
      return null
    }

    return parseFloat(directData.rate)
  }

  return data ? parseFloat(String(data)) : null
}

/**
 * Obtener la tasa de cambio más reciente disponible
 */
export async function getLatestExchangeRate(
  supabase: SupabaseClient<Database>,
  fromCurrency: "USD" = "USD",
  toCurrency: "ARS" = "ARS"
): Promise<number | null> {
  const { data, error } = await (supabase.from("exchange_rates") as any)
    .select("rate")
    .eq("from_currency", fromCurrency)
    .eq("to_currency", toCurrency)
    .order("rate_date", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !data) {
    // No loguear warning - es esperado que no haya tasas de cambio si no se han cargado
    // El sistema usa un fallback automáticamente (1000) en los endpoints que lo necesitan
    return null
  }

  return parseFloat(data.rate)
}

/**
 * Crear o actualizar una tasa de cambio
 */
export async function upsertExchangeRate(
  supabase: SupabaseClient<Database>,
  rateDate: Date | string,
  rate: number,
  fromCurrency: "USD" = "USD",
  toCurrency: "ARS" = "ARS",
  source?: string,
  notes?: string,
  userId?: string
): Promise<{ id: string }> {
  const dateStr = typeof rateDate === "string" ? rateDate : rateDate.toISOString().split("T")[0]

  const { data, error } = await (supabase.from("exchange_rates") as any)
    .upsert(
      {
        rate_date: dateStr,
        from_currency: fromCurrency,
        to_currency: toCurrency,
        rate,
        source: source || "MANUAL",
        notes: notes || null,
        created_by: userId || null,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "rate_date,from_currency,to_currency",
      }
    )
    .select("id")
    .single()

  if (error) {
    throw new Error(`Error upserting exchange rate: ${error.message}`)
  }

  return { id: data.id }
}

/**
 * Obtener todas las tasas de cambio en un rango de fechas
 */
export async function getExchangeRatesInRange(
  supabase: SupabaseClient<Database>,
  dateFrom: Date | string,
  dateTo: Date | string,
  fromCurrency: "USD" = "USD",
  toCurrency: "ARS" = "ARS"
): Promise<ExchangeRate[]> {
  const fromStr = typeof dateFrom === "string" ? dateFrom : dateFrom.toISOString().split("T")[0]
  const toStr = typeof dateTo === "string" ? dateTo : dateTo.toISOString().split("T")[0]

  const { data, error } = await (supabase.from("exchange_rates") as any)
    .select("*")
    .eq("from_currency", fromCurrency)
    .eq("to_currency", toCurrency)
    .gte("rate_date", fromStr)
    .lte("rate_date", toStr)
    .order("rate_date", { ascending: false })

  if (error) {
    throw new Error(`Error fetching exchange rates: ${error.message}`)
  }

  return (data || []) as ExchangeRate[]
}

/**
 * OPTIMIZACIÓN: Obtener tasas de cambio para múltiples fechas en batch
 * Retorna un Map<dateString, rate> para acceso rápido
 * Si no hay tasa exacta para una fecha, usa la más cercana anterior
 */
export async function getExchangeRatesBatch(
  supabase: SupabaseClient<Database>,
  dates: (Date | string)[],
  fromCurrency: "USD" = "USD",
  toCurrency: "ARS" = "ARS"
): Promise<Map<string, number>> {
  if (dates.length === 0) {
    return new Map()
  }

  // Convertir todas las fechas a strings y obtener la más antigua y más reciente
  const dateStrings = dates.map(d => typeof d === "string" ? d : d.toISOString().split("T")[0])
  const sortedDates = Array.from(new Set(dateStrings)).sort()
  const minDate = sortedDates[0]
  const maxDate = sortedDates[sortedDates.length - 1]

  // Obtener todas las tasas en el rango de una vez
  const { data: rates, error } = await (supabase.from("exchange_rates") as any)
    .select("rate_date, rate")
    .eq("from_currency", fromCurrency)
    .eq("to_currency", toCurrency)
    .lte("rate_date", maxDate)
    .order("rate_date", { ascending: false })

  if (error) {
    console.warn("Error fetching exchange rates in batch:", error)
    return new Map()
  }

  // Crear un mapa de fecha -> tasa
  const ratesMap = new Map<string, number>()
  const ratesArray = (rates || []) as Array<{ rate_date: string; rate: string | number }>

  // Para cada fecha solicitada, encontrar la tasa más cercana (anterior o igual)
  for (const dateStr of dateStrings) {
    if (ratesMap.has(dateStr)) {
      continue // Ya calculada
    }

    // Buscar la tasa más cercana (anterior o igual a la fecha)
    const rateForDate = ratesArray.find(r => r.rate_date <= dateStr)
    if (rateForDate) {
      ratesMap.set(dateStr, parseFloat(String(rateForDate.rate)))
    } else {
      // Si no hay tasa, usar null (el código que llama debe manejar el fallback)
      ratesMap.set(dateStr, 0)
    }
  }

  return ratesMap
}

