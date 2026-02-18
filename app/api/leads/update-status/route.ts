import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/auth"
import { verifyFeatureAccess } from "@/lib/billing/subscription-middleware"
import { getUserAgencyIds } from "@/lib/permissions-api"

const VALID_STATUSES = ["NEW", "IN_PROGRESS", "QUOTED", "CONTACTED", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "WON", "LOST", "ARCHIVED"]

export async function POST(request: Request) {
  try {
    const { user } = await getCurrentUser()
    const supabase = await createServerClient() as any
    const body = await request.json()
    const { leadId, status } = body

    const featureAccess = await verifyFeatureAccess(user.id, user.role, "crm")
    if (!featureAccess.hasAccess) {
      return NextResponse.json(
        { error: featureAccess.message || "No tiene acceso al CRM" },
        { status: 403 }
      )
    }

    if (!leadId) {
      return NextResponse.json({ error: "Falta leadId" }, { status: 400 })
    }

    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: "Estado inválido" }, { status: 400 })
    }

    // Verificar que el lead pertenece a una agencia del usuario
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("id, agency_id")
      .eq("id", leadId)
      .single()

    if (leadError || !lead) {
      return NextResponse.json({ error: "Lead no encontrado" }, { status: 404 })
    }

    if (user.role !== "SUPER_ADMIN" && lead.agency_id) {
      const agencyIds = await getUserAgencyIds(supabase, user.id, user.role as any)
      if (!agencyIds.includes(lead.agency_id)) {
        return NextResponse.json({ error: "No tiene acceso a este lead" }, { status: 403 })
      }
    }

    // Actualizar status del lead
    await supabase
      .from("leads")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", leadId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error en update-status:", error)
    return NextResponse.json({ error: "Error al actualizar" }, { status: 500 })
  }
}
