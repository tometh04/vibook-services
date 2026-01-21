"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { DatePicker } from "@/components/ui/date-picker"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { AlertTriangle, Download, HelpCircle, X, Search, CreditCard, Plus } from "lucide-react"
import * as XLSX from "xlsx"
import { BulkPaymentDialog } from "./bulk-payment-dialog"
import { ManualPaymentDialog } from "./manual-payment-dialog"

function formatCurrency(amount: number, currency: string = "ARS"): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: currency === "USD" ? "USD" : "ARS",
    minimumFractionDigits: 2,
  }).format(amount)
}

const statusLabels: Record<string, string> = {
  PENDING: "Pendiente",
  PAID: "Pagado",
  OVERDUE: "Vencido",
}

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-500",
  PAID: "bg-green-500",
  OVERDUE: "bg-red-500",
}

interface OperatorPaymentsPageClientProps {
  agencies: Array<{ id: string; name: string }>
  operators?: Array<{ id: string; name: string }>
}

export function OperatorPaymentsPageClient({ agencies, operators = [] }: OperatorPaymentsPageClientProps) {
  const [loading, setLoading] = useState(true)
  const [payments, setPayments] = useState<any[]>([])
  const [statusFilter, setStatusFilter] = useState<string>("ALL")
  const [agencyFilter, setAgencyFilter] = useState<string>("ALL")
  
  // Nuevos filtros avanzados
  const [operatorFilter, setOperatorFilter] = useState<string>("ALL")
  const [dueDateFrom, setDueDateFrom] = useState<string>("")
  const [dueDateTo, setDueDateTo] = useState<string>("")
  const [amountMin, setAmountMin] = useState<string>("")
  const [amountMax, setAmountMax] = useState<string>("")
  const [operationSearch, setOperationSearch] = useState<string>("")
  
  // Estado para pago masivo
  const [bulkPaymentOpen, setBulkPaymentOpen] = useState(false)
  const [manualPaymentOpen, setManualPaymentOpen] = useState(false)

  const fetchPayments = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== "ALL") {
        params.append("status", statusFilter)
      }
      if (agencyFilter !== "ALL") {
        params.append("agencyId", agencyFilter)
      }
      if (operatorFilter !== "ALL") {
        params.append("operatorId", operatorFilter)
      }
      if (dueDateFrom) {
        params.append("dueDateFrom", dueDateFrom)
      }
      if (dueDateTo) {
        params.append("dueDateTo", dueDateTo)
      }

      const response = await fetch(`/api/accounting/operator-payments?${params.toString()}`)
      if (!response.ok) throw new Error("Error al obtener pagos")

      const data = await response.json()
      let filteredPayments = data.payments || []
      
      // Filtros aplicados en frontend para mayor flexibilidad
      if (amountMin) {
        const min = parseFloat(amountMin)
        if (!isNaN(min)) {
          filteredPayments = filteredPayments.filter((p: any) => parseFloat(p.amount) >= min)
        }
      }
      if (amountMax) {
        const max = parseFloat(amountMax)
        if (!isNaN(max)) {
          filteredPayments = filteredPayments.filter((p: any) => parseFloat(p.amount) <= max)
        }
      }
      if (operationSearch.trim()) {
        const searchLower = operationSearch.toLowerCase().trim()
        filteredPayments = filteredPayments.filter((p: any) => 
          (p.operations?.file_code?.toLowerCase().includes(searchLower)) ||
          (p.operations?.destination?.toLowerCase().includes(searchLower))
        )
      }
      
      setPayments(filteredPayments)
    } catch (error) {
      console.error("Error fetching operator payments:", error)
    } finally {
      setLoading(false)
    }
  }, [statusFilter, agencyFilter, operatorFilter, dueDateFrom, dueDateTo, amountMin, amountMax, operationSearch])

  useEffect(() => {
    fetchPayments()
  }, [fetchPayments])

  // Limpiar todos los filtros
  const clearFilters = () => {
    setStatusFilter("ALL")
    setAgencyFilter("ALL")
    setOperatorFilter("ALL")
    setDueDateFrom("")
    setDueDateTo("")
    setAmountMin("")
    setAmountMax("")
    setOperationSearch("")
  }

  const hasActiveFilters = 
    statusFilter !== "ALL" || 
    agencyFilter !== "ALL" || 
    operatorFilter !== "ALL" || 
    dueDateFrom !== "" || 
    dueDateTo !== "" || 
    amountMin !== "" || 
    amountMax !== "" || 
    operationSearch !== ""

  // Exportación a Excel
  const handleExportExcel = () => {
    if (payments.length === 0) return

    // Hoja 1: Resumen por Operador
    const operatorSummary: Record<string, any> = {}
    payments.forEach((p) => {
      const operatorId = p.operator_id || "unknown"
      const operatorName = p.operators?.name || "Sin operador"
      if (!operatorSummary[operatorId]) {
        operatorSummary[operatorId] = {
          operador: operatorName,
          totalAPagar: 0,
          moneda: p.currency || "ARS",
          pagado: 0,
          pendiente: 0,
          cantidadPagos: 0,
          vencidos: 0,
        }
      }
      const amount = parseFloat(p.amount || "0")
      const paidAmount = parseFloat(p.paid_amount || "0")
      operatorSummary[operatorId].totalAPagar += amount
      operatorSummary[operatorId].pagado += paidAmount
      operatorSummary[operatorId].pendiente += amount - paidAmount
      operatorSummary[operatorId].cantidadPagos += 1
      if (p.status === "OVERDUE" || (p.status === "PENDING" && new Date(p.due_date) < new Date())) {
        operatorSummary[operatorId].vencidos += 1
      }
    })

    const summaryData = Object.values(operatorSummary).map((s: any) => ({
      Operador: s.operador,
      "Total a Pagar": s.totalAPagar.toFixed(2),
      Moneda: s.moneda,
      Pagado: s.pagado.toFixed(2),
      Pendiente: s.pendiente.toFixed(2),
      "Cantidad Pagos": s.cantidadPagos,
      Vencidos: s.vencidos,
    }))

    // Hoja 2: Detalle de Pagos
    const detailData = payments.map((p) => {
      const amount = parseFloat(p.amount || "0")
      const paidAmount = parseFloat(p.paid_amount || "0")
      const isOverdue = p.status === "PENDING" && new Date(p.due_date) < new Date()
      return {
        "Código Operación": p.operations?.file_code || "-",
        Destino: p.operations?.destination || "-",
        Operador: p.operators?.name || "-",
        "Monto Total": amount.toFixed(2),
        Moneda: p.currency || "ARS",
        "Monto Pagado": paidAmount.toFixed(2),
        Pendiente: (amount - paidAmount).toFixed(2),
        "Fecha Vencimiento": p.due_date ? format(new Date(p.due_date), "dd/MM/yyyy") : "-",
        Estado: isOverdue ? "Vencido" : statusLabels[p.status] || p.status,
        "Fecha Pago": p.paid_at ? format(new Date(p.paid_at), "dd/MM/yyyy") : "-",
        Parcial: paidAmount > 0 && paidAmount < amount ? "Sí" : "No",
      }
    })

    // Crear libro Excel
    const wb = XLSX.utils.book_new()
    const ws1 = XLSX.utils.json_to_sheet(summaryData)
    const ws2 = XLSX.utils.json_to_sheet(detailData)
    
    XLSX.utils.book_append_sheet(wb, ws1, "Resumen por Operador")
    XLSX.utils.book_append_sheet(wb, ws2, "Detalle Pagos")

    // Descargar
    const today = new Date().toISOString().split("T")[0]
    XLSX.writeFile(wb, `cuentas-por-pagar-${today}.xlsx`)
  }

  const overdueCount = payments.filter((p) => p.status === "OVERDUE" || (p.status === "PENDING" && new Date(p.due_date) < new Date())).length
  const pendingCount = payments.filter((p) => p.status === "PENDING").length
  
  // Separar totales por moneda para evitar sumar incorrectamente
  const totalPendingUSD = payments
    .filter((p) => (p.status === "PENDING" || p.status === "OVERDUE") && p.currency === "USD")
    .reduce((sum, p) => {
      const amount = parseFloat(p.amount || "0")
      const paidAmount = parseFloat(p.paid_amount || "0")
      return sum + (amount - paidAmount)
    }, 0)
  
  const totalPendingARS = payments
    .filter((p) => (p.status === "PENDING" || p.status === "OVERDUE") && p.currency === "ARS")
    .reduce((sum, p) => {
      const amount = parseFloat(p.amount || "0")
      const paidAmount = parseFloat(p.paid_amount || "0")
      return sum + (amount - paidAmount)
    }, 0)

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header con tooltip */}
      <div className="flex items-center gap-2">
        <h1 className="text-3xl font-bold">Pagos a Operadores</h1>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <HelpCircle className="h-5 w-5 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="font-medium mb-1">¿Cómo funciona?</p>
              <p className="text-xs">
                Aquí ves todas las cuentas por pagar a operadores. Puedes filtrar por operador, 
                fecha de vencimiento, monto y estado. Usa el botón &quot;Exportar Excel&quot; 
                para descargar un reporte completo.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <p className="text-muted-foreground">
        Gestiona las cuentas por pagar a operadores y proveedores
      </p>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCount}</div>
            <p className="text-xs text-muted-foreground mt-1">pagos pendientes</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Vencidos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{overdueCount}</div>
            <p className="text-xs text-muted-foreground mt-1">pagos vencidos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total a Pagar (USD)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalPendingUSD, "USD")}</div>
            <p className="text-xs text-muted-foreground mt-1">en dólares</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total a Pagar (ARS)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalPendingARS, "ARS")}</div>
            <p className="text-xs text-muted-foreground mt-1">en pesos</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros Avanzados */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Filtros</CardTitle>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" />
                Limpiar filtros
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 items-end">
            {/* Operador */}
            <div className="space-y-1.5">
              <Label className="text-xs">Operador</Label>
              <Select value={operatorFilter} onValueChange={setOperatorFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos</SelectItem>
                  {operators.map((op) => (
                    <SelectItem key={op.id} value={op.id}>
                      {op.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Agencia */}
            <div className="space-y-1.5">
              <Label className="text-xs">Agencia</Label>
              <Select value={agencyFilter} onValueChange={setAgencyFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todas</SelectItem>
                  {agencies.map((agency) => (
                    <SelectItem key={agency.id} value={agency.id}>
                      {agency.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Estado */}
            <div className="space-y-1.5">
              <Label className="text-xs">Estado</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos</SelectItem>
                  <SelectItem value="PENDING">Pendientes</SelectItem>
                  <SelectItem value="OVERDUE">Vencidos</SelectItem>
                  <SelectItem value="PAID">Pagados</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Búsqueda por operación */}
            <div className="space-y-1.5">
              <Label className="text-xs">Buscar Operación</Label>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Código o destino..."
                  value={operationSearch}
                  onChange={(e) => setOperationSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            {/* Fecha Desde */}
            <div className="space-y-1.5">
              <Label className="text-xs">Venc. Desde</Label>
              <DatePicker
                value={dueDateFrom}
                onChange={setDueDateFrom}
                placeholder="Seleccionar fecha"
              />
            </div>

            {/* Fecha Hasta */}
            <div className="space-y-1.5">
              <Label className="text-xs">Venc. Hasta</Label>
              <DatePicker
                value={dueDateTo}
                onChange={setDueDateTo}
                placeholder="Seleccionar fecha"
                minDate={dueDateFrom ? new Date(dueDateFrom + "T12:00:00") : undefined}
              />
            </div>

            {/* Monto Mínimo */}
            <div className="space-y-1.5">
              <Label className="text-xs">Monto Mín.</Label>
              <Input
                type="number"
                placeholder="0"
                value={amountMin}
                onChange={(e) => setAmountMin(e.target.value)}
              />
            </div>

            {/* Monto Máximo */}
            <div className="space-y-1.5">
              <Label className="text-xs">Monto Máx.</Label>
              <Input
                type="number"
                placeholder="999999"
                value={amountMax}
                onChange={(e) => setAmountMax(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Cuentas por Pagar</CardTitle>
              <CardDescription>
                {payments.length} pago{payments.length !== 1 ? "s" : ""} encontrado{payments.length !== 1 ? "s" : ""}
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              onClick={handleExportExcel}
              disabled={payments.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Exportar Excel
            </Button>
            <Button onClick={() => setBulkPaymentOpen(true)}>
              <CreditCard className="h-4 w-4 mr-2" />
              Pago Masivo
            </Button>
            <Button variant="outline" onClick={() => setManualPaymentOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Deuda Manual
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No se encontraron pagos con los filtros seleccionados
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Operación</TableHead>
                  <TableHead>Operador</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Pagado</TableHead>
                  <TableHead>Pendiente</TableHead>
                  <TableHead>Fecha Vencimiento</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => {
                  const amount = parseFloat(payment.amount || "0")
                  const paidAmount = parseFloat(payment.paid_amount || "0")
                  const pendingAmount = amount - paidAmount
                  const isOverdue =
                    payment.status === "PENDING" &&
                    new Date(payment.due_date) < new Date()
                  const displayStatus = isOverdue ? "OVERDUE" : payment.status
                  const isPartial = paidAmount > 0 && paidAmount < amount

                  return (
                    <TableRow key={payment.id}>
                      <TableCell>
                        <div className="font-mono text-xs">
                          {payment.operations?.file_code || "-"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {payment.operations?.destination || "-"}
                        </div>
                      </TableCell>
                      <TableCell>{payment.operators?.name || "-"}</TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(amount, payment.currency)}
                      </TableCell>
                      <TableCell className="text-green-600">
                        {paidAmount > 0 ? formatCurrency(paidAmount, payment.currency) : "-"}
                      </TableCell>
                      <TableCell className={pendingAmount > 0 ? "text-orange-600 font-medium" : ""}>
                        {formatCurrency(pendingAmount, payment.currency)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {format(new Date(payment.due_date), "dd/MM/yyyy", { locale: es })}
                          {isOverdue && (
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Badge className={statusColors[displayStatus] || "bg-gray-500"}>
                            {statusLabels[displayStatus] || displayStatus}
                          </Badge>
                          {isPartial && (
                            <Badge variant="outline" className="text-xs">
                              Parcial
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Pago Masivo */}
      <BulkPaymentDialog
        open={bulkPaymentOpen}
        onOpenChange={setBulkPaymentOpen}
        operators={operators}
        onSuccess={() => {
          fetchPayments()
          setBulkPaymentOpen(false)
        }}
      />

      {/* Dialog para deuda manual a operador */}
      <ManualPaymentDialog
        open={manualPaymentOpen}
        onOpenChange={setManualPaymentOpen}
        onSuccess={() => {
          fetchPayments()
        }}
        direction="EXPENSE"
      />
    </div>
  )
}
