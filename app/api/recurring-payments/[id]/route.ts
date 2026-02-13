import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/auth"
import { verifySubscriptionAccess } from "@/lib/billing/subscription-middleware"
import { canPerformAction } from "@/lib/permissions-api"
import {
  updateRecurringPayment,
  deleteRecurringPayment,
} from "@/lib/accounting/recurring-payments"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await getCurrentUser()
    // Verificar suscripción activa para operaciones de escritura
    const subCheck = await verifySubscriptionAccess(user.id, user.role)
    if (!subCheck.hasAccess) {
      return NextResponse.json({ error: subCheck.message || "Suscripción no activa" }, { status: 403 })
    }

    const supabase = await createServerClient()
    const { id } = await params

    // Verificar permisos
    if (!canPerformAction(user, "accounting", "write")) {
      return NextResponse.json({ error: "No tiene permiso para actualizar pagos recurrentes" }, { status: 403 })
    }

    const body = await request.json()
    const updates: any = {}

    // Solo actualizar campos que vengan en el body
    if (body.amount !== undefined) updates.amount = parseFloat(body.amount)
    if (body.currency !== undefined) updates.currency = body.currency
    if (body.frequency !== undefined) updates.frequency = body.frequency
    if (body.start_date !== undefined) updates.start_date = body.start_date
    if (body.end_date !== undefined) updates.end_date = body.end_date || null
    if (body.next_due_date !== undefined) updates.next_due_date = body.next_due_date
    if (body.is_active !== undefined) updates.is_active = body.is_active
    if (body.description !== undefined) updates.description = body.description
    if (body.notes !== undefined) updates.notes = body.notes || null
    if (body.invoice_number !== undefined) updates.invoice_number = body.invoice_number || null
    if (body.reference !== undefined) updates.reference = body.reference || null

    await updateRecurringPayment(supabase, id, updates)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error in PATCH /api/recurring-payments/[id]:", error)
    return NextResponse.json({ error: error.message || "Error al actualizar pago recurrente" }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await getCurrentUser()
    // Verificar suscripción activa para operaciones de escritura
    const subCheck = await verifySubscriptionAccess(user.id, user.role)
    if (!subCheck.hasAccess) {
      return NextResponse.json({ error: subCheck.message || "Suscripción no activa" }, { status: 403 })
    }

    const supabase = await createServerClient()
    const { id } = await params

    // Verificar permisos
    if (!canPerformAction(user, "accounting", "write")) {
      return NextResponse.json({ error: "No tiene permiso para eliminar pagos recurrentes" }, { status: 403 })
    }

    await deleteRecurringPayment(supabase, id)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error in DELETE /api/recurring-payments/[id]:", error)
    return NextResponse.json({ error: error.message || "Error al eliminar pago recurrente" }, { status: 500 })
  }
}

