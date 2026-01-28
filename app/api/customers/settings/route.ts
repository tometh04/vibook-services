import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/auth"

export const dynamic = 'force-dynamic'

/**
 * GET /api/customers/settings
 * Obtiene la configuración de clientes para la agencia del usuario
 */
export async function GET() {
  try {
    const { user } = await getCurrentUser()
    const supabase = await createServerClient()

    // Obtener agencia del usuario
    const { data: userAgency } = await supabase
      .from("user_agencies")
      .select("agency_id")
      .eq("user_id", user.id)
      .maybeSingle()

    const agencyId = userAgency?.agency_id

    // Intentar obtener configuración existente
    let settings = null
    if (agencyId) {
      const { data } = await (supabase.from("customer_settings") as any)
        .select("*")
        .eq("agency_id", agencyId)
        .maybeSingle()
      settings = data
    }

    // Si no existe configuración, retornar valores por defecto
    if (!settings) {
      return NextResponse.json({
        custom_fields: [],
        validations: {
          email: { required: false, format: "email" },
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
      })
    }

    return NextResponse.json(settings)
  } catch (error: any) {
    console.error("Error in GET /api/customers/settings:", error)
    // Retornar configuración por defecto en caso de error
    return NextResponse.json({
      custom_fields: [],
      validations: {
        email: { required: false, format: "email" },
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
    })
  }
}

/**
 * PUT /api/customers/settings
 * Actualiza la configuración de clientes para la agencia del usuario
 */
export async function PUT(request: Request) {
  try {
    const { user } = await getCurrentUser()
    const supabase = await createServerClient()
    const body = await request.json()

    // Verificar permisos (solo ADMIN o SUPER_ADMIN)
    if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "No tiene permiso para modificar la configuración" },
        { status: 403 }
      )
    }

    // Obtener agencia del usuario
    const { data: userAgency } = await supabase
      .from("user_agencies")
      .select("agency_id")
      .eq("user_id", user.id)
      .maybeSingle()

    if (!userAgency?.agency_id) {
      return NextResponse.json(
        { error: "Usuario no tiene agencia asignada" },
        { status: 400 }
      )
    }

    const agencyId = userAgency.agency_id

    // Verificar si existe configuración
    const { data: existing } = await (supabase.from("customer_settings") as any)
      .select("id")
      .eq("agency_id", agencyId)
      .maybeSingle()

    const settingsData = {
      agency_id: agencyId,
      custom_fields: body.custom_fields || [],
      validations: body.validations || {},
      notifications: body.notifications || [],
      integrations: body.integrations || {},
      auto_assign_lead: body.auto_assign_lead || false,
      require_document: body.require_document || false,
      duplicate_check_enabled: body.duplicate_check_enabled ?? true,
      duplicate_check_fields: body.duplicate_check_fields || ["email", "phone"],
      updated_by: user.id,
    }

    if (existing) {
      // Actualizar
      const { error } = await (supabase.from("customer_settings") as any)
        .update(settingsData)
        .eq("id", existing.id)

      if (error) throw error
    } else {
      // Crear nuevo
      const { error } = await (supabase.from("customer_settings") as any)
        .insert({
          ...settingsData,
          created_by: user.id,
        })

      if (error) throw error
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error in PUT /api/customers/settings:", error)
    return NextResponse.json(
      { error: error.message || "Error al guardar configuración" },
      { status: 500 }
    )
  }
}
