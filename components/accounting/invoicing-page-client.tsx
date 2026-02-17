"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  FileText,
  Settings,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Receipt,
  DollarSign,
  Building2,
  HelpCircle,
} from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import Link from "next/link"

interface AfipConfig {
  id?: string
  agency_id?: string
  cuit: string
  environment: "sandbox" | "production"
  punto_venta: number
  is_active: boolean
  automation_status?: string
}

interface InvoicingPageClientProps {
  agencies: Array<{ id: string; name: string }>
  userRole: string
  afipConfig: AfipConfig | null
}

interface PendingInvoice {
  id: string
  file_code: string
  customer_id: string | null
  customer_name: string
  customer_doc_type: string | null
  customer_doc_number: string | null
  destination: string
  sale_amount_total: number
  sale_currency: string
  departure_date: string | null
  status: string
}

const CBTE_TIPOS = [
  { value: "6", label: "Factura B" },
  { value: "11", label: "Factura C" },
  { value: "1", label: "Factura A" },
] as const

const DOC_TIPOS = [
  { value: "80", label: "CUIT" },
  { value: "96", label: "DNI" },
  { value: "86", label: "CUIL" },
  { value: "99", label: "Otro" },
] as const

const CONDICION_IVA = [
  { value: "5", label: "Consumidor Final" },
  { value: "1", label: "Responsable Inscripto" },
  { value: "6", label: "Monotributista" },
  { value: "4", label: "Exento" },
] as const

export function InvoicingPageClient({ agencies, userRole, afipConfig: initialConfig }: InvoicingPageClientProps) {
  const [activeTab, setActiveTab] = useState("pending")
  const [loading, setLoading] = useState(false)
  const [pendingInvoices, setPendingInvoices] = useState<PendingInvoice[]>([])

  // Invoice dialog state
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false)
  const [selectedOp, setSelectedOp] = useState<PendingInvoice | null>(null)
  const [invoicing, setInvoicing] = useState(false)
  const [invoiceForm, setInvoiceForm] = useState({
    cbte_tipo: "6",
    doc_tipo: "96",
    doc_nro: "",
    receptor_nombre: "",
    condicion_iva: "5",
    concepto: "2", // Servicios (agencia de viajes)
    descripcion: "",
    iva_porcentaje: "21",
  })

  const config = initialConfig
  const isConfigured = !!(config?.cuit && config?.is_active && config?.automation_status === "complete")

  const fetchPendingInvoices = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/accounting/invoicing/pending")
      if (response.ok) {
        const data = await response.json()
        setPendingInvoices(data.operations || [])
      }
    } catch (error) {
      console.error("Error fetching pending invoices:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isConfigured) {
      fetchPendingInvoices()
    }
  }, [fetchPendingInvoices, isConfigured])

  const openInvoiceDialog = (op: PendingInvoice) => {
    setSelectedOp(op)

    // Map customer doc_type to AFIP doc_tipo
    let docTipo = "96" // DNI default
    if (op.customer_doc_type) {
      const t = op.customer_doc_type.toUpperCase()
      if (t === "CUIT") docTipo = "80"
      else if (t === "CUIL") docTipo = "86"
      else if (t === "DNI") docTipo = "96"
    }

    // Determine cbte_tipo based on doc_tipo
    // CUIT -> Factura A o B, DNI -> Factura B o C
    const cbteTipo = docTipo === "80" ? "6" : "11" // B if CUIT, C if DNI/other

    setInvoiceForm({
      cbte_tipo: cbteTipo,
      doc_tipo: docTipo,
      doc_nro: op.customer_doc_number || "",
      receptor_nombre: op.customer_name || "",
      condicion_iva: docTipo === "80" ? "1" : "5", // RI if CUIT, CF if DNI
      concepto: "2",
      descripcion: `Servicios turísticos - ${op.destination} - File ${op.file_code}`,
      iva_porcentaje: "21",
    })
    setInvoiceDialogOpen(true)
  }

  const handleInvoice = async () => {
    if (!selectedOp) return

    const docNroClean = invoiceForm.doc_nro.replace(/\D/g, "")
    if (!docNroClean) {
      toast.error("Ingresá el número de documento del receptor")
      return
    }
    if (!invoiceForm.receptor_nombre.trim()) {
      toast.error("Ingresá el nombre del receptor")
      return
    }

    setInvoicing(true)
    try {
      // Calculate amounts
      const total = selectedOp.sale_amount_total
      const ivaPct = parseInt(invoiceForm.iva_porcentaje, 10)
      const neto = Math.round((total / (1 + ivaPct / 100)) * 100) / 100
      const iva = Math.round((total - neto) * 100) / 100

      // IVA id mapping: 21% = 5, 10.5% = 4, 27% = 6, 0% = 3
      let ivaId = 5
      if (ivaPct === 0) ivaId = 3
      else if (ivaPct === 10.5 || ivaPct === 10) ivaId = 4
      else if (ivaPct === 27) ivaId = 6

      // Step 1: Create draft invoice
      const createRes = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operation_id: selectedOp.id,
          customer_id: selectedOp.customer_id,
          cbte_tipo: parseInt(invoiceForm.cbte_tipo, 10),
          concepto: parseInt(invoiceForm.concepto, 10),
          receptor_doc_tipo: parseInt(invoiceForm.doc_tipo, 10),
          receptor_doc_nro: docNroClean,
          receptor_nombre: invoiceForm.receptor_nombre,
          receptor_condicion_iva: parseInt(invoiceForm.condicion_iva, 10),
          moneda: selectedOp.sale_currency === "USD" ? "DOL" : "PES",
          cotizacion: 1,
          items: [
            {
              descripcion: invoiceForm.descripcion,
              cantidad: 1,
              precio_unitario: neto,
              iva_id: ivaId,
              iva_porcentaje: ivaPct,
            },
          ],
        }),
      })

      if (!createRes.ok) {
        const err = await createRes.json()
        throw new Error(err.error || "Error al crear factura borrador")
      }

      const { invoice } = await createRes.json()
      toast.info("Factura creada, autorizando en AFIP...")

      // Step 2: Authorize with AFIP
      const authRes = await fetch(`/api/invoices/${invoice.id}/authorize`, {
        method: "POST",
      })

      const authData = await authRes.json()

      if (authData.success) {
        toast.success(`Factura autorizada - CAE: ${authData.data.cae}`)
        setInvoiceDialogOpen(false)
        fetchPendingInvoices()
      } else {
        toast.error(authData.error || "AFIP rechazó la factura")
        console.error("[AFIP] Rechazo:", authData)
      }
    } catch (error: any) {
      toast.error(error.message || "Error al facturar")
      console.error("Error invoicing:", error)
    } finally {
      setInvoicing(false)
    }
  }

  const formatCurrency = (amount: number, currency: string = "ARS") => {
    if (currency === "USD") {
      return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount)
    }
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-bold">Facturación Electrónica</h1>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-5 w-5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-sm">
                <p>Integración con AFIP/ARCA para emitir facturas electrónicas con CAE directamente desde las operaciones.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="flex items-center gap-2">
          {isConfigured ? (
            <Badge variant="success">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Configurado
            </Badge>
          ) : (
            <Badge variant="destructive">
              <AlertCircle className="h-3 w-3 mr-1" />
              Sin configurar
            </Badge>
          )}
          <Button variant="outline" asChild>
            <Link href="/settings?tab=afip">
              <Settings className="h-4 w-4 mr-2" />
              Configuración AFIP
            </Link>
          </Button>
        </div>
      </div>

      {/* Sin configurar */}
      {!isConfigured && (
        <Card className="border-yellow-500/50 bg-yellow-500/5">
          <CardContent className="py-8">
            <div className="flex flex-col items-center text-center gap-4">
              <AlertCircle className="h-12 w-12 text-yellow-600" />
              <div>
                <h3 className="text-lg font-semibold">Configuración Requerida</h3>
                <p className="text-muted-foreground mt-1">
                  Para emitir facturas electrónicas necesitás vincular tu cuenta de ARCA (ex-AFIP) desde la configuración.
                </p>
              </div>
              <Button asChild>
                <Link href="/settings?tab=afip">
                  <Settings className="h-4 w-4 mr-2" />
                  Ir a Configuración AFIP
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Configurado - Mostrar contenido */}
      {isConfigured && config && (
        <>
          {/* KPIs */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Pendientes de Facturar
                </CardTitle>
                <Receipt className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{pendingInvoices.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  CUIT Configurado
                </CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-mono">{config.cuit}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Entorno
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <Badge variant={config.environment === "production" ? "default" : "secondary"}>
                  {config.environment === "production" ? "Producción" : "Sandbox (Pruebas)"}
                </Badge>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="pending">Pendientes de Facturar</TabsTrigger>
              <TabsTrigger value="history">Historial</TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Operaciones sin Facturar</CardTitle>
                  <CardDescription>
                    Operaciones confirmadas que aún no tienen factura emitida
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : pendingInvoices.length === 0 ? (
                    <div className="flex flex-col items-center py-8 text-muted-foreground">
                      <CheckCircle2 className="h-12 w-12 mb-4 opacity-50" />
                      <p>No hay operaciones pendientes de facturar</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Código</TableHead>
                          <TableHead>Cliente</TableHead>
                          <TableHead>Destino</TableHead>
                          <TableHead>Fecha</TableHead>
                          <TableHead className="text-right">Monto</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pendingInvoices.map((op) => (
                          <TableRow key={op.id}>
                            <TableCell className="font-mono font-medium">
                              {op.file_code}
                            </TableCell>
                            <TableCell>{op.customer_name}</TableCell>
                            <TableCell>{op.destination}</TableCell>
                            <TableCell>
                              {op.departure_date
                                ? format(new Date(op.departure_date), "dd/MM/yyyy", { locale: es })
                                : "-"}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(op.sale_amount_total, op.sale_currency)}
                            </TableCell>
                            <TableCell>
                              <Button size="sm" onClick={() => openInvoiceDialog(op)}>
                                <FileText className="h-4 w-4 mr-2" />
                                Facturar
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history">
              <Card>
                <CardHeader>
                  <CardTitle>Historial de Facturas</CardTitle>
                  <CardDescription>
                    Facturas emitidas con CAE
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mb-4 opacity-50" />
                    <p>El historial se mostrará cuando se emitan facturas</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* Dialog de Facturación */}
      <Dialog open={invoiceDialogOpen} onOpenChange={setInvoiceDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Emitir Factura Electrónica</DialogTitle>
            <DialogDescription>
              {selectedOp && (
                <>
                  Operación <span className="font-mono font-medium">{selectedOp.file_code}</span>
                  {" — "}
                  {formatCurrency(selectedOp.sale_amount_total, selectedOp.sale_currency)}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Tipo de Comprobante */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de Comprobante</Label>
                <Select
                  value={invoiceForm.cbte_tipo}
                  onValueChange={(v) => setInvoiceForm({ ...invoiceForm, cbte_tipo: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CBTE_TIPOS.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Condición IVA Receptor</Label>
                <Select
                  value={invoiceForm.condicion_iva}
                  onValueChange={(v) => setInvoiceForm({ ...invoiceForm, condicion_iva: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONDICION_IVA.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Datos del receptor */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo Documento</Label>
                <Select
                  value={invoiceForm.doc_tipo}
                  onValueChange={(v) => setInvoiceForm({ ...invoiceForm, doc_tipo: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DOC_TIPOS.map((d) => (
                      <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Nro. Documento</Label>
                <Input
                  placeholder="20123456789"
                  value={invoiceForm.doc_nro}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, doc_nro: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Nombre / Razón Social</Label>
              <Input
                value={invoiceForm.receptor_nombre}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, receptor_nombre: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Descripción</Label>
              <Input
                value={invoiceForm.descripcion}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, descripcion: e.target.value })}
              />
            </div>

            {/* Montos */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>IVA</Label>
                <Select
                  value={invoiceForm.iva_porcentaje}
                  onValueChange={(v) => setInvoiceForm({ ...invoiceForm, iva_porcentaje: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="21">21%</SelectItem>
                    <SelectItem value="10.5">10.5%</SelectItem>
                    <SelectItem value="27">27%</SelectItem>
                    <SelectItem value="0">0% (Exento)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Concepto</Label>
                <Select
                  value={invoiceForm.concepto}
                  onValueChange={(v) => setInvoiceForm({ ...invoiceForm, concepto: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Productos</SelectItem>
                    <SelectItem value="2">Servicios</SelectItem>
                    <SelectItem value="3">Productos y Servicios</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Resumen */}
            {selectedOp && (
              <div className="rounded-md border p-3 bg-muted/50 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Neto gravado:</span>
                  <span className="font-medium">
                    {formatCurrency(
                      Math.round((selectedOp.sale_amount_total / (1 + parseInt(invoiceForm.iva_porcentaje, 10) / 100)) * 100) / 100,
                      selectedOp.sale_currency
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">IVA ({invoiceForm.iva_porcentaje}%):</span>
                  <span className="font-medium">
                    {formatCurrency(
                      Math.round((selectedOp.sale_amount_total - selectedOp.sale_amount_total / (1 + parseInt(invoiceForm.iva_porcentaje, 10) / 100)) * 100) / 100,
                      selectedOp.sale_currency
                    )}
                  </span>
                </div>
                <div className="flex justify-between border-t pt-1">
                  <span className="font-medium">Total:</span>
                  <span className="font-bold">
                    {formatCurrency(selectedOp.sale_amount_total, selectedOp.sale_currency)}
                  </span>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setInvoiceDialogOpen(false)} disabled={invoicing}>
              Cancelar
            </Button>
            <Button onClick={handleInvoice} disabled={invoicing}>
              {invoicing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Emitiendo...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Emitir Factura
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
