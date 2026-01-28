import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/auth"

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/security/fix-integrity-issue
 * Resuelve automáticamente problemas de integridad detectados
 */
export async function POST(request: Request) {
  try {
    console.log("[fix-integrity-issue] Iniciando request...")
    
    const { user } = await getCurrentUser()
    console.log("[fix-integrity-issue] Usuario obtenido:", { id: user.id, role: user.role, email: user.email })
    
    // Solo SUPER_ADMIN puede resolver problemas de integridad
    if (user.role !== "SUPER_ADMIN") {
      console.log("[fix-integrity-issue] Usuario no es SUPER_ADMIN:", user.role)
      return NextResponse.json(
        { error: "No tiene permiso para resolver problemas de integridad" },
        { status: 403 }
      )
    }

    const body = await request.json()
    console.log("[fix-integrity-issue] Body recibido:", { 
      checkType: body.checkType, 
      affectedEntitiesCount: body.affectedEntities?.length || 0 
    })
    
    const { checkType, affectedEntities } = body

    if (!checkType) {
      console.log("[fix-integrity-issue] checkType faltante")
      return NextResponse.json(
        { error: "Tipo de verificación requerido" },
        { status: 400 }
      )
    }

    if (!affectedEntities || !Array.isArray(affectedEntities) || affectedEntities.length === 0) {
      console.log("[fix-integrity-issue] affectedEntities inválido o vacío")
      return NextResponse.json(
        { error: "No hay entidades afectadas para corregir" },
        { status: 400 }
      )
    }

    const supabase = await createServerClient()
    console.log("[fix-integrity-issue] Cliente Supabase creado")

    let fixedCount = 0
    let errors: string[] = []

    switch (checkType) {
      case "ACTIVE_WITHOUT_PREAPPROVAL":
        // Para suscripciones ACTIVE sin preapproval, las marcamos como SUSPENDED
        // ya que no tienen un método de pago válido
        console.log(`[fix-integrity-issue] Procesando ${affectedEntities.length} suscripciones sin preapproval`)
        
        for (const sub of affectedEntities) {
          try {
            if (!sub.subscription_id) {
              console.warn("[fix-integrity-issue] Entidad sin subscription_id:", sub)
              errors.push(`Entidad sin subscription_id: ${JSON.stringify(sub)}`)
              continue
            }

            console.log(`[fix-integrity-issue] Suspendiéndo suscripción ${sub.subscription_id}`)
            
            // Actualizar solo status a SUSPENDED (las columnas suspended_reason y suspended_at no existen)
            const { data: updateData, error } = await (supabase.from("subscriptions") as any)
              .update({
                status: "SUSPENDED",
                updated_at: new Date().toISOString(),
              })
              .eq("id", sub.subscription_id)
              .select()

              if (error) {
                console.error(`[fix-integrity-issue] Error al suspender suscripción ${sub.subscription_id}:`, error)
                errors.push(`Error al suspender suscripción ${sub.subscription_id}: ${error.message || JSON.stringify(error)}`)
              } else {
                console.log(`[fix-integrity-issue] Suscripción ${sub.subscription_id} suspendida exitosamente`)
                fixedCount++
                
                // Crear alerta de seguridad para registro (opcional, no crítico)
                try {
                  await (supabase.from("security_alerts") as any).insert({
                    alert_type: "SUBSCRIPTION_SUSPENDED_BY_INTEGRITY_CHECK",
                    severity: "HIGH",
                    title: "Suscripción suspendida automáticamente",
                    description: `Suscripción ${sub.subscription_id} suspendida por falta de método de pago válido`,
                    entity_type: "subscription",
                    entity_id: sub.subscription_id,
                    metadata: {
                      previous_status: "ACTIVE",
                      reason: "Sin mp_preapproval_id válido",
                      fixed_by: user.id,
                      fixed_at: new Date().toISOString(),
                    },
                  })
                } catch (alertError: any) {
                  console.warn("[fix-integrity-issue] Error creando alerta de seguridad:", alertError)
                  // No fallar si no se puede crear la alerta
                }
              }
            } catch (err: any) {
              console.error(`[fix-integrity-issue] Excepción procesando suscripción ${sub.subscription_id || "desconocida"}:`, err)
              errors.push(`Error procesando suscripción ${sub.subscription_id || "desconocida"}: ${err.message}`)
            }
          }
        break

      case "EXCESSIVE_TRIAL_EXTENSIONS":
        // Para extensiones excesivas, ajustamos el trial_end a máximo 21 días desde trial_start
        console.log(`[fix-integrity-issue] Procesando ${affectedEntities.length} suscripciones con extensiones excesivas`)
        
        for (const sub of affectedEntities) {
            try {
              if (!sub.subscription_id) {
                errors.push(`Entidad sin subscription_id: ${JSON.stringify(sub)}`)
                continue
              }

              if (!sub.trial_start) {
                errors.push(`Suscripción ${sub.subscription_id} sin trial_start`)
                continue
              }

              const trialStart = new Date(sub.trial_start)
              if (isNaN(trialStart.getTime())) {
                errors.push(`Fecha trial_start inválida para suscripción ${sub.subscription_id}`)
                continue
              }

              const maxTrialEnd = new Date(trialStart)
              maxTrialEnd.setDate(maxTrialEnd.getDate() + 21)

              const { error } = await (supabase.from("subscriptions") as any)
                .update({
                  trial_end: maxTrialEnd.toISOString(),
                  updated_at: new Date().toISOString(),
                })
                .eq("id", sub.subscription_id)

              if (error) {
                errors.push(`Error al ajustar trial de suscripción ${sub.subscription_id}: ${error.message}`)
              } else {
                fixedCount++
                
                // Registrar evento de billing (opcional, no crítico)
                try {
                  await (supabase.from("billing_events") as any).insert({
                    agency_id: sub.agency_id,
                    subscription_id: sub.subscription_id,
                    event_type: "TRIAL_EXTENDED_BY_ADMIN",
                    metadata: {
                      previous_trial_end: sub.trial_end,
                      new_trial_end: maxTrialEnd.toISOString(),
                      adjusted_by: user.id,
                      reason: "Auto-adjusted by integrity check to max 21 days",
                    },
                  })
                } catch (eventError: any) {
                  console.warn("Error creando billing event:", eventError)
                  // No fallar si no se puede crear el evento
                }
              }
            } catch (err: any) {
              console.error(`[fix-integrity-issue] Excepción procesando suscripción ${sub.subscription_id || "desconocida"}:`, err)
              errors.push(`Error procesando suscripción ${sub.subscription_id || "desconocida"}: ${err.message}`)
            }
          }
        break

      case "MULTIPLE_TRIALS_PER_USER":
        // Para múltiples trials, no hacemos nada automático (requiere decisión manual)
        return NextResponse.json({
          success: false,
          message: "Este problema requiere resolución manual. Contacte al administrador.",
        })

      case "USAGE_METRICS_NEGATIVE":
        // Para métricas negativas, las corregimos a 0
        if (affectedEntities && Array.isArray(affectedEntities)) {
          for (const metric of affectedEntities) {
            try {
              const { error } = await (supabase.from("usage_metrics") as any)
                .update({
                  operations_count: Math.max(0, metric.operations_count || 0),
                  users_count: Math.max(0, metric.users_count || 0),
                  integrations_count: Math.max(0, metric.integrations_count || 0),
                  updated_at: new Date().toISOString(),
                })
                .eq("agency_id", metric.agency_id)
                .eq("period_start", metric.period_start)

              if (error) {
                errors.push(`Error al corregir métrica ${metric.id}: ${error.message}`)
              } else {
                fixedCount++
              }
            } catch (err: any) {
              errors.push(`Error procesando métrica ${metric.id}: ${err.message}`)
            }
          }
        }
        break

      default:
        return NextResponse.json(
          { error: `Tipo de verificación no soportado: ${checkType}` },
          { status: 400 }
        )
    }

    console.log(`[fix-integrity-issue] Corrección completada: ${fixedCount} corregidos, ${errors.length} errores`)

    // Ejecutar verificación nuevamente para actualizar resultados (opcional, no crítico)
    try {
      console.log("[fix-integrity-issue] Ejecutando run_all_integrity_checks...")
      await (supabase.rpc("run_all_integrity_checks") as any)
      console.log("[fix-integrity-issue] run_all_integrity_checks completado")
    } catch (rpcError: any) {
      console.warn("[fix-integrity-issue] Error ejecutando run_all_integrity_checks después de corregir:", rpcError)
      // No fallar si el RPC falla, ya corregimos los problemas
    }

    const response = {
      success: true,
      fixedCount,
      errors: errors.length > 0 ? errors : undefined,
      message: `Se corrigieron ${fixedCount} ${checkType === "ACTIVE_WITHOUT_PREAPPROVAL" ? "suscripciones" : "registros"}`,
    }
    
    console.log("[fix-integrity-issue] Retornando respuesta exitosa:", response)
    return NextResponse.json(response)
  } catch (error: any) {
    console.error("[fix-integrity-issue] ERROR CRÍTICO:", error)
    console.error("[fix-integrity-issue] Stack:", error.stack)
    return NextResponse.json(
      { 
        error: error.message || "Error al resolver problema de integridad",
        details: process.env.NODE_ENV === "development" ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}
