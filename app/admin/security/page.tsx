import { createAdminSupabaseClient } from "@/lib/supabase/admin"
import { SecurityDashboardClient } from "@/components/admin/security-dashboard-client"

export default async function AdminSecurityPage() {
  const supabase = createAdminSupabaseClient()

  // Obtener alertas de seguridad no resueltas
  const { data: alerts } = await (supabase
    .from("security_alerts") as any)
    .select("*")
    .eq("resolved", false)
    .order("created_at", { ascending: false })
    .limit(50)

  // Obtener resultados de verificaciones de integridad recientes
  const { data: integrityChecks } = await (supabase
    .from("integrity_check_results") as any)
    .select("*")
    .order("checked_at", { ascending: false })
    .limit(20)

  // Obtener auditoría admin reciente
  const { data: auditLogs } = await (supabase
    .from("admin_audit_log") as any)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50)

  // Estadísticas de seguridad
  const { data: alertsStats } = await (supabase
    .from("security_alerts") as any)
    .select("severity, resolved")
    .eq("resolved", false)

  const stats = {
    totalAlerts: alerts?.length || 0,
    criticalAlerts: alertsStats?.filter((a: any) => a.severity === 'CRITICAL').length || 0,
    highAlerts: alertsStats?.filter((a: any) => a.severity === 'HIGH').length || 0,
    mediumAlerts: alertsStats?.filter((a: any) => a.severity === 'MEDIUM').length || 0,
    failedChecks: integrityChecks?.filter((c: any) => c.status === 'FAIL').length || 0,
    warnings: integrityChecks?.filter((c: any) => c.status === 'WARNING').length || 0,
  }

  return (
    <SecurityDashboardClient
      alerts={alerts || []}
      integrityChecks={integrityChecks || []}
      auditLogs={auditLogs || []}
      stats={stats}
    />
  )
}
