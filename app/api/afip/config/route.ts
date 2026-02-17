import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { createServerClient } from "@/lib/supabase/server"
import { createAdminSupabaseClient } from "@/lib/supabase/admin"
import { testAfipConnection, startCertAutomation } from "@/lib/afip/client"
import { hasPermission, type UserRole } from "@/lib/permissions"

// Vercel serverless: permitir hasta 25s (free tier max 60s, dejamos margen)
export const maxDuration = 25

// GET: Obtener configuración AFIP de la agencia del usuario
export async function GET() {
  try {
    const { user } = await getCurrentUser()
    const supabase = await createServerClient()

    if (!hasPermission(user.role as UserRole, "accounting", "read")) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
    }

    const { data: userAgency } = await supabase
      .from("user_agencies")
      .select("agency_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle()

    if (!userAgency?.agency_id) {
      return NextResponse.json({ error: "Usuario sin agencia" }, { status: 400 })
    }

    const { data: config } = await supabase
      .from("afip_config")
      .select("*")
      .eq("agency_id", userAgency.agency_id)
      .eq("is_active", true)
      .maybeSingle()

    // No devolver cert/key/credenciales al frontend
    let safeConfig = null
    if (config) {
      const { temp_username, temp_password, afip_cert, afip_key, ...safe } = config
      safeConfig = {
        ...safe,
        has_cert: Boolean(afip_cert && afip_key),
        // Datos fiscales (pueden ser null si no se cargaron aún)
        razon_social: config.razon_social || null,
        domicilio_comercial: config.domicilio_comercial || null,
        condicion_iva: config.condicion_iva || null,
        inicio_actividades: config.inicio_actividades || null,
      }
    }

    return NextResponse.json({
      config: safeConfig,
      agency_id: userAgency.agency_id,
    })
  } catch (error: any) {
    console.error("[api/afip/config GET]", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

// POST: Guardar config AFIP
// - Con username/password: lanza automations asíncronas para crear certificado
// - Sin username/password: solo prueba conexión directa (cert ya existe)
export async function POST(request: Request) {
  try {
    const { user } = await getCurrentUser()

    if (!hasPermission(user.role as UserRole, "settings", "write")) {
      return NextResponse.json({ error: "Sin permisos para configurar" }, { status: 403 })
    }

    const body = await request.json()
    const { cuit, punto_venta, username, password } = body

    if (!cuit || !punto_venta) {
      return NextResponse.json(
        { error: "Completá CUIT y punto de venta" },
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

    const adminSupabase = createAdminSupabaseClient()

    // Desactivar configs previas
    await (adminSupabase as any)
      .from("afip_config")
      .update({ is_active: false })
      .eq("agency_id", userAgency.agency_id)

    const hasCredentials = username && password

    if (hasCredentials) {
      // === MODO CERTIFICADO: Lanzar SOLO cert automation (WSFE se lanza después) ===
      const certResult = await startCertAutomation(cuitNum, username, password)

      if (!certResult.success) {
        return NextResponse.json(
          { error: certResult.error || "Error al iniciar creación de certificado" },
          { status: 500 }
        )
      }

      // Guardar config con cert automation ID + credenciales temporales para WSFE posterior
      // Las credenciales se borran del registro cuando el setup completa
      const { data: newConfig, error: insertError } = await (adminSupabase as any)
        .from("afip_config")
        .insert({
          agency_id: userAgency.agency_id,
          cuit: String(cuit),
          environment: "production",
          punto_venta: ptoVta,
          is_active: true,
          automation_status: "running",
          cert_automation_id: certResult.automationId || null,
          wsfe_automation_id: null,
          // Credenciales temporales — se borran cuando el setup completa
          temp_username: username,
          temp_password: password,
        })
        .select()
        .single()

      if (insertError) {
        console.error("[api/afip/config POST] Insert error:", insertError)
        return NextResponse.json({ error: "Error al guardar configuración" }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        config: { ...newConfig, temp_username: undefined, temp_password: undefined },
        mode: "setup",
        message: "Configurando certificado AFIP. Esto puede tardar hasta 2 minutos...",
      })
    } else {
      // === MODO RÁPIDO: Solo test de conexión directa ===
      const { data: newConfig, error: insertError } = await (adminSupabase as any)
        .from("afip_config")
        .insert({
          agency_id: userAgency.agency_id,
          cuit: String(cuit),
          environment: "production",
          punto_venta: ptoVta,
          is_active: true,
          automation_status: "pending",
        })
        .select()
        .single()

      if (insertError) {
        console.error("[api/afip/config POST] Insert error:", insertError)
        return NextResponse.json({ error: "Error al guardar configuración" }, { status: 500 })
      }

      const testResult = await testAfipConnection(cuitNum, ptoVta)
      const finalStatus = testResult.connected ? "complete" : "failed"

      await (adminSupabase as any)
        .from("afip_config")
        .update({ automation_status: finalStatus })
        .eq("id", newConfig.id)

      newConfig.automation_status = finalStatus

      return NextResponse.json({
        success: true,
        config: newConfig,
        mode: "quick",
        connection_test: testResult,
      })
    }
  } catch (error: any) {
    console.error("[api/afip/config POST]", error)
    return NextResponse.json(
      { error: error?.message || "Error interno" },
      { status: 500 }
    )
  }
}

// DELETE: Desconectar AFIP
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
