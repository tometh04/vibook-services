"use client"

import { useState, useEffect } from "react"
import { Loader2, FileText, Search } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import {
  DOC_TIPOS,
  IVA_CONDITIONS,
  CONCEPTO_TIPOS,
} from "@/lib/afip/invoicing"

interface Operation {
  id: string
  file_code: string
  destination: string
  sale_amount_total: number
  currency: string
  status: string
  operation_customers?: Array<{
    role: string
    customers: {
      id: string
      first_name: string
      last_name: string
      document_type?: string
      document_number?: string
    }
  }>
}

interface NewInvoiceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
}

export function NewInvoiceDialog({ open, onOpenChange, onCreated }: NewInvoiceDialogProps) {
  const [submitting, setSubmitting] = useState(false)
  const [loadingOps, setLoadingOps] = useState(false)
  const [operations, setOperations] = useState<Operation[]>([])
  const [searchOp, setSearchOp] = useState("")

  // Form fields
  const [selectedOpId, setSelectedOpId] = useState<string>("")
  const [receptorNombre, setReceptorNombre] = useState("")
  const [docTipo, setDocTipo] = useState("99") // Consumidor Final por defecto
  const [docNro, setDocNro] = useState("")
  const [condicionIva, setCondicionIva] = useState("5") // Consumidor Final
  const [concepto, setConcepto] = useState("2") // Servicios (turismo)
  const [impTotal, setImpTotal] = useState("")
  const [descripcion, setDescripcion] = useState("")
  const [moneda, setMoneda] = useState("ARS")
  const [fchServDesde, setFchServDesde] = useState("")
  const [fchServHasta, setFchServHasta] = useState("")
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("")

  // Buscar operaciones cuando se abre el dialog
  useEffect(() => {
    if (open) {
      fetchOperations()
      resetForm()
    }
  }, [open])

  function resetForm() {
    setSelectedOpId("")
    setReceptorNombre("")
    setDocTipo("99")
    setDocNro("")
    setCondicionIva("5")
    setConcepto("2")
    setImpTotal("")
    setDescripcion("")
    setMoneda("ARS")
    setFchServDesde("")
    setFchServHasta("")
    setSelectedCustomerId("")
    setSearchOp("")
  }

  async function fetchOperations() {
    setLoadingOps(true)
    try {
      // Traer operaciones confirmadas/viajadas/cerradas que se pueden facturar
      const res = await fetch("/api/operations?status=ALL&limit=200")
      const data = await res.json()
      if (data.operations) {
        // Filtrar solo las que tienen status facturabable y no tienen CAE
        const facturables = data.operations.filter(
          (op: any) =>
            ["CONFIRMED", "TRAVELLED", "CLOSED"].includes(op.status) &&
            !op.invoice_cae
        )
        setOperations(facturables)
      }
    } catch (error) {
      console.error("Error fetching operations:", error)
    } finally {
      setLoadingOps(false)
    }
  }

  function handleSelectOperation(opId: string) {
    setSelectedOpId(opId)
    if (opId === "none") {
      // Factura libre
      setReceptorNombre("")
      setDocTipo("99")
      setDocNro("")
      setImpTotal("")
      setDescripcion("")
      setMoneda("ARS")
      setSelectedCustomerId("")
      return
    }

    const op = operations.find((o) => o.id === opId)
    if (!op) return

    // Pre-llenar con datos de la operación
    setImpTotal(String(op.sale_amount_total || ""))
    setMoneda(op.currency === "USD" ? "USD" : "ARS")
    setDescripcion(`Servicios turísticos - ${op.destination || ""} (${op.file_code || ""})`)

    // Buscar cliente principal
    const mainCustomer = op.operation_customers?.find((oc) => oc.role === "MAIN")
    if (mainCustomer?.customers) {
      const c = mainCustomer.customers
      setReceptorNombre(`${c.first_name} ${c.last_name}`)
      setSelectedCustomerId(c.id)

      // Mapear document_type a doc_tipo AFIP
      if (c.document_type && c.document_number) {
        const docTypeMap: Record<string, string> = {
          CUIT: "80",
          CUIL: "86",
          DNI: "96",
        }
        const mappedType = docTypeMap[c.document_type.toUpperCase()]
        if (mappedType) {
          setDocTipo(mappedType)
          setDocNro(c.document_number)
        }
      }
    }
  }

  // Filtrar operaciones por búsqueda
  const filteredOps = operations.filter((op) => {
    if (!searchOp) return true
    const search = searchOp.toLowerCase()
    const customerName = op.operation_customers
      ?.find((oc) => oc.role === "MAIN")
      ?.customers
    const name = customerName
      ? `${customerName.first_name} ${customerName.last_name}`.toLowerCase()
      : ""
    return (
      (op.file_code || "").toLowerCase().includes(search) ||
      (op.destination || "").toLowerCase().includes(search) ||
      name.includes(search)
    )
  })

  async function handleSubmit() {
    // Validaciones
    if (!receptorNombre.trim()) {
      toast.error("Ingresá el nombre del receptor")
      return
    }
    if (!impTotal || Number(impTotal) <= 0) {
      toast.error("El importe debe ser mayor a 0")
      return
    }
    if (Number(concepto) >= 2 && (!fchServDesde || !fchServHasta)) {
      toast.error("Para servicios, completá las fechas de servicio")
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operation_id: selectedOpId && selectedOpId !== "none" ? selectedOpId : null,
          customer_id: selectedCustomerId || null,
          receptor_nombre: receptorNombre.trim(),
          receptor_doc_tipo: Number(docTipo),
          receptor_doc_nro: docTipo === "99" ? "0" : docNro,
          receptor_condicion_iva: Number(condicionIva),
          concepto: Number(concepto),
          imp_total: Number(impTotal),
          descripcion: descripcion.trim(),
          moneda,
          fch_serv_desde: fchServDesde || null,
          fch_serv_hasta: fchServHasta || null,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || "Error al emitir factura")
        return
      }

      if (data.success) {
        toast.success(
          `Factura emitida correctamente. CAE: ${data.afip_result?.CAE || "N/A"}`
        )
        onOpenChange(false)
        onCreated()
      } else {
        toast.error(data.error || "AFIP rechazó la factura")
      }
    } catch (error: any) {
      toast.error(error?.message || "Error al emitir factura")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Nueva Factura C
          </DialogTitle>
          <DialogDescription>
            Emitir factura electrónica a través de AFIP
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Selección de operación */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Operación (opcional)</Label>
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por código, destino o cliente..."
                  className="pl-9"
                  value={searchOp}
                  onChange={(e) => setSearchOp(e.target.value)}
                />
              </div>
              <Select value={selectedOpId} onValueChange={handleSelectOperation}>
                <SelectTrigger>
                  <SelectValue placeholder="Factura libre (sin operación)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Factura libre (sin operación)</SelectItem>
                  {loadingOps ? (
                    <SelectItem value="loading" disabled>
                      Cargando operaciones...
                    </SelectItem>
                  ) : (
                    filteredOps.map((op) => {
                      const customer = op.operation_customers?.find(
                        (oc) => oc.role === "MAIN"
                      )?.customers
                      const name = customer
                        ? `${customer.first_name} ${customer.last_name}`
                        : "Sin cliente"
                      return (
                        <SelectItem key={op.id} value={op.id}>
                          {op.file_code || "S/C"} - {op.destination} - {name} (${op.sale_amount_total} {op.currency})
                        </SelectItem>
                      )
                    })
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Datos del receptor */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Datos del Receptor</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="receptor_nombre" className="text-xs">Nombre / Razón Social</Label>
                <Input
                  id="receptor_nombre"
                  placeholder="Nombre del cliente"
                  value={receptorNombre}
                  onChange={(e) => setReceptorNombre(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Tipo Documento</Label>
                <Select value={docTipo} onValueChange={setDocTipo}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DOC_TIPOS.map((dt) => (
                      <SelectItem key={dt.id} value={String(dt.id)}>
                        {dt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="doc_nro" className="text-xs">Nro Documento</Label>
                <Input
                  id="doc_nro"
                  placeholder={docTipo === "99" ? "0 (automático)" : "Nro de documento"}
                  value={docTipo === "99" ? "" : docNro}
                  onChange={(e) => setDocNro(e.target.value.replace(/\D/g, ""))}
                  disabled={docTipo === "99"}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Condición IVA</Label>
                <Select value={condicionIva} onValueChange={setCondicionIva}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {IVA_CONDITIONS.map((ic) => (
                      <SelectItem key={ic.id} value={String(ic.id)}>
                        {ic.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Datos de la factura */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Datos de la Factura</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Concepto</Label>
                <Select value={concepto} onValueChange={setConcepto}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONCEPTO_TIPOS.map((ct) => (
                      <SelectItem key={ct.id} value={String(ct.id)}>
                        {ct.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Moneda</Label>
                <Select value={moneda} onValueChange={setMoneda}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ARS">Pesos (ARS)</SelectItem>
                    <SelectItem value="USD">Dólares (USD)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="imp_total" className="text-xs">Importe Total</Label>
                <Input
                  id="imp_total"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={impTotal}
                  onChange={(e) => setImpTotal(e.target.value)}
                />
              </div>
            </div>

            {/* Fechas de servicio (solo si concepto >= 2) */}
            {Number(concepto) >= 2 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="fch_desde" className="text-xs">Fecha Servicio Desde</Label>
                  <Input
                    id="fch_desde"
                    type="date"
                    value={fchServDesde}
                    onChange={(e) => setFchServDesde(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="fch_hasta" className="text-xs">Fecha Servicio Hasta</Label>
                  <Input
                    id="fch_hasta"
                    type="date"
                    value={fchServHasta}
                    onChange={(e) => setFchServHasta(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="descripcion" className="text-xs">Descripción</Label>
              <Input
                id="descripcion"
                placeholder="Descripción del servicio..."
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Emitiendo...
              </>
            ) : (
              "Emitir Factura"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
