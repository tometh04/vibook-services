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
    const { user } = await getCurrentUser()
    
    // Solo SUPER_ADMIN puede resolver problemas de integridad
    if (user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "No tiene permiso para resolver problemas de integridad" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { checkType, affectedEntities } = body

    if (!checkType) {
      return NextResponse.json(
        { error: "Tipo de verificación requerido" },
        { status: 400 }
      )
    }

    const supabase = await createServerClient()

    let fixedCount = 0
    let errors: string[] = []

    switch (checkType) {
      case "ACTIVE_WITHOUT_PREAPPROVAL":
        // Para suscripciones ACTIVE sin preapproval, las marcamos como SUSPENDED
        // ya que no tienen un método de pago válido
        if (affectedEntities && Array.isArray(affectedEntities) && affectedEntities.length > 0) {
          for (const sub of affectedEntities) {
            try {
              if (!sub.subscription_id) {
                errors.push(`Entidad sin subscription_id: ${JSON.stringify(sub)}`)
                continue
              }

              const { error } = await (supabase.from("subscriptions") as any)
                .update({
                  status: "SUSPENDED",
                  suspended_reason: "Suscripción sin método de pago válido detectada por verificación de integridad",
                  suspended_at: new Date().toISOString(),
                  updated_by: user.id,
                })
                .eq("id", sub.subscription_id)

              if (error) {
                errors.push(`Error al suspender suscripción ${sub.subscription_id}: ${error.message}`)
              } else {
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
                  console.warn("Error creando alerta de seguridad:", alertError)
                  // No fallar si no se puede crear la alerta
                }
              }
            } catch (err: any) {
              errors.push(`Error procesando suscripción ${sub.subscription_id || "desconocida"}: ${err.message}`)
            }
          }
        } else {
          return NextResponse.json(
            { error: "No hay entidades afectadas para corregir" },
            { status: 400 }
          )
        }
        break

      case "EXCESSIVE_TRIAL_EXTENSIONS":
        // Para extensiones excesivas, ajustamos el trial_end a máximo 21 días desde trial_start
        if (affectedEntities && Array.isArray(affectedEntities) && affectedEntities.length > 0) {
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
                  updated_by: user.id,
                })
                .eq("id", sub.subscription_id)

              if (error) {
                errors.push(`Error al ajustar trial de suscripción ${sub.subscription_id}: ${error.message}`)
              } else {
                fixedCount++
                
                // Registrar evento de billing (opcional, no crítico)
                try {
                  await (supabase.from("billing_events") as any).insert({
                    subscription_id: sub.subscription_id,
                    event_type: "TRIAL_ADJUSTED_BY_ADMIN",
                    description: `Trial ajustado automáticamente a 21 días máximo por verificación de integridad`,
                    metadata: {
                      previous_trial_end: sub.trial_end,
                      new_trial_end: maxTrialEnd.toISOString(),
                      adjusted_by: user.id,
                    },
                  })
                } catch (eventError: any) {
                  console.warn("Error creando billing event:", eventError)
                  // No fallar si no se puede crear el evento
                }
              }
            } catch (err: any) {
              errors.push(`Error procesando suscripción ${sub.subscription_id || "desconocida"}: ${err.message}`)
            }
          }
        } else {
          return NextResponse.json(
            { error: "No hay entidades afectadas para corregir" },
            { status: 400 }
          )
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
                  leads_count: Math.max(0, metric.leads_count || 0),
                  updated_by: user.id,
                })
                .eq("id", metric.id)

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

    // Ejecutar verificación nuevamente para actualizar resultados (opcional, no crítico)
    try {
      await (supabase.rpc("run_all_integrity_checks") as any)
    } catch (rpcError: any) {
      console.warn("Error ejecutando run_all_integrity_checks después de corregir:", rpcError)
      // No fallar si el RPC falla, ya corregimos los problemas
    }

    return NextResponse.json({
      success: true,
      fixedCount,
      errors: errors.length > 0 ? errors : undefined,
      message: `Se corrigieron ${fixedCount} ${checkType === "ACTIVE_WITHOUT_PREAPPROVAL" ? "suscripciones" : "registros"}`,
    })
  } catch (error: any) {
    console.error("Error in POST /api/admin/security/fix-integrity-issue:", error)
    return NextResponse.json(
      { error: error.message || "Error al resolver problema de integridad" },
      { status: 500 }
    )
  }
}
