import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/auth"

// Forzar ruta dinámica (usa cookies para autenticación)
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { user } = await getCurrentUser()
    const { searchParams } = new URL(request.url)

    const dateFrom = searchParams.get("dateFrom")
    const dateTo = searchParams.get("dateTo")
    const agencyId = searchParams.get("agencyId")

    const supabase = await createServerClient()

    // Get user agencies
    const { data: userAgencies } = await supabase
      .from("user_agencies")
      .select("agency_id")
      .eq("user_id", user.id)

    const agencyIds = (userAgencies || []).map((ua: any) => ua.agency_id)

    // Validate date format if provided
    if (dateFrom && !/^\d{4}-\d{2}-\d{2}$/.test(dateFrom)) {
      console.error("Invalid dateFrom format:", dateFrom)
      return NextResponse.json({ error: "Formato de fecha inválido (dateFrom)" }, { status: 400 })
    }

    if (dateTo && !/^\d{4}-\d{2}-\d{2}$/.test(dateTo)) {
      console.error("Invalid dateTo format:", dateTo)
      return NextResponse.json({ error: "Formato de fecha inválido (dateTo)" }, { status: 400 })
    }

    // Usar la tabla payments (igual que cash/summary) en lugar de cash_movements
    // Esto es más consistente con cómo se muestran los datos en la página de caja
    let query = (supabase.from("payments") as any)
      .select(`
        id,
        direction,
        amount,
        amount_usd,
        currency,
        date_paid,
        status,
        operation_id,
        operations:operation_id(
          agency_id,
          seller_id
        )
      `)
      .eq("status", "PAID")
      .not("date_paid", "is", null)
      .order("date_paid", { ascending: true })

    // Apply date filters
    if (dateFrom) {
      query = query.gte("date_paid", dateFrom)
    }

    if (dateTo) {
      query = query.lte("date_paid", dateTo)
    }

    // Apply agency filter if specified
    if (agencyId && agencyId !== "ALL") {
      // Get operations for this agency
      const { data: agencyOperations } = await supabase
        .from("operations")
        .select("id")
        .eq("agency_id", agencyId)

      const agencyOperationIds = (agencyOperations || []).map((op: any) => op.id)

      if (agencyOperationIds.length > 0) {
        query = query.in("operation_id", agencyOperationIds)
      } else {
        return NextResponse.json({ cashflow: [] })
      }
    } else if (agencyIds.length > 0 && user.role !== "SUPER_ADMIN") {
      // Filter by user's agencies
      const { data: agencyOperations } = await supabase
        .from("operations")
        .select("id")
        .in("agency_id", agencyIds)

      const agencyOperationIds = (agencyOperations || []).map((op: any) => op.id)

      if (agencyOperationIds.length > 0) {
        query = query.in("operation_id", agencyOperationIds)
      }
    }

    // Apply seller filter for SELLER role
    if (user.role === "SELLER") {
      const { data: sellerOperations } = await supabase
        .from("operations")
        .select("id")
        .eq("seller_id", user.id)

      const sellerOperationIds = (sellerOperations || []).map((op: any) => op.id)

      if (sellerOperationIds.length > 0) {
        query = query.in("operation_id", sellerOperationIds)
      } else {
        return NextResponse.json({ cashflow: [] })
      }
    }

    const { data: payments, error } = await query

    if (error) {
      console.error("Error fetching cashflow data:", error)
      throw new Error("Error al obtener datos de flujo de caja")
    }

    // If no payments found, return empty array
    if (!payments || payments.length === 0) {
      console.log("No payments found for cashflow filters:", { dateFrom, dateTo, agencyId, userRole: user.role })
      return NextResponse.json({ cashflow: [] })
    }

    // Group by date
    const cashflowByDate = (payments || []).reduce((acc: any, payment: any) => {
      // Use date_paid for grouping
      let dateStr: string
      if (payment.date_paid) {
        dateStr = payment.date_paid.split("T")[0]
      } else {
        return acc
      }

      if (!acc[dateStr]) {
        acc[dateStr] = {
          date: dateStr,
          income: 0,
          expense: 0,
          net: 0,
        }
      }

      // Usar amount_usd si está disponible, sino convertir
      let amountUsd = 0
      if (payment.amount_usd) {
        amountUsd = parseFloat(payment.amount_usd) || 0
      } else if (payment.currency === "USD") {
        amountUsd = parseFloat(payment.amount) || 0
      } else {
        // ARS sin conversión (usar amount como está)
        amountUsd = parseFloat(payment.amount) || 0
      }

      if (payment.direction === "INCOME") {
        acc[dateStr].income += amountUsd
      } else if (payment.direction === "EXPENSE") {
        acc[dateStr].expense += amountUsd
      }

      acc[dateStr].net = acc[dateStr].income - acc[dateStr].expense

      return acc
    }, {})

    const cashflow = Object.values(cashflowByDate).sort((a: any, b: any) =>
      a.date.localeCompare(b.date),
    )

    return NextResponse.json({ cashflow })
  } catch (error: any) {
    console.error("Error in GET /api/analytics/cashflow:", error)
    return NextResponse.json({ error: error.message || "Error al obtener datos de flujo de caja" }, { status: 500 })
  }
}

