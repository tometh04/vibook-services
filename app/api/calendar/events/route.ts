import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/auth"
import { getUserAgencyIds } from "@/lib/permissions-api"

export async function GET(request: Request) {
  try {
    const { user } = await getCurrentUser()
    const supabase = await createServerClient()
    const events: any[] = []

    const agencyIds = await getUserAgencyIds(supabase, user.id, user.role as any)

    if (user.role !== "SUPER_ADMIN" && agencyIds.length === 0) {
      return NextResponse.json({ events: [] })
    }

    // Check-ins de operaciones
    let checkinsQuery = (supabase.from("operations") as any)
      .select("id, destination, checkin_date, file_code")
      .not("checkin_date", "is", null)
    if (user.role !== "SUPER_ADMIN") {
      checkinsQuery = checkinsQuery.in("agency_id", agencyIds)
    }
    const { data: checkins } = await checkinsQuery

    if (checkins) {
      for (const op of checkins) {
        events.push({
          id: `checkin-${op.id}`,
          type: "CHECKIN",
          title: `Check-in: ${op.destination}`,
          date: op.checkin_date,
          description: op.file_code || undefined,
          color: "#3b82f6",
          operationId: op.id,
        })
      }
    }

    // Salidas de operaciones
    let departuresQuery = (supabase.from("operations") as any)
      .select("id, destination, departure_date, file_code")
      .not("departure_date", "is", null)
    if (user.role !== "SUPER_ADMIN") {
      departuresQuery = departuresQuery.in("agency_id", agencyIds)
    }
    const { data: departures } = await departuresQuery

    if (departures) {
      for (const op of departures) {
        events.push({
          id: `departure-${op.id}`,
          type: "DEPARTURE",
          title: `Salida: ${op.destination}`,
          date: op.departure_date,
          description: op.file_code || undefined,
          color: "#10b981",
          operationId: op.id,
        })
      }
    }

    // Vencimientos de pagos (filtrados por operaciones de las agencias del usuario)
    let paymentsQuery = (supabase.from("payments") as any)
      .select("id, amount, currency, date_due, payer_type, operation_id, operations:operation_id(destination, agency_id)")
      .eq("status", "PENDING")
    const { data: payments } = await paymentsQuery

    if (payments) {
      for (const payment of payments) {
        // Filtrar por agencia a través de la operación asociada
        if (user.role !== "SUPER_ADMIN" && payment.operations?.agency_id && !agencyIds.includes(payment.operations.agency_id)) continue
        events.push({
          id: `payment-${payment.id}`,
          type: "PAYMENT_DUE",
          title: `Pago ${payment.payer_type === "CUSTOMER" ? "de cliente" : "a operador"}: ${Number(payment.amount).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${payment.currency}`,
          date: payment.date_due,
          description: payment.operations?.destination || undefined,
          color: "#f59e0b",
          operationId: payment.operation_id,
        })
      }
    }

    // Seguimientos de leads
    let leadsQuery = (supabase.from("leads") as any)
      .select("id, contact_name, destination, follow_up_date")
      .not("follow_up_date", "is", null)
    if (user.role !== "SUPER_ADMIN") {
      leadsQuery = leadsQuery.in("agency_id", agencyIds)
    }
    const { data: leads } = await leadsQuery

    if (leads) {
      for (const lead of leads) {
        events.push({
          id: `followup-${lead.id}`,
          type: "FOLLOW_UP",
          title: `Seguimiento: ${lead.contact_name}`,
          date: lead.follow_up_date,
          description: lead.destination || undefined,
          color: "#8b5cf6",
          leadId: lead.id,
        })
      }
    }

    // Alertas pendientes
    let alertsQuery = (supabase.from("alerts") as any)
      .select("id, description, date_due, type, operation_id, agency_id")
      .eq("status", "PENDING")
    if (user.role !== "SUPER_ADMIN") {
      alertsQuery = alertsQuery.in("agency_id", agencyIds)
    }
    const { data: alerts } = await alertsQuery

    if (alerts) {
      for (const alert of alerts) {
        events.push({
          id: `alert-${alert.id}`,
          type: "REMINDER",
          title: alert.description,
          date: alert.date_due.split("T")[0],
          color: "#6366f1",
          operationId: alert.operation_id || undefined,
        })
      }
    }

    return NextResponse.json({ events })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
