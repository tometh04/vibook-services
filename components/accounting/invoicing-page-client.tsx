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
  Plus,
  Send,
  Eye,
  Search,
  Filter,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import Link from "next/link"
import { COMPROBANTE_LABELS } from "@/lib/afip/types"

// ── Types ──

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

interface Invoice {
  id: string
  cbte_tipo: number
  pto_vta: number
  cbte_nro?: number
  cae?: string
  cae_fch_vto?: string
  receptor_nombre: string
  receptor_doc_nro: string
  imp_total: number
  status: string
  fecha_emision?: string
  created_at: string
  operations?: { id: string; file_code: string; destination: string }
  customers?: { id: string; first_name: string; last_name: string }
  invoice_items?: Array<{
    id: string
    descripcion: string
    cantidad: number
    precio_unitario: number
    subtotal: number
    iva_porcentaje: number
    iva_importe: number
    total: number
  }>
}

interface InvoiceItem {
  descripcion: string
  cantidad: number
  precio_unitario: number
  iva_porcentaje: number
}

// ── Constants ──

const CBTE_TIPOS = [
  { value: "11", label: "Factura C" },
  { value: "6", label: "Factura B" },
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

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  draft: { label: "Borrador", variant: "outline" },
  pending: { label: "Pendiente", variant: "secondary" },
  authorized: { label: "Autorizada", variant: "default" },
  rejected: { label: "Rechazada", variant: "destructive" },
  cancelled: { label: "Anulada", variant: "destructive" },
}

// ── Component ──

export function InvoicingPageClient({ agencies, userRole, afipConfig: initialConfig }: InvoicingPageClientProps) {
  const [activeTab, setActiveTab] = useState("pending")
  const [loading, setLoading] = useState(false)
  const [pendingInvoices, setPendingInvoices] = useState<PendingInvoice[]>([])

  // Historial
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loadingInvoices, setLoadingInvoices] = useState(false)
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [search, setSearch] = useState("")
  const [authorizing, setAuthorizing] = useState<string | null>(null)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)

  // Invoice creation dialog
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<"from_operation" | "free">("free")
  const [selectedOp, setSelectedOp] = useState<PendingInvoice | null>(null)
  const [invoicing, setInvoicing] = useState(false)

  // Form state for invoice creation
  const [invoiceForm, setInvoiceForm] = useState({
    cbte_tipo: "11",
    doc_tipo: "96",
    doc_nro: "",
    receptor_nombre: "",
    condicion_iva: "5",
    concepto: "2",
  })
  const [items, setItems] = useState<InvoiceItem[]>([
    { descripcion: "", cantidad: 1, precio_unitario: 0, iva_porcentaje: 21 },
  ])

  const config = initialConfig
  const isConfigured = !!(config?.cuit && config?.is_active && config?.automation_status === "complete")

  // ── Data fetching ──

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

  const fetchInvoices = useCallback(async () => {
    setLoadingInvoices(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== "ALL") params.append("status", statusFilter)
      const response = await fetch(`/api/invoices?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setInvoices(data.invoices || [])
      }
    } catch (error) {
      console.error("Error fetching invoices:", error)
    } finally {
      setLoadingInvoices(false)
    }
  }, [statusFilter])

  useEffect(() => {
    if (isConfigured) {
      fetchPendingInvoices()
      fetchInvoices()
    }
  }, [fetchPendingInvoices, fetchInvoices, isConfigured])

  useEffect(() => {
    if (isConfigured && activeTab === "history") {
      fetchInvoices()
    }
  }, [statusFilter, activeTab, isConfigured, fetchInvoices])

  // ── Invoice dialog: from operation ──

  // Factura C: IVA siempre 0 (no discrimina)
  const esFacturaC = invoiceForm.cbte_tipo === "11"

  const openFromOperation = (op: PendingInvoice) => {
    setSelectedOp(op)
    setDialogMode("from_operation")

    let docTipo = "96"
    if (op.customer_doc_type) {
      const t = op.customer_doc_type.toUpperCase()
      if (t === "CUIT") docTipo = "80"
      else if (t === "CUIL") docTipo = "86"
      else if (t === "DNI") docTipo = "96"
    }

    const cbteTipo = docTipo === "80" ? "6" : "11"
    const isC = cbteTipo === "11"

    setInvoiceForm({
      cbte_tipo: cbteTipo,
      doc_tipo: docTipo,
      doc_nro: op.customer_doc_number || "",
      receptor_nombre: op.customer_name || "",
      condicion_iva: docTipo === "80" ? "1" : "5",
      concepto: "2",
    })
    setItems([
      {
        descripcion: `Servicios turísticos - ${op.destination} - File ${op.file_code}`,
        cantidad: 1,
        precio_unitario: op.sale_amount_total,
        iva_porcentaje: isC ? 0 : 21,
      },
    ])
    setInvoiceDialogOpen(true)
  }

  // ── Invoice dialog: free ──

  const openFreeInvoice = () => {
    setSelectedOp(null)
    setDialogMode("free")
    setInvoiceForm({
      cbte_tipo: "11",
      doc_tipo: "96",
      doc_nro: "",
      receptor_nombre: "",
      condicion_iva: "5",
      concepto: "2",
    })
    // Factura C default → IVA 0%
    setItems([{ descripcion: "", cantidad: 1, precio_unitario: 0, iva_porcentaje: 0 }])
    setInvoiceDialogOpen(true)
  }

  // ── Items management ──

  const addItem = () => {
    setItems([...items, { descripcion: "", cantidad: 1, precio_unitario: 0, iva_porcentaje: 21 }])
  }

  const removeItem = (index: number) => {
    if (items.length > 1) setItems(items.filter((_, i) => i !== index))
  }

  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    setItems(newItems)
  }

  const calcItemTotal = (item: InvoiceItem) => {
    const subtotal = item.cantidad * item.precio_unitario
    // Factura C: IVA = 0 siempre
    const ivaImporte = esFacturaC ? 0 : subtotal * (item.iva_porcentaje / 100)
    return { subtotal, ivaImporte, total: subtotal + ivaImporte }
  }

  const totals = items.reduce(
    (acc, item) => {
      const t = calcItemTotal(item)
      return { neto: acc.neto + t.subtotal, iva: acc.iva + t.ivaImporte, total: acc.total + t.total }
    },
    { neto: 0, iva: 0, total: 0 }
  )

  // ── Create & authorize invoice ──

  const handleInvoice = async () => {
    const docNroClean = invoiceForm.doc_nro.replace(/\D/g, "")
    if (!docNroClean) { toast.error("Ingresá el número de documento del receptor"); return }
    if (!invoiceForm.receptor_nombre.trim()) { toast.error("Ingresá el nombre del receptor"); return }
    if (items.some((i) => !i.descripcion || i.precio_unitario <= 0)) { toast.error("Todos los items deben tener descripción y precio"); return }

    setInvoicing(true)
    try {
      const mappedItems = items.map((item) => {
        let ivaId = 5
        if (item.iva_porcentaje === 0) ivaId = 3
        else if (item.iva_porcentaje === 10.5) ivaId = 4
        else if (item.iva_porcentaje === 27) ivaId = 6
        return {
          descripcion: item.descripcion,
          cantidad: item.cantidad,
          precio_unitario: item.precio_unitario,
          iva_id: ivaId,
          iva_porcentaje: item.iva_porcentaje,
        }
      })

      const body: Record<string, any> = {
        cbte_tipo: parseInt(invoiceForm.cbte_tipo, 10),
        concepto: parseInt(invoiceForm.concepto, 10),
        receptor_doc_tipo: parseInt(invoiceForm.doc_tipo, 10),
        receptor_doc_nro: docNroClean,
        receptor_nombre: invoiceForm.receptor_nombre,
        receptor_condicion_iva: parseInt(invoiceForm.condicion_iva, 10),
        moneda: "PES",
        cotizacion: 1,
        items: mappedItems,
      }

      if (selectedOp) {
        body.operation_id = selectedOp.id
        body.customer_id = selectedOp.customer_id
        if (selectedOp.sale_currency === "USD") body.moneda = "DOL"
      }

      // Step 1: Create draft
      const createRes = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!createRes.ok) {
        const err = await createRes.json()
        throw new Error(err.error || err.details?.[0]?.message || "Error al crear factura borrador")
      }

      const { invoice } = await createRes.json()
      toast.info("Factura creada, autorizando en AFIP...")

      // Step 2: Authorize with AFIP
      const authRes = await fetch(`/api/invoices/${invoice.id}/authorize`, { method: "POST" })
      let authData: any
      try {
        authData = await authRes.json()
      } catch {
        throw new Error("Error de red al autorizar con AFIP")
      }

      if (authData.success) {
        toast.success(`Factura autorizada — CAE: ${authData.data.cae}`)
        setInvoiceDialogOpen(false)
        fetchPendingInvoices()
        fetchInvoices()
      } else {
        // Mostrar error detallado de AFIP
        const errMsg = authData.error || "AFIP rechazó la factura"
        const details = authData.details
        if (details && Array.isArray(details)) {
          const detailText = details.map((d: any) => `(${d.Code}) ${d.Msg}`).join(" | ")
          toast.error(`${errMsg}: ${detailText}`, { duration: 10000 })
        } else {
          toast.error(errMsg, { duration: 8000 })
        }
        console.error("[AFIP] Rechazo:", authData)
        fetchInvoices()
      }
    } catch (error: any) {
      toast.error(error.message || "Error al facturar")
      console.error("Error invoicing:", error)
    } finally {
      setInvoicing(false)
    }
  }

  // ── Authorize existing draft ──

  const authorizeExisting = async (invoiceId: string) => {
    setAuthorizing(invoiceId)
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/authorize`, { method: "POST" })
      let data: any
      try {
        data = await res.json()
      } catch {
        throw new Error("Error de red al autorizar con AFIP")
      }
      if (data.success) {
        toast.success(`Factura autorizada — CAE: ${data.data.cae}`)
        fetchInvoices()
        fetchPendingInvoices()
      } else {
        const errMsg = data.error || "Error al autorizar"
        const details = data.details
        if (details && Array.isArray(details)) {
          const detailText = details.map((d: any) => `(${d.Code}) ${d.Msg}`).join(" | ")
          toast.error(`${errMsg}: ${detailText}`, { duration: 10000 })
        } else {
          toast.error(errMsg, { duration: 8000 })
        }
        console.error("[AFIP] Rechazo:", data)
      }
    } catch (error: any) {
      toast.error(error.message || "Error al autorizar")
    } finally {
      setAuthorizing(null)
    }
  }

  // ── Format helpers ──

  const formatCurrency = (amount: number, currency: string = "ARS") => {
    if (currency === "USD") return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount)
    return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount)
  }

  const filteredInvoices = invoices.filter((inv) => {
    if (!search) return true
    const s = search.toLowerCase()
    return (
      inv.receptor_nombre.toLowerCase().includes(s) ||
      inv.receptor_doc_nro.includes(search) ||
      inv.cbte_nro?.toString().includes(search) ||
      inv.cae?.includes(search)
    )
  })

  // ── Render ──

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-2xl sm:text-3xl font-bold">Facturación Electrónica</h1>
          {isConfigured ? (
            <Badge variant="success" className="shrink-0">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Configurado
            </Badge>
          ) : (
            <Badge variant="destructive" className="shrink-0">
              <AlertCircle className="h-3 w-3 mr-1" />
              Sin configurar
            </Badge>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isConfigured && (
            <Button onClick={openFreeInvoice} size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Nueva Factura
            </Button>
          )}
          <Button variant="outline" size="sm" asChild>
            <Link href="/settings?tab=afip">
              <Settings className="h-4 w-4 mr-1" />
              Config AFIP
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

      {/* Configurado */}
      {isConfigured && config && (
        <>
          {/* KPIs */}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Pendientes</CardTitle>
                <Receipt className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{pendingInvoices.length}</div>
                <p className="text-xs text-muted-foreground">operaciones sin facturar</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">CUIT</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-mono">{config.cuit}</div>
                <p className="text-xs text-muted-foreground">Pto. Venta: {config.punto_venta}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Facturas Emitidas</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{invoices.filter((i) => i.status === "authorized").length}</div>
                <Badge variant={config.environment === "production" ? "default" : "secondary"} className="mt-1">
                  {config.environment === "production" ? "Producción" : "Sandbox"}
                </Badge>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="pending">
                Pendientes de Facturar
                {pendingInvoices.length > 0 && (
                  <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">{pendingInvoices.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="history">
                Historial
                {invoices.length > 0 && (
                  <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">{invoices.length}</Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Tab: Pendientes */}
            <TabsContent value="pending" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Operaciones sin Facturar</CardTitle>
                  <CardDescription>Operaciones confirmadas que aún no tienen factura emitida con CAE</CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
                  ) : pendingInvoices.length === 0 ? (
                    <div className="flex flex-col items-center py-8 text-muted-foreground">
                      <CheckCircle2 className="h-12 w-12 mb-4 opacity-50" />
                      <p>No hay operaciones pendientes de facturar</p>
                      <p className="text-sm mt-1">Las operaciones deben estar en estado Confirmada o superior</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto -mx-6 px-6">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Código</TableHead>
                            <TableHead>Cliente</TableHead>
                            <TableHead className="hidden sm:table-cell">Destino</TableHead>
                            <TableHead className="hidden md:table-cell">Fecha</TableHead>
                            <TableHead className="text-right">Monto</TableHead>
                            <TableHead></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pendingInvoices.map((op) => (
                            <TableRow key={op.id}>
                              <TableCell className="font-mono font-medium text-xs sm:text-sm">{op.file_code}</TableCell>
                              <TableCell className="max-w-[120px] truncate">{op.customer_name}</TableCell>
                              <TableCell className="hidden sm:table-cell">{op.destination}</TableCell>
                              <TableCell className="hidden md:table-cell">
                                {op.departure_date ? format(new Date(op.departure_date), "dd/MM/yyyy", { locale: es }) : "-"}
                              </TableCell>
                              <TableCell className="text-right font-medium whitespace-nowrap">
                                {formatCurrency(op.sale_amount_total, op.sale_currency)}
                              </TableCell>
                              <TableCell>
                                <Button size="sm" onClick={() => openFromOperation(op)}>
                                  <FileText className="h-4 w-4 sm:mr-2" />
                                  <span className="hidden sm:inline">Facturar</span>
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab: Historial */}
            <TabsContent value="history" className="space-y-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="Buscar por cliente, CUIT, CAE..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-full sm:w-[180px]">
                        <Filter className="mr-2 h-4 w-4" />
                        <SelectValue placeholder="Estado" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">Todos</SelectItem>
                        <SelectItem value="draft">Borrador</SelectItem>
                        <SelectItem value="authorized">Autorizada</SelectItem>
                        <SelectItem value="rejected">Rechazada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  {loadingInvoices ? (
                    <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
                  ) : (
                    <div className="overflow-x-auto -mx-6 px-6">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Comprobante</TableHead>
                            <TableHead>Cliente</TableHead>
                            <TableHead className="hidden md:table-cell">CUIT/DNI</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                            <TableHead className="hidden lg:table-cell">CAE</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead className="hidden sm:table-cell">Fecha</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredInvoices.map((inv) => (
                            <TableRow key={inv.id}>
                              <TableCell>
                                <div className="font-medium text-xs sm:text-sm">
                                  {COMPROBANTE_LABELS[inv.cbte_tipo as keyof typeof COMPROBANTE_LABELS] || `Tipo ${inv.cbte_tipo}`}
                                </div>
                                {inv.cbte_nro && (
                                  <div className="text-xs text-muted-foreground">
                                    {String(inv.pto_vta).padStart(4, "0")}-{String(inv.cbte_nro).padStart(8, "0")}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className="max-w-[120px] truncate">{inv.receptor_nombre}</TableCell>
                              <TableCell className="font-mono text-sm hidden md:table-cell">{inv.receptor_doc_nro}</TableCell>
                              <TableCell className="text-right font-medium whitespace-nowrap">{formatCurrency(inv.imp_total)}</TableCell>
                              <TableCell className="hidden lg:table-cell">
                                {inv.cae ? <code className="text-xs bg-muted px-1 py-0.5 rounded">{inv.cae}</code> : <span className="text-muted-foreground">-</span>}
                              </TableCell>
                              <TableCell>
                                <Badge variant={STATUS_LABELS[inv.status]?.variant || "outline"} className="text-xs">
                                  {STATUS_LABELS[inv.status]?.label || inv.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="hidden sm:table-cell whitespace-nowrap">
                                {inv.fecha_emision
                                  ? format(new Date(inv.fecha_emision), "dd/MM/yyyy", { locale: es })
                                  : format(new Date(inv.created_at), "dd/MM/yyyy", { locale: es })}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-1">
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedInvoice(inv)}>
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  {(inv.status === "draft" || inv.status === "rejected") && (
                                    <Button size="sm" onClick={() => authorizeExisting(inv.id)} disabled={authorizing === inv.id}>
                                      {authorizing === inv.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-4 w-4 sm:mr-1" /><span className="hidden sm:inline">Autorizar</span></>}
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                          {filteredInvoices.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                {search || statusFilter !== "ALL" ? "No se encontraron facturas con esos filtros" : "No hay facturas emitidas aún"}
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* Dialog: Create Invoice */}
      <Dialog open={invoiceDialogOpen} onOpenChange={setInvoiceDialogOpen}>
        <DialogContent className="max-w-2xl w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{dialogMode === "from_operation" ? "Facturar Operación" : "Nueva Factura"}</DialogTitle>
            <DialogDescription>
              {selectedOp ? (
                <>File <span className="font-mono font-medium">{selectedOp.file_code}</span> — {selectedOp.customer_name}</>
              ) : (
                "Creá una factura electrónica — se autoriza automáticamente en AFIP"
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de Comprobante</Label>
                <Select value={invoiceForm.cbte_tipo} onValueChange={(v) => {
                  setInvoiceForm({ ...invoiceForm, cbte_tipo: v })
                  // Factura C → forzar IVA 0% en todos los items
                  if (v === "11") {
                    setItems(prev => prev.map(item => ({ ...item, iva_porcentaje: 0 })))
                  }
                }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CBTE_TIPOS.map((t) => (<SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Condición IVA Receptor</Label>
                <Select value={invoiceForm.condicion_iva} onValueChange={(v) => setInvoiceForm({ ...invoiceForm, condicion_iva: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CONDICION_IVA.map((c) => (<SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo Documento</Label>
                <Select value={invoiceForm.doc_tipo} onValueChange={(v) => setInvoiceForm({ ...invoiceForm, doc_tipo: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DOC_TIPOS.map((d) => (<SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Nro. Documento</Label>
                <Input placeholder="20123456789" value={invoiceForm.doc_nro} onChange={(e) => setInvoiceForm({ ...invoiceForm, doc_nro: e.target.value })} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Nombre / Razón Social</Label>
              <Input value={invoiceForm.receptor_nombre} onChange={(e) => setInvoiceForm({ ...invoiceForm, receptor_nombre: e.target.value })} />
            </div>

            {/* Items */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Items</Label>
                <Button variant="outline" size="sm" onClick={addItem}><Plus className="h-3 w-3 mr-1" />Agregar</Button>
              </div>
              {items.map((item, idx) => (
                <div key={idx} className="p-3 border rounded-lg space-y-2 bg-muted/30">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Item #{idx + 1}</span>
                    {items.length > 1 && (
                      <Button variant="ghost" size="sm" onClick={() => removeItem(idx)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                    )}
                  </div>
                  <Input placeholder="Descripción del servicio" value={item.descripcion} onChange={(e) => updateItem(idx, "descripcion", e.target.value)} />
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label className="text-xs">Cantidad</Label>
                      <Input type="number" min={1} value={item.cantidad} onChange={(e) => updateItem(idx, "cantidad", parseFloat(e.target.value) || 1)} />
                    </div>
                    <div>
                      <Label className="text-xs">Precio Unit. (Neto)</Label>
                      <Input type="number" min={0} step={0.01} value={item.precio_unitario} onChange={(e) => updateItem(idx, "precio_unitario", parseFloat(e.target.value) || 0)} />
                    </div>
                    <div>
                      <Label className="text-xs">IVA %</Label>
                      {esFacturaC ? (
                        <Input value="0% (Factura C)" disabled className="text-xs" />
                      ) : (
                        <Select value={item.iva_porcentaje.toString()} onValueChange={(v) => updateItem(idx, "iva_porcentaje", parseFloat(v))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">0%</SelectItem>
                            <SelectItem value="10.5">10.5%</SelectItem>
                            <SelectItem value="21">21%</SelectItem>
                            <SelectItem value="27">27%</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <Label>Concepto</Label>
              <Select value={invoiceForm.concepto} onValueChange={(v) => setInvoiceForm({ ...invoiceForm, concepto: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Productos</SelectItem>
                  <SelectItem value="2">Servicios</SelectItem>
                  <SelectItem value="3">Productos y Servicios</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Totals */}
            <div className="rounded-md border p-3 bg-muted/50 text-sm space-y-1">
              {esFacturaC && (
                <p className="text-xs text-muted-foreground mb-2">
                  Factura C: no discrimina IVA. El total es el importe neto.
                </p>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">{esFacturaC ? "Importe:" : "Neto gravado:"}</span>
                <span className="font-medium">{formatCurrency(Math.round(totals.neto * 100) / 100)}</span>
              </div>
              {!esFacturaC && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">IVA:</span>
                  <span className="font-medium">{formatCurrency(Math.round(totals.iva * 100) / 100)}</span>
                </div>
              )}
              <div className="flex justify-between border-t pt-1">
                <span className="font-medium">Total:</span>
                <span className="font-bold">{formatCurrency(Math.round(totals.total * 100) / 100)}</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setInvoiceDialogOpen(false)} disabled={invoicing}>Cancelar</Button>
            <Button onClick={handleInvoice} disabled={invoicing}>
              {invoicing ? (<><Loader2 className="h-4 w-4 animate-spin mr-2" />Emitiendo...</>) : (<><Send className="h-4 w-4 mr-2" />Emitir y Autorizar</>)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Invoice Detail */}
      <Dialog open={!!selectedInvoice} onOpenChange={() => setSelectedInvoice(null)}>
        <DialogContent className="max-w-2xl w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedInvoice && COMPROBANTE_LABELS[selectedInvoice.cbte_tipo as keyof typeof COMPROBANTE_LABELS]}
              {selectedInvoice?.cbte_nro && ` ${String(selectedInvoice.pto_vta).padStart(4, "0")}-${String(selectedInvoice.cbte_nro).padStart(8, "0")}`}
            </DialogTitle>
            <DialogDescription>Detalle de la factura</DialogDescription>
          </DialogHeader>

          {selectedInvoice && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-muted-foreground">Cliente</Label><p className="font-medium">{selectedInvoice.receptor_nombre}</p></div>
                <div><Label className="text-muted-foreground">CUIT/DNI</Label><p className="font-mono">{selectedInvoice.receptor_doc_nro}</p></div>
              </div>
              {selectedInvoice.cae && (
                <div className="grid grid-cols-2 gap-4">
                  <div><Label className="text-muted-foreground">CAE</Label><p className="font-mono">{selectedInvoice.cae}</p></div>
                  <div><Label className="text-muted-foreground">Vto. CAE</Label><p>{selectedInvoice.cae_fch_vto}</p></div>
                </div>
              )}
              {selectedInvoice.operations && (
                <div><Label className="text-muted-foreground">Operación</Label><p>{selectedInvoice.operations.file_code} — {selectedInvoice.operations.destination}</p></div>
              )}
              <div>
                <Label className="text-muted-foreground">Items</Label>
                <Table className="mt-2">
                  <TableHeader><TableRow><TableHead>Descripción</TableHead><TableHead className="text-right">Cant.</TableHead><TableHead className="text-right">P. Unit.</TableHead><TableHead className="text-right">IVA</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {selectedInvoice.invoice_items?.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.descripcion}</TableCell>
                        <TableCell className="text-right">{item.cantidad}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.precio_unitario)}</TableCell>
                        <TableCell className="text-right">{item.iva_porcentaje}%</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.total)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex justify-end">
                <div className="text-right"><p className="text-muted-foreground">Total</p><p className="text-2xl font-bold">{formatCurrency(selectedInvoice.imp_total)}</p></div>
              </div>
            </div>
          )}

          <DialogFooter><Button variant="outline" onClick={() => setSelectedInvoice(null)}>Cerrar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
