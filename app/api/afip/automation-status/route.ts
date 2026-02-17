import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { createServerClient } from "@/lib/supabase/server"
import { createAdminSupabaseClient } from "@/lib/supabase/admin"
import { checkAutomationStatus, testAfipConnection } from "@/lib/afip/client"
import { hasPermission, type UserRole } from "@/lib/permissions"

export const maxDuration = 25

// GET: Polling del estado de las automations AFIP
// El frontend llama cada 5s mientras automation_status === 'running'
export async function GET() {
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

    // Buscar config activa
    const { data: config } = await supabase
      .from("afip_config")
      .select("*")
      .eq("agency_id", userAgency.agency_id)
      .eq("is_active", true)
      .maybeSingle()

    if (!config) {
      return NextResponse.json({ error: "No hay configuración AFIP activa" }, { status: 404 })
    }

    // Si ya está completo o fallido, retornar directo
    if (config.automation_status === "complete" || config.automation_status === "failed") {
      return NextResponse.json({
        status: config.automation_status,
        config,
      })
    }

    // Si está en running, checkear las automations en el SDK
    const cuitNum = Number(config.cuit)
    let certStatus = "unknown"
    let wsfeStatus = "unknown"
    let certError: string | undefined
    let wsfeError: string | undefined

    if (config.cert_automation_id) {
      const certResult = await checkAutomationStatus(cuitNum, config.cert_automation_id)
      certStatus = certResult.status
      if (certResult.error) certError = certResult.error
    }

    if (config.wsfe_automation_id) {
      const wsfeResult = await checkAutomationStatus(cuitNum, config.wsfe_automation_id)
      wsfeStatus = wsfeResult.status
      if (wsfeResult.error) wsfeError = wsfeResult.error
    }

    // Determinar status final
    const adminSupabase = createAdminSupabaseClient()

    if (certStatus === "error" || wsfeStatus === "error") {
      // Alguna automation falló
      await (adminSupabase as any)
        .from("afip_config")
        .update({ automation_status: "failed" })
        .eq("id", config.id)

      return NextResponse.json({
        status: "failed",
        cert_status: certStatus,
        wsfe_status: wsfeStatus,
        error: certError || wsfeError || "Error en la configuración automática",
        config: { ...config, automation_status: "failed" },
      })
    }

    if (certStatus === "complete" && wsfeStatus === "complete") {
      // Ambas completaron → probar conexión real
      const testResult = await testAfipConnection(cuitNum, config.punto_venta)

      const finalStatus = testResult.connected ? "complete" : "failed"
      await (adminSupabase as any)
        .from("afip_config")
        .update({ automation_status: finalStatus })
        .eq("id", config.id)

      return NextResponse.json({
        status: finalStatus,
        cert_status: certStatus,
        wsfe_status: wsfeStatus,
        connection_test: testResult,
        config: { ...config, automation_status: finalStatus },
      })
    }

    // Todavía en proceso
    return NextResponse.json({
      status: "running",
      cert_status: certStatus,
      wsfe_status: wsfeStatus,
      config,
    })
  } catch (error: any) {
    console.error("[api/afip/automation-status]", error)
    return NextResponse.json(
      { error: error?.message || "Error interno" },
      { status: 500 }
    )
  }
}
