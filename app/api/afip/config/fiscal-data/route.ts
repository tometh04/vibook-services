import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { createServerClient } from "@/lib/supabase/server"
import { createAdminSupabaseClient } from "@/lib/supabase/admin"
import { hasPermission, type UserRole } from "@/lib/permissions"

// PUT: Actualizar datos fiscales del emisor
export async function PUT(request: Request) {
  try {
    const { user } = await getCurrentUser()

    if (!hasPermission(user.role as UserRole, "settings", "write")) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
    }

    const body = await request.json()
    const { razon_social, domicilio_comercial, condicion_iva, inicio_actividades } = body

    if (!razon_social || !razon_social.trim()) {
      return NextResponse.json(
        { error: "La razón social es obligatoria" },
        { status: 400 }
      )
    }

    if (!domicilio_comercial || !domicilio_comercial.trim()) {
      return NextResponse.json(
        { error: "El domicilio comercial es obligatorio" },
        { status: 400 }
      )
    }

    const supabase = await createServerClient()
    const { data: userAgency } = await supabase
      .from("user_agencies")
      .select("agency_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle()

    if (!userAgency?.agency_id) {
      return NextResponse.json({ error: "Usuario sin agencia" }, { status: 400 })
    }

    // Obtener config activa
    const { data: config } = await supabase
      .from("afip_config")
      .select("id")
      .eq("agency_id", userAgency.agency_id)
      .eq("is_active", true)
      .maybeSingle()

    if (!config) {
      return NextResponse.json(
        { error: "No hay configuración AFIP activa" },
        { status: 400 }
      )
    }

    const adminSupabase = createAdminSupabaseClient()

    const { error: updateError } = await (adminSupabase as any)
      .from("afip_config")
      .update({
        razon_social: razon_social.trim(),
        domicilio_comercial: domicilio_comercial.trim(),
        condicion_iva: condicion_iva || "Monotributo",
        inicio_actividades: inicio_actividades?.trim() || null,
      })
      .eq("id", config.id)

    if (updateError) {
      console.error("[api/afip/config/fiscal-data PUT]", updateError)
      return NextResponse.json(
        { error: "Error al guardar datos fiscales" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[api/afip/config/fiscal-data PUT]", error)
    return NextResponse.json(
      { error: error?.message || "Error interno" },
      { status: 500 }
    )
  }
}
