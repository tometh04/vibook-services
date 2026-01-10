import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { createServerClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const { user } = await getCurrentUser()
    const supabase = await createServerClient()
    const body = await request.json()
    const { agencyName, city, timezone, brandName } = body

    // Validar campos requeridos
    if (!agencyName || !city || !timezone || !brandName) {
      return NextResponse.json(
        { error: "Todos los campos son requeridos" },
        { status: 400 }
      )
    }

    // Obtener la agencia del usuario (debería ser SUPER_ADMIN de su propia agencia)
    const { data: userAgencies, error: userAgenciesError } = await supabase
      .from("user_agencies")
      .select("agency_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle()

    if (userAgenciesError || !userAgencies || !userAgencies.agency_id) {
      return NextResponse.json(
        { error: "No se encontró la agencia del usuario" },
        { status: 404 }
      )
    }

    const agencyId = userAgencies.agency_id as string

    // Actualizar información de la agencia
    const { error: agencyError } = await supabase
      .from("agencies")
      .update({
        name: agencyName,
        city,
        timezone,
        updated_at: new Date().toISOString(),
      })
      .eq("id", agencyId)

    if (agencyError) {
      console.error("❌ Error updating agency:", agencyError)
      return NextResponse.json(
        { error: "Error al actualizar la información de la agencia" },
        { status: 500 }
      )
    }

    // Actualizar branding
    const { error: brandingError } = await supabase
      .from("tenant_branding")
      .update({
        brand_name: brandName,
        updated_at: new Date().toISOString(),
      })
      .eq("agency_id", agencyId)

    if (brandingError) {
      console.error("⚠️  Error updating branding:", brandingError)
      // No fallar si solo falla el branding
    }

    return NextResponse.json({
      success: true,
      message: "Onboarding completado exitosamente",
    })
  } catch (error: any) {
    console.error("❌ Error in onboarding:", error)
    return NextResponse.json(
      { error: error.message || "Error al completar el onboarding" },
      { status: 500 }
    )
  }
}
