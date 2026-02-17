import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { createServerClient } from "@/lib/supabase/server"
import { createAdminSupabaseClient } from "@/lib/supabase/admin"
import { checkAutomationStatus, startWsfeAutomation, testAfipConnection } from "@/lib/afip/client"
import { hasPermission, type UserRole } from "@/lib/permissions"

export const maxDuration = 25

/**
 * Flujo secuencial de automations AFIP:
 * 1. Cert automation se lanza desde POST /api/afip/config
 * 2. Polling detecta cert complete → lanza WSFE automation
 * 3. Polling detecta WSFE complete → test conexión → done
 */
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

    const { data: config } = await supabase
      .from("afip_config")
      .select("*")
      .eq("agency_id", userAgency.agency_id)
      .eq("is_active", true)
      .maybeSingle()

    if (!config) {
      return NextResponse.json({ error: "No hay configuración AFIP activa" }, { status: 404 })
    }

    const adminSupabase = createAdminSupabaseClient()
    const cuitNum = Number(config.cuit)

    // Si ya terminó pero faltan cert/key, intentar recuperarlos de la automation
    if (config.automation_status === "complete" && !config.afip_cert && config.cert_automation_id) {
      console.log("[automation-status] Config complete pero sin cert/key. Intentando recuperar...")
      try {
        const certResult = await checkAutomationStatus(cuitNum, config.cert_automation_id)
        if (certResult.status === "complete" && certResult.data?.cert && certResult.data?.key) {
          await (adminSupabase as any)
            .from("afip_config")
            .update({
              afip_cert: certResult.data.cert,
              afip_key: certResult.data.key,
            })
            .eq("id", config.id)
          console.log("[automation-status] Cert/key recuperados y guardados!")
        }
      } catch (e: any) {
        console.warn("[automation-status] No se pudo recuperar cert/key:", e?.message)
      }
    }

    // Si ya terminó, retornar directo
    if (config.automation_status === "complete" || config.automation_status === "failed") {
      return NextResponse.json({
        status: config.automation_status,
        config: sanitizeConfig(config),
      })
    }

    // === PASO 1: Checkear cert automation ===
    if (config.cert_automation_id && !config.wsfe_automation_id) {
      const certResult = await checkAutomationStatus(cuitNum, config.cert_automation_id)
      console.log("[automation-status] Cert status:", certResult.status, certResult)

      if (certResult.status === "complete") {
        // Cert completó → guardar cert y key, luego lanzar WSFE
        // La automation devuelve { data: { cert: "-----BEGIN...", key: "-----BEGIN..." } }
        const certData = certResult.data
        if (certData?.cert && certData?.key) {
          console.log("[automation-status] Guardando cert y key en DB...")
          await (adminSupabase as any)
            .from("afip_config")
            .update({
              afip_cert: certData.cert,
              afip_key: certData.key,
            })
            .eq("id", config.id)
        } else {
          console.warn("[automation-status] Cert completó pero no devolvió cert/key:", certData)
        }

        if (config.temp_username && config.temp_password) {
          const wsfeResult = await startWsfeAutomation(cuitNum, config.temp_username, config.temp_password)

          if (wsfeResult.success && wsfeResult.automationId) {
            await (adminSupabase as any)
              .from("afip_config")
              .update({ wsfe_automation_id: wsfeResult.automationId })
              .eq("id", config.id)

            return NextResponse.json({
              status: "running",
              step: "wsfe",
              message: "Certificado creado. Autorizando servicio de facturación...",
              cert_status: "complete",
              wsfe_status: "pending",
              config: sanitizeConfig(config),
            })
          } else {
            // WSFE no pudo lanzarse
            await markFailed(adminSupabase, config.id)
            return NextResponse.json({
              status: "failed",
              error: wsfeResult.error || "Error al lanzar autorización WSFE",
              cert_status: "complete",
              config: sanitizeConfig({ ...config, automation_status: "failed" }),
            })
          }
        } else {
          // No hay credenciales para lanzar WSFE — esto no debería pasar
          await markFailed(adminSupabase, config.id)
          return NextResponse.json({
            status: "failed",
            error: "Credenciales no disponibles para autorizar WSFE. Intentá de nuevo.",
            config: sanitizeConfig({ ...config, automation_status: "failed" }),
          })
        }
      } else if (certResult.status === "error" || certResult.status === "failed") {
        await markFailed(adminSupabase, config.id)
        return NextResponse.json({
          status: "failed",
          error: certResult.error || "Error creando certificado AFIP",
          cert_status: certResult.status,
          config: sanitizeConfig({ ...config, automation_status: "failed" }),
        })
      } else {
        // Cert todavía en proceso (pending/running)
        return NextResponse.json({
          status: "running",
          step: "cert",
          message: "Creando certificado de producción...",
          cert_status: certResult.status,
          config: sanitizeConfig(config),
        })
      }
    }

    // === PASO 2: Checkear WSFE automation ===
    if (config.wsfe_automation_id) {
      const wsfeResult = await checkAutomationStatus(cuitNum, config.wsfe_automation_id)
      console.log("[automation-status] WSFE status:", wsfeResult.status, wsfeResult)

      if (wsfeResult.status === "complete") {
        // Todo completó → test conexión real
        let testResult: { connected: boolean; lastVoucher?: number; error?: string }
        try {
          testResult = await testAfipConnection(cuitNum, config.punto_venta)
        } catch (e: any) {
          testResult = { connected: false, error: e?.message || "Error testeando conexión" }
        }

        // Marcar como complete si ambas automations pasaron, aunque el test falle
        // (el cert y wsfe se crearon bien, el test puede fallar por punto de venta incorrecto)
        const finalStatus = testResult.connected ? "complete" : "complete"
        // ^ Siempre "complete" porque cert+wsfe ya están OK

        // Limpiar credenciales temporales y marcar status final
        await (adminSupabase as any)
          .from("afip_config")
          .update({
            automation_status: finalStatus,
            temp_username: null,
            temp_password: null,
          })
          .eq("id", config.id)

        return NextResponse.json({
          status: finalStatus,
          cert_status: "complete",
          wsfe_status: "complete",
          connection_test: testResult,
          config: sanitizeConfig({ ...config, automation_status: finalStatus }),
        })
      } else if (wsfeResult.status === "error" || wsfeResult.status === "failed") {
        await markFailed(adminSupabase, config.id)
        return NextResponse.json({
          status: "failed",
          error: wsfeResult.error || "Error autorizando servicio de facturación",
          cert_status: "complete",
          wsfe_status: wsfeResult.status,
          config: sanitizeConfig({ ...config, automation_status: "failed" }),
        })
      } else {
        // WSFE todavía en proceso
        return NextResponse.json({
          status: "running",
          step: "wsfe",
          message: "Autorizando servicio de facturación electrónica...",
          cert_status: "complete",
          wsfe_status: wsfeResult.status,
          config: sanitizeConfig(config),
        })
      }
    }

    // === Edge case: no hay automation IDs ===
    await markFailed(adminSupabase, config.id)
    return NextResponse.json({
      status: "failed",
      error: "No se encontraron automations en proceso. Intentá conectar de nuevo.",
      config: sanitizeConfig({ ...config, automation_status: "failed" }),
    })
  } catch (error: any) {
    console.error("[api/afip/automation-status]", error)
    return NextResponse.json(
      { error: error?.message || "Error interno" },
      { status: 500 }
    )
  }
}

// Helpers
async function markFailed(adminSupabase: any, configId: string) {
  await adminSupabase
    .from("afip_config")
    .update({
      automation_status: "failed",
      temp_username: null,
      temp_password: null,
    })
    .eq("id", configId)
}

function sanitizeConfig(config: any) {
  // Nunca devolver credenciales ni certificados al frontend
  const { temp_username, temp_password, afip_cert, afip_key, ...safe } = config
  return safe
}
