"use client"

import { useState, useEffect, useCallback } from "react"
import { Loader2, Plus, FileText, AlertCircle, Settings, Eye, ShieldCheck, CheckCircle2, XCircle } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

import { NewInvoiceDialog } from "@/components/accounting/new-invoice-dialog"

interface Invoice {
  id: string
  cbte_tipo: number
  pto_vta: number
  cbte_nro: number | null
  cae: string | null
  receptor_nombre: string
  imp_total: number
  moneda: string
  status: string
  fecha_emision: string | null
  operation_id: string | null
  notes: string | null
  created_at: string
}

interface InvoicingPageClientProps {
  agencies: Array<{ id: string; name: string }>
}

const STATUS_LABELS: Record<string, { label: string; variant: any }> = {
  authorized: { label: "Autorizada", variant: "success-soft" },
  rejected: { label: "Rechazada", variant: "destructive-soft" },
  draft: { label: "Borrador", variant: "secondary" },
  pending: { label: "Pendiente", variant: "warning-soft" },
  cancelled: { label: "Anulada", variant: "outline" },
}

export function InvoicingPageClient({ agencies }: InvoicingPageClientProps) {
  const [afipStatus, setAfipStatus] = useState<{
    configured: boolean
    cuit?: string
    punto_venta?: number
  } | null>(null)
  const [checkingAfip, setCheckingAfip] = useState(true)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)

  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [verifying, setVerifying] = useState(false)
  const [verifyResult, setVerifyResult] = useState<{
    exists: boolean
    voucherInfo?: any
    message?: string
    error?: string
  } | null>(null)

  // Filtros
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

  const fetchInvoices = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== "ALL") params.set("status", statusFilter)
      if (dateFrom) params.set("dateFrom", dateFrom)
      if (dateTo) params.set("dateTo", dateTo)

      const res = await fetch(`/api/invoices?${params.toString()}`)
      const data = await res.json()
      setInvoices(data.invoices || [])
    } catch (error) {
      console.error("Error fetching invoices:", error)
    } finally {
      setLoading(false)
    }
  }, [statusFilter, dateFrom, dateTo])

  // Check AFIP status on mount
  useEffect(() => {
    async function checkAfip() {
      try {
        const res = await fetch("/api/afip/status")
        const data = await res.json()
        setAfipStatus(data)
      } catch (error) {
        console.error("Error checking AFIP status:", error)
        setAfipStatus({ configured: false })
      } finally {
        setCheckingAfip(false)
      }
    }
    checkAfip()
  }, [])

  // Fetch invoices when AFIP is configured or filters change
  useEffect(() => {
    if (afipStatus?.configured) {
      fetchInvoices()
    }
  }, [fetchInvoices, afipStatus?.configured])

  // Loading state
  if (checkingAfip) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Facturación Electrónica</h1>
          <p className="text-muted-foreground">Emitir facturas a través de AFIP</p>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  // No AFIP configured
  if (!afipStatus?.configured) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Facturación Electrónica</h1>
          <p className="text-muted-foreground">Emitir facturas a través de AFIP</p>
        </div>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>AFIP no configurado</AlertTitle>
          <AlertDescription className="flex flex-col sm:flex-row sm:items-center gap-3 mt-2">
            <span>
              Para emitir facturas electrónicas, primero configurá la conexión con AFIP desde los ajustes del sistema.
            </span>
            <Link href="/settings?tab=afip">
              <Button variant="outline" size="sm" className="gap-1.5">
                <Settings className="h-4 w-4" />
                Ir a Configuración
              </Button>
            </Link>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // Formatted invoice number
  function formatInvoiceNumber(ptoVta: number, cbteNro: number | null): string {
    if (!cbteNro) return "-"
    return `${String(ptoVta).padStart(4, "0")}-${String(cbteNro).padStart(8, "0")}`
  }

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return "-"
    try {
      return new Date(dateStr).toLocaleDateString("es-AR")
    } catch {
      return dateStr
    }
  }

  function formatCurrency(amount: number, moneda: string): string {
    const symbol = moneda === "DOL" ? "USD" : "$"
    return `${symbol} ${amount.toLocaleString("es-AR", { minimumFractionDigits: 2 })}`
  }

  async function verifyInAfip(invoice: Invoice) {
    if (!invoice.cbte_nro || !invoice.pto_vta || !invoice.cbte_tipo) {
      toast.error("La factura no tiene datos de comprobante completos")
      return
    }

    try {
      setVerifying(true)
      setVerifyResult(null)

      const response = await fetch("/api/invoices/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cbteNro: invoice.cbte_nro,
          ptoVta: invoice.pto_vta,
          cbteTipo: invoice.cbte_tipo,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setVerifyResult({ exists: false, error: data.error })
        toast.error(data.error || "No se pudo consultar AFIP")
        return
      }

      setVerifyResult(data)

      if (data.exists) {
        toast.success(`CAE ${data.voucherInfo.CAE} confirmado en AFIP`)
      } else {
        toast.error(data.message || "El comprobante no fue encontrado en AFIP")
      }
    } catch (error: any) {
      setVerifyResult({ exists: false, error: error.message })
      toast.error(error.message || "Error al verificar en AFIP")
    } finally {
      setVerifying(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Facturación Electrónica</h1>
          <p className="text-muted-foreground">
            CUIT: {afipStatus.cuit} · Punto de Venta: {afipStatus.punto_venta}
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-1.5">
          <Plus className="h-4 w-4" />
          Nueva Factura
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos</SelectItem>
            <SelectItem value="authorized">Autorizadas</SelectItem>
            <SelectItem value="rejected">Rechazadas</SelectItem>
            <SelectItem value="draft">Borradores</SelectItem>
          </SelectContent>
        </Select>
        <Input
          type="date"
          placeholder="Desde"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="w-full sm:w-[160px]"
        />
        <Input
          type="date"
          placeholder="Hasta"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="w-full sm:w-[160px]"
        />
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : invoices.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium">Sin facturas</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Creá tu primera factura electrónica
          </p>
        </div>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nro</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead className="text-right">Importe</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>CAE</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((inv) => {
                const statusInfo = STATUS_LABELS[inv.status] || {
                  label: inv.status,
                  variant: "secondary",
                }
                return (
                  <TableRow key={inv.id}>
                    <TableCell className="font-mono text-sm">
                      {formatInvoiceNumber(inv.pto_vta, inv.cbte_nro)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDate(inv.fecha_emision)}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium text-sm">{inv.receptor_nombre}</div>
                        {inv.notes && (
                          <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {inv.notes}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium text-sm">
                      {formatCurrency(inv.imp_total, inv.moneda)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {inv.cae || "-"}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => { setSelectedInvoice(inv); setVerifyResult(null) }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Dialog nueva factura */}
      <NewInvoiceDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreated={fetchInvoices}
      />

      {/* Dialog detalle de factura */}
      <Dialog open={!!selectedInvoice} onOpenChange={() => { setSelectedInvoice(null); setVerifyResult(null) }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Factura C {selectedInvoice?.cbte_nro
                ? formatInvoiceNumber(selectedInvoice.pto_vta, selectedInvoice.cbte_nro)
                : ""}
            </DialogTitle>
            <DialogDescription>Detalle del comprobante</DialogDescription>
          </DialogHeader>

          {selectedInvoice && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-muted-foreground">Cliente</Label>
                  <p className="font-medium">{selectedInvoice.receptor_nombre}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Fecha</Label>
                  <p>{formatDate(selectedInvoice.fecha_emision)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Importe</Label>
                  <p className="font-medium">{formatCurrency(selectedInvoice.imp_total, selectedInvoice.moneda)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Estado</Label>
                  <div className="mt-0.5">
                    <Badge variant={(STATUS_LABELS[selectedInvoice.status] || { variant: "secondary" }).variant}>
                      {(STATUS_LABELS[selectedInvoice.status] || { label: selectedInvoice.status }).label}
                    </Badge>
                  </div>
                </div>
              </div>

              {selectedInvoice.cae && (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="text-muted-foreground">CAE</Label>
                    <p className="font-mono text-xs">{selectedInvoice.cae}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Nro Comprobante</Label>
                    <p className="font-mono">{formatInvoiceNumber(selectedInvoice.pto_vta, selectedInvoice.cbte_nro)}</p>
                  </div>
                </div>
              )}

              {selectedInvoice.notes && (
                <div className="text-sm">
                  <Label className="text-muted-foreground">Descripción</Label>
                  <p>{selectedInvoice.notes}</p>
                </div>
              )}

              {/* Verificación AFIP */}
              {selectedInvoice.cae && (
                <div className="border-t pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-muted-foreground">Verificación AFIP</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => verifyInAfip(selectedInvoice)}
                      disabled={verifying}
                    >
                      {verifying ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Verificando...
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="mr-2 h-4 w-4" />
                          Verificar en AFIP
                        </>
                      )}
                    </Button>
                  </div>

                  {verifyResult && verifyResult.exists && (
                    <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800 p-4 space-y-2">
                      <div className="flex items-center gap-2 text-green-700 dark:text-green-400 font-medium">
                        <CheckCircle2 className="h-4 w-4" />
                        Comprobante verificado en AFIP
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">CAE:</span>{" "}
                          <span className="font-mono text-xs">{verifyResult.voucherInfo.CAE}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Vto. CAE:</span>{" "}
                          <span>{verifyResult.voucherInfo.CAEFchVto}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Resultado:</span>{" "}
                          <Badge variant={verifyResult.voucherInfo.Resultado === "A" ? "default" : "destructive"}>
                            {verifyResult.voucherInfo.Resultado === "A" ? "Aprobado" : "Rechazado"}
                          </Badge>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Importe:</span>{" "}
                          <span>$ {verifyResult.voucherInfo.ImpTotal}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {verifyResult && !verifyResult.exists && (
                    <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800 p-4">
                      <div className="flex items-center gap-2 text-red-700 dark:text-red-400 font-medium">
                        <XCircle className="h-4 w-4" />
                        {verifyResult.error || verifyResult.message || "Comprobante no encontrado en AFIP"}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => { setSelectedInvoice(null); setVerifyResult(null) }}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
