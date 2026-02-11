import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/auth"
import { verifyFeatureAccess } from "@/lib/billing/subscription-middleware"
import { getUserAgencyIds } from "@/lib/permissions-api"

/**
 * POST /api/leads/claim
 * Permite a un vendedor "agarrar" un lead sin asignar
 *
 * Lógica:
 * 1. Verificar que el lead pertenece a la agencia del vendedor
 * 2. Verificar que el lead está sin asignar
 * 3. Actualizar assigned_seller_id en la DB
 */
export async function POST(request: Request) {
  try {
    const { user } = await getCurrentUser()

    const featureAccess = await verifyFeatureAccess(user.id, user.role, "crm")
    if (!featureAccess.hasAccess) {
      return NextResponse.json(
        { error: featureAccess.message || "No tiene acceso al CRM" },
        { status: 403 }
      )
    }

    // Solo vendedores pueden "agarrar" leads
    if (user.role !== "SELLER" && user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }

    const { leadId } = await request.json()

    if (!leadId) {
      return NextResponse.json({ error: "Falta el ID del lead" }, { status: 400 })
    }

    const supabase = await createServerClient()

    // 1. Obtener el lead con agency_id
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("id, assigned_seller_id, agency_id")
      .eq("id", leadId)
      .single()

    if (leadError || !lead) {
      console.error("Error getting lead:", leadError)
      return NextResponse.json({ error: "Lead no encontrado" }, { status: 404 })
    }

    const leadData = lead as any

    // 2. Verificar que el lead pertenece a la agencia del vendedor
    if (user.role !== "SUPER_ADMIN" && leadData.agency_id) {
      const agencyIds = await getUserAgencyIds(supabase, user.id, user.role as any)
      if (!agencyIds.includes(leadData.agency_id)) {
        return NextResponse.json({ error: "No tiene acceso a este lead" }, { status: 403 })
      }
    }

    // 3. Verificar que el lead está sin asignar
    if (leadData.assigned_seller_id) {
      return NextResponse.json({
        error: "Este lead ya está asignado a otro vendedor"
      }, { status: 400 })
    }

    // 4. Asignar el lead al vendedor
    const { error: updateError } = await (supabase
      .from("leads") as any)
      .update({
        assigned_seller_id: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", leadId)

    if (updateError) {
      console.error("Error updating lead:", updateError)
      return NextResponse.json({ error: "Error al asignar el lead" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "Lead asignado correctamente"
    })

  } catch (error: any) {
    console.error("Error in claim lead:", error)
    return NextResponse.json({
      error: error.message || "Error al agarrar el lead"
    }, { status: 500 })
  }
}
