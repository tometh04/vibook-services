import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

export const dynamic = 'force-dynamic'

/**
 * GET /api/customers/settings
 * Returns customer module settings for the authenticated user's agency.
 * If no settings exist in the database, returns sensible defaults.
 */
export async function GET() {
  try {
    const supabase = await createServerClient()

    // Autenticación
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

    if (authError || !authUser) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }

    // Usuario de DB
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, role')
      .eq('auth_id', authUser.id)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 401 })
    }

    // Obtener agency del usuario
    let agencyId: string | null = null
    if (user.role === "SUPER_ADMIN") {
      const { data: agencies } = await supabase.from("agencies").select("id").limit(1)
      agencyId = agencies?.[0]?.id || null
    } else {
      const { data: userAgencies } = await supabase
        .from("user_agencies")
        .select("agency_id")
        .eq("user_id", user.id)
        .limit(1)
      agencyId = userAgencies?.[0]?.agency_id || null
    }

    // Intentar obtener configuración de la DB si existe la tabla
    if (agencyId) {
      try {
        const { data: existing } = await (supabase.from("customer_settings") as any)
          .select("*")
          .eq("agency_id", agencyId)
          .maybeSingle()

        if (existing) {
          return NextResponse.json(existing)
        }
      } catch {
        // La tabla puede no existir aún — devolvemos defaults
      }
    }

    // Devolver configuración por defecto
    const defaultSettings = {
      custom_fields: [],
      validations: {
        email: { required: true, format: "email" },
        phone: { required: true, format: "phone" },
      },
      notifications: [],
      integrations: {
        operations: { auto_link: true },
        leads: { auto_convert: false },
      },
      auto_assign_lead: false,
      require_document: false,
      duplicate_check_enabled: true,
      duplicate_check_fields: ["email", "phone"],
    }

    return NextResponse.json(defaultSettings)
  } catch (error: any) {
    console.error("Error in GET /api/customers/settings:", error)
    return NextResponse.json(
      { error: error.message || "Error al obtener configuración" },
      { status: 500 }
    )
  }
}
