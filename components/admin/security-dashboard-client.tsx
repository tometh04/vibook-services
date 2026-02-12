"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AlertTriangle, Shield, CheckCircle, XCircle, Clock, Eye, Loader2 } from "lucide-react"
import { FixIntegrityIssueDialog } from "./fix-integrity-issue-dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { useToast } from "@/hooks/use-toast"
import { SECURITY_SEVERITY_STYLES, SECURITY_CHECK_STATUS_STYLES } from "@/lib/design-tokens"

interface SecurityDashboardClientProps {
  alerts: Array<{
    id: string
    alert_type: string
    severity: string
    title: string
    description: string
    entity_type: string
    entity_id: string
    metadata: any
    created_at: string
  }>
  integrityChecks: Array<{
    id: string
    check_type: string
    status: string
    description: string
    affected_entities: any
    checked_at: string
  }>
  auditLogs: Array<{
    id: string
    action_type: string
    entity_type: string
    entity_id: string
    admin_email: string
    old_values: any
    new_values: any
    reason: string
    created_at: string
  }>
  stats: {
    totalAlerts: number
    criticalAlerts: number
    highAlerts: number
    mediumAlerts: number
    failedChecks: number
    warnings: number
  }
}

export function SecurityDashboardClient({
  alerts,
  integrityChecks,
  auditLogs,
  stats,
}: SecurityDashboardClientProps) {
  const { toast } = useToast()
  const [runningCheck, setRunningCheck] = useState(false)
  const [fixingIssues, setFixingIssues] = useState<Record<string, boolean>>({})
  const [fixDialogOpen, setFixDialogOpen] = useState(false)
  const [selectedCheck, setSelectedCheck] = useState<{
    checkType: string
    description: string
    affectedEntities: any
  } | null>(null)

  const runIntegrityCheck = async () => {
    setRunningCheck(true)
    try {
      const response = await fetch("/api/admin/security/run-integrity-check", {
        method: "POST",
      })

      if (!response.ok) {
        throw new Error("Error al ejecutar verificación")
      }

      toast({
        title: "Verificación completada",
        description: "Los resultados se actualizarán en breve",
      })

      // Recargar página después de 2 segundos
      setTimeout(() => {
        window.location.reload()
      }, 2000)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al ejecutar verificación",
        variant: "destructive",
      })
    } finally {
      setRunningCheck(false)
    }
  }

  const handleFixClick = (check: typeof integrityChecks[0]) => {
    setSelectedCheck({
      checkType: check.check_type,
      description: check.description,
      affectedEntities: check.affected_entities,
    })
    setFixDialogOpen(true)
  }

  const fixIntegrityIssue = async () => {
    if (!selectedCheck) return

    const { checkType, affectedEntities } = selectedCheck
    setFixingIssues((prev) => ({ ...prev, [checkType]: true }))
    
    try {
      const response = await fetch("/api/admin/security/fix-integrity-issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checkType,
          affectedEntities,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Error al corregir problema")
      }

      toast({
        title: "Problema corregido",
        description: data.message || `Se corrigieron ${data.fixedCount || 0} registros`,
      })

      // Recargar página después de 2 segundos
      setTimeout(() => {
        window.location.reload()
      }, 2000)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al corregir problema",
        variant: "destructive",
      })
      throw error // Re-throw para que el diálogo no se cierre
    } finally {
      setFixingIssues((prev) => ({ ...prev, [checkType]: false }))
    }
  }

  const canAutoFix = (checkType: string, status: string) => {
    // Solo se pueden corregir automáticamente FAIL y WARNING
    if (status !== "FAIL" && status !== "WARNING") return false
    
    // Tipos que se pueden corregir automáticamente
    const autoFixableTypes = [
      "ACTIVE_WITHOUT_PREAPPROVAL",
      "EXCESSIVE_TRIAL_EXTENSIONS",
      "USAGE_METRICS_NEGATIVE",
    ]
    
    return autoFixableTypes.includes(checkType)
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            Seguridad
          </div>
          <h1 className="mt-3 text-3xl font-semibold text-foreground">Dashboard de seguridad</h1>
          <p className="mt-1 text-muted-foreground">Monitoreo y gestion de riesgos del sistema.</p>
        </div>
        <Button onClick={runIntegrityCheck} disabled={runningCheck} className="h-10 px-4">
          {runningCheck ? "Ejecutando..." : "Ejecutar verificacion"}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "Alertas activas",
            value: stats.totalAlerts,
            description: `${stats.criticalAlerts} criticas · ${stats.highAlerts} altas`,
            icon: AlertTriangle,
            tone: "bg-amber-100/80 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
          },
          {
            label: "Verificaciones fallidas",
            value: stats.failedChecks,
            description: `${stats.warnings} advertencias`,
            icon: XCircle,
            tone: "bg-rose-100/80 text-rose-600 dark:bg-rose-500/20 dark:text-rose-300",
          },
          {
            label: "Alertas criticas",
            value: stats.criticalAlerts,
            description: "Requieren accion inmediata",
            icon: Shield,
            tone: "bg-orange-100/80 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300",
          },
          {
            label: "Estado del sistema",
            value: stats.failedChecks === 0 && stats.criticalAlerts === 0 ? "Seguro" : "Revisar",
            description: `Ultima verificacion: ${integrityChecks.length > 0 && integrityChecks[0]?.checked_at ? format(new Date(integrityChecks[0].checked_at), "dd/MM/yyyy HH:mm", { locale: es }) : "Nunca"}`,
            icon: CheckCircle,
            tone: "bg-emerald-100/80 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300",
          },
        ].map((card) => {
          const Icon = card.icon
          return (
            <Card key={card.label} className="border-border/60 bg-card/80">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{card.label}</CardTitle>
                <div className={`flex h-9 w-9 items-center justify-center rounded-full ${card.tone}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold text-foreground">{card.value}</div>
                <p className="text-xs text-muted-foreground">{card.description}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card className="border-border/60 bg-card/80 shadow-[0_18px_45px_-30px_rgba(15,23,42,0.35)]">
        <CardHeader>
          <CardTitle>Alertas de seguridad</CardTitle>
          <CardDescription>Alertas activas que requieren atencion</CardDescription>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No hay alertas activas
            </p>
          ) : (
            <div className="rounded-2xl border border-border/60 bg-background/60">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead>Severidad</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Titulo</TableHead>
                    <TableHead>Descripcion</TableHead>
                    <TableHead>Fecha</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alerts.map((alert) => (
                    <TableRow key={alert.id} className="odd:bg-muted/20">
                      <TableCell>
                        <Badge variant="outline" className={SECURITY_SEVERITY_STYLES[alert.severity] || "border border-border text-muted-foreground"}>
                          {alert.severity}
                        </Badge>
                      </TableCell>
                      <TableCell>{alert.alert_type}</TableCell>
                      <TableCell className="font-medium">{alert.title}</TableCell>
                      <TableCell className="max-w-md truncate">{alert.description}</TableCell>
                      <TableCell>
                        {format(new Date(alert.created_at), "dd/MM/yyyy HH:mm", { locale: es })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Verificaciones de Integridad */}
      <Card className="border-border/60 bg-card/80 shadow-[0_18px_45px_-30px_rgba(15,23,42,0.35)]">
        <CardHeader>
          <CardTitle>Verificaciones de integridad</CardTitle>
          <CardDescription>Resultados de las ultimas verificaciones</CardDescription>
        </CardHeader>
        <CardContent>
          {integrityChecks.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No hay verificaciones ejecutadas aún
            </p>
          ) : (
            <div className="rounded-2xl border border-border/60 bg-background/60">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {integrityChecks.map((check) => (
                    <TableRow key={check.id} className="odd:bg-muted/20">
                      <TableCell>{check.check_type}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={SECURITY_CHECK_STATUS_STYLES[check.status] || "border border-border text-muted-foreground"}>
                          {check.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-md truncate">{check.description}</TableCell>
                      <TableCell>
                        {format(new Date(check.checked_at), "dd/MM/yyyy HH:mm", { locale: es })}
                      </TableCell>
                      <TableCell>
                        {canAutoFix(check.check_type, check.status) ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleFixClick(check)}
                            disabled={fixingIssues[check.check_type]}
                          >
                            {fixingIssues[check.check_type] ? (
                              <>
                                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                Corrigiendo...
                              </>
                            ) : (
                              "Corregir"
                            )}
                          </Button>
                        ) : check.status === "FAIL" || check.status === "WARNING" ? (
                          <span className="text-xs text-muted-foreground">
                            Requiere acción manual
                          </span>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Auditoría Admin */}
      <Card className="border-border/60 bg-card/80 shadow-[0_18px_45px_-30px_rgba(15,23,42,0.35)]">
        <CardHeader>
          <CardTitle>Auditoria de cambios</CardTitle>
          <CardDescription>Registro de cambios realizados por administradores</CardDescription>
        </CardHeader>
        <CardContent>
          {auditLogs.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No hay registros de auditoría
            </p>
          ) : (
            <div className="rounded-2xl border border-border/60 bg-background/60">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead>Acción</TableHead>
                    <TableHead>Entidad</TableHead>
                    <TableHead>Admin</TableHead>
                    <TableHead>Razón</TableHead>
                    <TableHead>Fecha</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLogs.map((log) => (
                    <TableRow key={log.id} className="odd:bg-muted/20">
                      <TableCell>{log.action_type}</TableCell>
                      <TableCell>{log.entity_type}</TableCell>
                      <TableCell>{log.admin_email || "N/A"}</TableCell>
                      <TableCell className="max-w-md truncate">{log.reason || "N/A"}</TableCell>
                      <TableCell>
                        {format(new Date(log.created_at), "dd/MM/yyyy HH:mm", { locale: es })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Diálogo de confirmación para corregir problemas */}
      {selectedCheck && (
        <FixIntegrityIssueDialog
          open={fixDialogOpen}
          onOpenChange={setFixDialogOpen}
          checkType={selectedCheck.checkType}
          description={selectedCheck.description}
          affectedEntities={selectedCheck.affectedEntities}
          onConfirm={fixIntegrityIssue}
        />
      )}
    </div>
  )
}
