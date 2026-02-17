import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { createServerClient } from "@/lib/supabase/server"
import { createAdminSupabaseClient } from "@/lib/supabase/admin"
import { setupAfipCertificate, testAfipConnection } from "@/lib/afip/client"
import { hasPermission, type UserRole } from "@/lib/permissions"

// GET: Obtener configuración AFIP de la agencia del usuario
export async function GET() {
  try {
    const { user } = await getCurrentUser()
    const supabase = await createServerClient()

    if (!hasPermission(user.role as UserRole, "accounting", "read")) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
    }

    // Obtener agency_id del usuario
    const { data: userAgency } = await supabase
      .from("user_agencies")
      .select("agency_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle()

    if (!userAgency?.agency_id) {
      return NextResponse.json({ error: "Usuario sin agencia" }, { status: 400 })
    }

    // Buscar config AFIP activa
    const { data: config } = await supabase
      .from("afip_config")
      .select("*")
      .eq("agency_id", userAgency.agency_id)
      .eq("is_active", true)
      .maybeSingle()

    return NextResponse.json({
      config: config || null,
      agency_id: userAgency.agency_id,
    })
  } catch (error: any) {
    console.error("[api/afip/config GET]", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

// POST: Configurar conexión AFIP (ejecuta automations del SDK)
export async function POST(request: Request) {
  try {
    const { user } = await getCurrentUser()

    if (!hasPermission(user.role as UserRole, "settings", "write")) {
      return NextResponse.json({ error: "Sin permisos para configurar" }, { status: 403 })
    }

    const body = await request.json()
    const { cuit, username, password, punto_venta } = body

    if (!cuit || !username || !password || !punto_venta) {
      return NextResponse.json(
        { error: "Completá todos los campos: CUIT, usuario ARCA, contraseña y punto de venta" },
        { status: 400 }
      )
    }

    const cuitNum = Number(cuit)
    if (isNaN(cuitNum) || String(cuit).length !== 11) {
      return NextResponse.json({ error: "El CUIT debe tener 11 dígitos" }, { status: 400 })
    }

    const ptoVta = Number(punto_venta)
    if (isNaN(ptoVta) || ptoVta < 1) {
      return NextResponse.json({ error: "Punto de venta inválido" }, { status: 400 })
    }

    // Obtener agency_id
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

    // Ejecutar automations del SDK
    const setupResult = await setupAfipCertificate(cuitNum, username, password)
    if (!setupResult.success) {
      return NextResponse.json(
        { error: `Error al configurar AFIP: ${setupResult.error}` },
        { status: 400 }
      )
    }

    // Probar conexión
    const testResult = await testAfipConnection(cuitNum, ptoVta)

    // Guardar/actualizar config usando admin client (para bypass RLS)
    const adminSupabase = createAdminSupabaseClient()

    // Desactivar configs previas de esta agencia
    await (adminSupabase as any)
      .from("afip_config")
      .update({ is_active: false })
      .eq("agency_id", userAgency.agency_id)

    // Insertar nueva config
    const { data: newConfig, error: insertError } = await (adminSupabase as any)
      .from("afip_config")
      .insert({
        agency_id: userAgency.agency_id,
        cuit: String(cuit),
        environment: "production",
        punto_venta: ptoVta,
        is_active: true,
        automation_status: testResult.connected ? "complete" : "failed",
      })
      .select()
      .single()

    if (insertError) {
      console.error("[api/afip/config POST] Insert error:", insertError)
      return NextResponse.json({ error: "Error al guardar configuración" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      config: newConfig,
      connection_test: testResult,
    })
  } catch (error: any) {
    console.error("[api/afip/config POST]", error)
    return NextResponse.json(
      { error: error?.message || "Error interno al configurar AFIP" },
      { status: 500 }
    )
  }
}

// DELETE: Desconectar AFIP (desactivar config)
export async function DELETE() {
  try {
    const { user } = await getCurrentUser()

    if (!hasPermission(user.role as UserRole, "settings", "write")) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
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

    const adminSupabase = createAdminSupabaseClient()
    await (adminSupabase as any)
      .from("afip_config")
      .update({ is_active: false })
      .eq("agency_id", userAgency.agency_id)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[api/afip/config DELETE]", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
