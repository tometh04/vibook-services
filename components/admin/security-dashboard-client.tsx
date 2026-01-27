"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AlertTriangle, Shield, CheckCircle, XCircle, Clock, Eye } from "lucide-react"
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

  const severityColors: Record<string, string> = {
    CRITICAL: "bg-red-500",
    HIGH: "bg-orange-500",
    MEDIUM: "bg-yellow-500",
    LOW: "bg-blue-500",
  }

  const statusColors: Record<string, string> = {
    PASS: "bg-green-500",
    FAIL: "bg-red-500",
    WARNING: "bg-yellow-500",
  }

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard de Seguridad</h1>
          <p className="text-muted-foreground">Monitoreo y gestión de seguridad del sistema</p>
        </div>
        <Button onClick={runIntegrityCheck} disabled={runningCheck}>
          {runningCheck ? "Ejecutando..." : "Ejecutar Verificación de Integridad"}
        </Button>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alertas Activas</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAlerts}</div>
            <p className="text-xs text-muted-foreground">
              {stats.criticalAlerts} críticas, {stats.highAlerts} altas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Verificaciones Fallidas</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{stats.failedChecks}</div>
            <p className="text-xs text-muted-foreground">
              {stats.warnings} advertencias
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alertas Críticas</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{stats.criticalAlerts}</div>
            <p className="text-xs text-muted-foreground">
              Requieren atención inmediata
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estado del Sistema</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {stats.failedChecks === 0 && stats.criticalAlerts === 0 ? "Seguro" : "Revisar"}
            </div>
            <p className="text-xs text-muted-foreground">
              Última verificación: {integrityChecks[0] ? format(new Date(integrityChecks[0].checked_at), "dd/MM/yyyy HH:mm", { locale: es }) : "Nunca"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alertas de Seguridad */}
      <Card>
        <CardHeader>
          <CardTitle>Alertas de Seguridad</CardTitle>
          <CardDescription>Alertas activas que requieren atención</CardDescription>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No hay alertas activas
            </p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Severidad</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Título</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Fecha</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alerts.map((alert) => (
                    <TableRow key={alert.id}>
                      <TableCell>
                        <Badge className={severityColors[alert.severity] || "bg-gray-500"}>
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
      <Card>
        <CardHeader>
          <CardTitle>Verificaciones de Integridad</CardTitle>
          <CardDescription>Resultados de las últimas verificaciones</CardDescription>
        </CardHeader>
        <CardContent>
          {integrityChecks.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No hay verificaciones ejecutadas aún
            </p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Fecha</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {integrityChecks.map((check) => (
                    <TableRow key={check.id}>
                      <TableCell>{check.check_type}</TableCell>
                      <TableCell>
                        <Badge className={statusColors[check.status] || "bg-gray-500"}>
                          {check.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-md truncate">{check.description}</TableCell>
                      <TableCell>
                        {format(new Date(check.checked_at), "dd/MM/yyyy HH:mm", { locale: es })}
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
      <Card>
        <CardHeader>
          <CardTitle>Auditoría de Cambios Admin</CardTitle>
          <CardDescription>Registro de cambios realizados por administradores</CardDescription>
        </CardHeader>
        <CardContent>
          {auditLogs.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No hay registros de auditoría
            </p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
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
                    <TableRow key={log.id}>
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
    </div>
  )
}
