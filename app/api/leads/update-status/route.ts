import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/auth"
import { verifyFeatureAccess } from "@/lib/billing/subscription-middleware"

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

    // Actualizar status del lead
    if (status) {
      await supabase
        .from("leads")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", leadId)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error en update-status:", error)
    return NextResponse.json({ error: "Error al actualizar" }, { status: 500 })
  }
}
