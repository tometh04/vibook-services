"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { ChevronDown, ChevronRight, Download, HelpCircle, ExternalLink, X, Plus } from "lucide-react"
import * as XLSX from "xlsx"
import { ManualPaymentDialog } from "./manual-payment-dialog"

interface DebtorOperation {
  id: string
  file_code: string | null
  destination: string
  sale_amount_total: number
  currency: string
  paid: number
  debt: number
  departure_date: string | null
  seller_id: string | null
  seller_name: string | null
}

interface Debtor {
  customer: {
    id: string
    first_name: string
    last_name: string
    phone: string
    email: string
    document_type: string | null
    document_number: string | null
  }
  totalDebt: number
  currency: string
  operationsWithDebt: DebtorOperation[]
}

interface DebtsSalesPageClientProps {
  sellers: Array<{ id: string; name: string }>
}

export function DebtsSalesPageClient({ sellers }: DebtsSalesPageClientProps) {
  const [debtors, setDebtors] = useState<Debtor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedCustomerId, setExpandedCustomerId] = useState<string | null>(null)
  
  // Filtros
  const [customerFilter, setCustomerFilter] = useState<string>("")
  const [sellerFilter, setSellerFilter] = useState<string>("ALL")
  const [manualPaymentOpen, setManualPaymentOpen] = useState(false)

  const fetchDebtors = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (sellerFilter !== "ALL") {
        params.append("sellerId", sellerFilter)
      }

      const response = await fetch(`/api/accounting/debts-sales?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setDebtors(data.debtors || [])
      } else {
        const errorData = await response.json().catch(() => ({}))
        setError(errorData.error || "Error al obtener deudores")
      }
    } catch (err) {
      console.error("Error fetching debtors:", err)
      setError("Error al obtener deudores")
    } finally {
      setLoading(false)
    }
  }, [sellerFilter])

  useEffect(() => {
    fetchDebtors()
  }, [fetchDebtors])

  const toggleExpand = (customerId: string) => {
    setExpandedCustomerId(expandedCustomerId === customerId ? null : customerId)
  }

  const formatCurrency = (amount: number, currency: string) => {
    return `${currency} ${Math.round(amount).toLocaleString("es-AR")}`
  }

  // Filtrar deudores por búsqueda de nombre
  const filteredDebtors = useMemo(() => {
    if (!customerFilter.trim()) return debtors
    
    const searchTerm = customerFilter.toLowerCase().trim()
    return debtors.filter((debtor) => {
      const firstName = debtor.customer.first_name?.toLowerCase() || ""
      const lastName = debtor.customer.last_name?.toLowerCase() || ""
      const fullName = `${firstName} ${lastName}`.trim()
      return fullName.includes(searchTerm) || firstName.includes(searchTerm) || lastName.includes(searchTerm)
    })
  }, [debtors, customerFilter])

  // Totales
  const totals = useMemo(() => {
    const total = filteredDebtors.reduce((sum, d) => sum + d.totalDebt, 0)
    const count = filteredDebtors.length
    const operationsCount = filteredDebtors.reduce((sum, d) => sum + d.operationsWithDebt.length, 0)
    return { total, count, operationsCount }
  }, [filteredDebtors])

  // Exportar a Excel
  const handleExportExcel = () => {
    const workbook = XLSX.utils.book_new()

    // Hoja 1: Resumen por Cliente
    const summaryData = filteredDebtors.map((debtor) => ({
      Cliente: `${debtor.customer.first_name || ""} ${debtor.customer.last_name || ""}`.trim(),
      Documento: debtor.customer.document_number || "",
      Email: debtor.customer.email || "",
      Teléfono: debtor.customer.phone || "",
      "Deuda Total (USD)": Math.round(debtor.totalDebt),
      "Cantidad Operaciones": debtor.operationsWithDebt.length,
    }))

    const summarySheet = XLSX.utils.json_to_sheet(summaryData)
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Resumen por Cliente")

    // Hoja 2: Detalle de Operaciones
    const detailData: any[] = []
    filteredDebtors.forEach((debtor) => {
      const customerName = `${debtor.customer.first_name || ""} ${debtor.customer.last_name || ""}`.trim()
      debtor.operationsWithDebt.forEach((op) => {
        detailData.push({
          Cliente: customerName,
          Código: op.file_code || "-",
          Destino: op.destination,
          "Fecha Salida": op.departure_date ? format(new Date(op.departure_date), "dd/MM/yyyy") : "-",
          Vendedor: op.seller_name || "-",
          "Total Venta (USD)": Math.round(op.sale_amount_total),
          "Pagado (USD)": Math.round(op.paid),
          "Deuda (USD)": Math.round(op.debt),
        })
      })
    })

    const detailSheet = XLSX.utils.json_to_sheet(detailData)
    XLSX.utils.book_append_sheet(workbook, detailSheet, "Detalle Operaciones")

    // Descargar
    const today = format(new Date(), "yyyy-MM-dd")
    XLSX.writeFile(workbook, `deudores-por-ventas-${today}.xlsx`)
  }

  // Limpiar filtros
  const clearFilters = () => {
    setCustomerFilter("")
    setSellerFilter("ALL")
  }

  const hasActiveFilters = customerFilter !== "" || sellerFilter !== "ALL"

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <h1 className="text-3xl font-bold">Deudores por Ventas</h1>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <HelpCircle className="h-5 w-5 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="font-medium mb-1">¿Cómo funciona?</p>
              <p className="text-xs">
                Muestra todos los clientes con deudas pendientes. Expandí cada cliente 
                para ver el detalle de sus operaciones con saldo pendiente.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <p className="text-muted-foreground">
        Gestiona las cuentas por cobrar de clientes
      </p>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Filtros</CardTitle>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" />
                Limpiar filtros
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 items-end">
            <div className="space-y-1.5">
              <Label className="text-xs">Buscar Cliente</Label>
              <Input
                placeholder="Nombre o apellido..."
                value={customerFilter}
                onChange={(e) => setCustomerFilter(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Vendedor</Label>
              <Select value={sellerFilter} onValueChange={setSellerFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos</SelectItem>
                  {sellers.map((seller) => (
                    <SelectItem key={seller.id} value={seller.id}>
                      {seller.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button variant="outline" onClick={handleExportExcel} disabled={filteredDebtors.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Exportar Excel
            </Button>

            <Button onClick={() => setManualPaymentOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Cuenta por Cobrar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Deuda Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totals.total, "USD")}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Clientes con Deuda</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.count}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Operaciones Pendientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.operationsCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de Deudores */}
      <Card>
        <CardHeader>
          <CardTitle>Deudores</CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="text-center py-8 text-red-500">{error}</div>
          ) : filteredDebtors.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay clientes con deudas pendientes
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]"></TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Contacto</TableHead>
                  <TableHead className="text-right">Operaciones</TableHead>
                  <TableHead className="text-right">Deuda Total</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDebtors.map((debtor) => {
                  const isExpanded = expandedCustomerId === debtor.customer.id
                  const customerName = `${debtor.customer.first_name || ""} ${debtor.customer.last_name || ""}`.trim()

                  return (
                    <>
                      <TableRow 
                        key={debtor.customer.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => toggleExpand(debtor.customer.id)}
                      >
                        <TableCell>
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{customerName || "Sin nombre"}</div>
                          {debtor.customer.document_number && (
                            <div className="text-xs text-muted-foreground">
                              {debtor.customer.document_type}: {debtor.customer.document_number}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{debtor.customer.phone || "-"}</div>
                          <div className="text-xs text-muted-foreground">{debtor.customer.email || "-"}</div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline">{debtor.operationsWithDebt.length}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-bold text-red-600">
                          {formatCurrency(debtor.totalDebt, debtor.currency || "USD")}
                        </TableCell>
                        <TableCell>
                          <Link href={`/customers/${debtor.customer.id}`} onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="sm">
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                      
                      {/* Detalle expandido */}
                      {isExpanded && (
                        <TableRow key={`${debtor.customer.id}-detail`}>
                          <TableCell colSpan={6} className="bg-muted/30 p-4">
                            <div className="space-y-2">
                              <h4 className="font-medium text-sm">Operaciones con deuda:</h4>
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Código</TableHead>
                                    <TableHead>Destino</TableHead>
                                    <TableHead>Fecha Salida</TableHead>
                                    <TableHead>Vendedor</TableHead>
                                    <TableHead className="text-right">Total</TableHead>
                                    <TableHead className="text-right">Pagado</TableHead>
                                    <TableHead className="text-right">Deuda</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {debtor.operationsWithDebt.map((op) => (
                                    <TableRow key={op.id}>
                                      <TableCell>
                                        <Link href={`/operations/${op.id}`} className="text-primary hover:underline">
                                          {op.file_code || op.id.slice(0, 8)}
                                        </Link>
                                      </TableCell>
                                      <TableCell>{op.destination}</TableCell>
                                      <TableCell>
                                        {op.departure_date 
                                          ? format(new Date(op.departure_date), "dd/MM/yyyy", { locale: es })
                                          : "-"
                                        }
                                      </TableCell>
                                      <TableCell>{op.seller_name || "-"}</TableCell>
                                      <TableCell className="text-right font-mono">
                                        {formatCurrency(op.sale_amount_total, op.currency || "USD")}
                                      </TableCell>
                                      <TableCell className="text-right font-mono text-green-600 dark:text-green-400">
                                        {formatCurrency(op.paid, op.currency || "USD")}
                                      </TableCell>
                                      <TableCell className="text-right font-mono font-bold text-red-600 dark:text-red-400">
                                        {formatCurrency(op.debt, op.currency || "USD")}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  )
                })}
                </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog para cuenta por cobrar manual */}
      <ManualPaymentDialog
        open={manualPaymentOpen}
        onOpenChange={setManualPaymentOpen}
        onSuccess={() => {
          fetchDebtors()
        }}
        direction="INCOME"
      />
    </div>
  )
}
