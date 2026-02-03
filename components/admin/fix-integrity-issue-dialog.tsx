"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, AlertTriangle } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface FixIntegrityIssueDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  checkType: string
  description: string
  affectedEntities: any
  onConfirm: () => Promise<void>
}

export function FixIntegrityIssueDialog({
  open,
  onOpenChange,
  checkType,
  description,
  affectedEntities,
  onConfirm,
}: FixIntegrityIssueDialogProps) {
  const [loading, setLoading] = useState(false)
  const [entitiesDetails, setEntitiesDetails] = useState<any[]>([])
  const [loadingDetails, setLoadingDetails] = useState(true)

  useEffect(() => {
    const loadEntitiesDetails = async () => {
      setLoadingDetails(true)
      try {
        // Obtener detalles de agencias y planes según el tipo de verificación
        const details: any[] = []

        if (checkType === "ACTIVE_WITHOUT_PREAPPROVAL") {
          // Obtener nombres de agencias
          const agencyIds = Array.from(
            new Set(affectedEntities.map((e: any) => e.agency_id).filter(Boolean))
          )

          const agenciesRes =
            agencyIds.length > 0
              ? await fetch(`/api/agencies?ids=${agencyIds.join(",")}`)
              : { json: () => Promise.resolve({ agencies: [] }) }

          const agenciesData = await agenciesRes.json()

          const agenciesMap = new Map(
            (agenciesData.agencies || []).map((a: any) => [a.id, a.name])
          )

          details.push(
            ...affectedEntities.map((entity: any) => ({
              ...entity,
              agency_name: agenciesMap.get(entity.agency_id) || "N/A",
              plan_name: entity.plan_name || "N/A", // Ya viene en el entity desde la función SQL
            }))
          )
        } else if (checkType === "EXCESSIVE_TRIAL_EXTENSIONS") {
          // Obtener nombres de agencias
          const agencyIds = Array.from(
            new Set(affectedEntities.map((e: any) => e.agency_id).filter(Boolean))
          )

          if (agencyIds.length > 0) {
            const agenciesRes = await fetch(`/api/agencies?ids=${agencyIds.join(",")}`)
            const agenciesData = await agenciesRes.json()
            const agenciesMap = new Map(
              (agenciesData.agencies || []).map((a: any) => [a.id, a.name])
            )

            details.push(
              ...affectedEntities.map((entity: any) => ({
                ...entity,
                agency_name: agenciesMap.get(entity.agency_id) || "N/A",
              }))
            )
          } else {
            details.push(...affectedEntities)
          }
        } else {
          details.push(...affectedEntities)
        }

        setEntitiesDetails(details)
      } catch (error) {
        console.error("Error loading entities details:", error)
        setEntitiesDetails(affectedEntities || [])
      } finally {
        setLoadingDetails(false)
      }
    }

    if (open && affectedEntities && Array.isArray(affectedEntities)) {
      loadEntitiesDetails()
    } else {
      setEntitiesDetails([])
      setLoadingDetails(false)
    }
  }, [open, affectedEntities, checkType])

  const handleConfirm = async () => {
    setLoading(true)
    try {
      await onConfirm()
      onOpenChange(false)
    } catch (error) {
      // El error ya se maneja en el componente padre
    } finally {
      setLoading(false)
    }
  }

  const getActionDescription = () => {
    switch (checkType) {
      case "ACTIVE_WITHOUT_PREAPPROVAL":
        return "Se suspenderán las siguientes suscripciones que están ACTIVE pero no tienen método de pago válido:"
      case "EXCESSIVE_TRIAL_EXTENSIONS":
        return "Se ajustarán las siguientes suscripciones con extensiones de trial excesivas a máximo 21 días:"
      case "USAGE_METRICS_NEGATIVE":
        return "Se corregirán los siguientes contadores negativos a 0:"
      default:
        return "Se aplicará la corrección a las siguientes entidades:"
    }
  }

  const getEntityDisplay = (entity: any) => {
    switch (checkType) {
      case "ACTIVE_WITHOUT_PREAPPROVAL":
        return (
          <div className="space-y-1">
            <div className="font-medium">
              Suscripción: {entity.subscription_id?.slice(0, 8) || "N/A"}
            </div>
            <div className="text-sm text-muted-foreground">
              Agencia: {entity.agency_name || entity.agency_id || "N/A"}
            </div>
            <div className="text-sm text-muted-foreground">
              Plan: {entity.plan_name || "N/A"}
            </div>
            <div className="text-sm text-muted-foreground">
              Estado actual: <Badge variant="outline">{entity.status || "ACTIVE"}</Badge>
            </div>
          </div>
        )
      case "EXCESSIVE_TRIAL_EXTENSIONS":
        return (
          <div className="space-y-1">
            <div className="font-medium">
              Suscripción: {entity.subscription_id?.slice(0, 8) || "N/A"}
            </div>
            <div className="text-sm text-muted-foreground">
              Agencia: {entity.agency_name || entity.agency_id || "N/A"}
            </div>
            <div className="text-sm text-muted-foreground">
              Extensiones: {entity.extension_count || 0}
            </div>
            <div className="text-sm text-muted-foreground">
              Días totales: {entity.total_days || 0} días
            </div>
            {entity.trial_start && (
              <div className="text-sm text-muted-foreground">
                Trial actual: {format(new Date(entity.trial_start), "dd/MM/yyyy", { locale: es })} -{" "}
                {entity.trial_end
                  ? format(new Date(entity.trial_end), "dd/MM/yyyy", { locale: es })
                  : "N/A"}
              </div>
            )}
          </div>
        )
      case "USAGE_METRICS_NEGATIVE":
        return (
          <div className="space-y-1">
            <div className="font-medium">Métrica ID: {entity.id?.slice(0, 8) || "N/A"}</div>
            <div className="text-sm text-muted-foreground">
              Operaciones: {entity.operations_count || 0} → 0
            </div>
            <div className="text-sm text-muted-foreground">
              Leads: {entity.leads_count || 0} → 0
            </div>
          </div>
        )
      default:
        return <div className="text-sm">{JSON.stringify(entity, null, 2)}</div>
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto border-border/60 bg-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Confirmar Corrección de Problema
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              {getActionDescription()}
            </p>
          </div>

          {loadingDetails ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">
                Cargando detalles...
              </span>
            </div>
          ) : entitiesDetails.length > 0 ? (
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {entitiesDetails.map((entity, index) => (
                <div
                  key={index}
                  className="rounded-lg border border-border/60 bg-muted/30 p-3"
                >
                  {getEntityDisplay(entity)}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No se encontraron detalles de las entidades afectadas
            </div>
          )}

          <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-4">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Total de entidades a corregir:</strong> {entitiesDetails.length || affectedEntities?.length || 0}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={loading || loadingDetails}
            className="bg-amber-600 text-white hover:bg-amber-700"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Corrigiendo...
              </>
            ) : (
              "Confirmar y Corregir"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
