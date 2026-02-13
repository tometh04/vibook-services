import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { createServerClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    let user: any
    try {
      const result = await getCurrentUser()
      user = result.user
    } catch (e: any) {
      if (e?.digest?.startsWith?.("NEXT_REDIRECT")) throw e
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }
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

    if (userAgenciesError || !userAgencies) {
      return NextResponse.json(
        { error: "No se encontró la agencia del usuario" },
        { status: 404 }
      )
    }

    // TypeScript no puede inferir el tipo correctamente, hacemos cast explícito
    const userAgencyData = userAgencies as { agency_id: string } | null
    
    if (!userAgencyData || !userAgencyData.agency_id) {
      return NextResponse.json(
        { error: "No se encontró la agencia del usuario" },
        { status: 404 }
      )
    }

    const agencyId = userAgencyData.agency_id

    // Actualizar información de la agencia
    // @ts-ignore - TypeScript no puede inferir tipos de Supabase correctamente
    const { error: agencyError } = await (supabase
      .from("agencies") as any)
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
    // @ts-ignore - TypeScript no puede inferir tipos de Supabase correctamente
    const { error: brandingError } = await (supabase
      .from("tenant_branding") as any)
      .update({
        brand_name: brandName,
        app_name: brandName,
        email_from_name: brandName,
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
    if (error?.digest?.startsWith?.("NEXT_REDIRECT")) throw error
    console.error("❌ Error in onboarding:", error)
    return NextResponse.json(
      { error: error.message || "Error al completar el onboarding" },
      { status: 500 }
    )
  }
}
