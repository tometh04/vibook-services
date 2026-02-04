"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, Download, CheckCircle2, AlertTriangle, FileSpreadsheet, Users, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import * as XLSX from "xlsx"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface MonthlyPositionPageClientProps {
  agencies: Array<{ id: string; name: string }>
  userRole: string
}

interface Partner {
  id: string
  partner_name: string
  profit_percentage: number
}

interface MonthlyPosition {
  year: number
  month: number
  dateTo: string
  activo: {
    corriente: { ars: number; usd: number }
    no_corriente: { ars: number; usd: number }
    total: { ars: number; usd: number }
  }
  pasivo: {
    corriente: { ars: number; usd: number }
    no_corriente: { ars: number; usd: number }
    total: { ars: number; usd: number }
  }
  patrimonio_neto: {
    total: number
  }
  resultado: {
    ingresos: number
    costos: number
    gastos: number
    total: number
    ingresosARS?: number
    ingresosUSD?: number
    costosARS?: number
    costosUSD?: number
    gastosARS?: number
    gastosUSD?: number
    resultadoARS?: number
    resultadoUSD?: number
  }
}

function formatCurrency(amount: number, currency: "ARS" | "USD" = "ARS"): string {
  // Para USD, usar formato con punto como separador decimal
  if (currency === "USD") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }
  
  // Para ARS, usar formato argentino sin decimales
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(amount))
}

const monthNames = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
]

export function MonthlyPositionPageClient({ agencies, userRole }: MonthlyPositionPageClientProps) {
  const currentDate = new Date()
  const [year, setYear] = useState(currentDate.getFullYear())
  const [month, setMonth] = useState(currentDate.getMonth() + 1)
  const [agencyId, setAgencyId] = useState<string>("ALL")
  const [position, setPosition] = useState<MonthlyPosition | null>(null)
  const [loading, setLoading] = useState(true)
  const [datePickerOpen, setDatePickerOpen] = useState(false)
  
  // Estado para distribución a socios
  const [distributionOpen, setDistributionOpen] = useState(false)
  const [partners, setPartners] = useState<Partner[]>([])
  const [loadingPartners, setLoadingPartners] = useState(false)

  const fetchPosition = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        year: year.toString(),
        month: month.toString(),
        agencyId,
      })
      console.log(`[MonthlyPosition] Fetching with params: year=${year}, month=${month}, agencyId=${agencyId}`)
      const response = await fetch(`/api/accounting/monthly-position?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        console.log(`[MonthlyPosition] Received data:`, data)
        setPosition(data)
      } else {
        const errorText = await response.text()
        console.error("Error fetching monthly position:", response.status, errorText)
      }
    } catch (error) {
      console.error("Error:", error)
    } finally {
      setLoading(false)
    }
  }, [year, month, agencyId])

  useEffect(() => {
    fetchPosition()
  }, [fetchPosition])

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setYear(date.getFullYear())
      setMonth(date.getMonth() + 1)
      setDatePickerOpen(false)
    }
  }

  // Cargar socios y abrir dialog de distribución
  const handleOpenDistribution = async () => {
    setLoadingPartners(true)
    try {
      const response = await fetch("/api/partner-accounts")
      if (response.ok) {
        const data = await response.json()
        setPartners(data.partners || [])
        setDistributionOpen(true)
      } else {
        toast.error("Error al cargar socios")
      }
    } catch (error) {
      toast.error("Error al cargar socios")
    } finally {
      setLoadingPartners(false)
    }
  }

  // Calcular distribución por socio
  const getDistribution = () => {
    if (!position || partners.length === 0) return []
    
    const resultado = position.resultado.resultadoARS || position.resultado.total
    const resultadoUSD = position.resultado.resultadoUSD || 0
    
    return partners.map(partner => ({
      ...partner,
      amountARS: (resultado * (partner.profit_percentage / 100)),
      amountUSD: (resultadoUSD * (partner.profit_percentage / 100)),
    }))
  }

  const selectedDate = new Date(year, month - 1, 1)

  // Verificación contable: Activo = Pasivo + Patrimonio Neto
  const verificacionContable = position ? {
    activo: position.activo.total.ars,
    pasivoPlusPN: position.pasivo.total.ars + position.patrimonio_neto.total,
    balanceado: Math.abs(position.activo.total.ars - (position.pasivo.total.ars + position.patrimonio_neto.total)) < 1, // Tolerancia de $1
    diferencia: position.activo.total.ars - (position.pasivo.total.ars + position.patrimonio_neto.total),
  } : null

  // Exportar a Excel
  const handleExportExcel = () => {
    if (!position) return

    const wb = XLSX.utils.book_new()

    // Hoja 1: Balance General
    const balanceData = [
      ["BALANCE GENERAL - " + monthNames[month - 1] + " " + year],
      [""],
      ["ACTIVO"],
      ["Activo Corriente (ARS)", formatCurrency(position.activo.corriente.ars, "ARS")],
      ["Activo Corriente (USD)", formatCurrency(position.activo.corriente.usd, "USD")],
      ["Activo No Corriente (ARS)", formatCurrency(position.activo.no_corriente.ars, "ARS")],
      ["Activo No Corriente (USD)", formatCurrency(position.activo.no_corriente.usd, "USD")],
      ["TOTAL ACTIVO (ARS)", formatCurrency(position.activo.total.ars, "ARS")],
      ["TOTAL ACTIVO (USD)", formatCurrency(position.activo.total.usd, "USD")],
      [""],
      ["PASIVO"],
      ["Pasivo Corriente (ARS)", formatCurrency(position.pasivo.corriente.ars, "ARS")],
      ["Pasivo Corriente (USD)", formatCurrency(position.pasivo.corriente.usd, "USD")],
      ["Pasivo No Corriente (ARS)", formatCurrency(position.pasivo.no_corriente.ars, "ARS")],
      ["Pasivo No Corriente (USD)", formatCurrency(position.pasivo.no_corriente.usd, "USD")],
      ["TOTAL PASIVO (ARS)", formatCurrency(position.pasivo.total.ars, "ARS")],
      ["TOTAL PASIVO (USD)", formatCurrency(position.pasivo.total.usd, "USD")],
      [""],
      ["PATRIMONIO NETO"],
      ["Total Patrimonio Neto", formatCurrency(position.patrimonio_neto.total, "ARS")],
      [""],
      ["VERIFICACIÓN CONTABLE"],
      ["Activo", formatCurrency(position.activo.total.ars, "ARS")],
      ["Pasivo + Patrimonio Neto", formatCurrency(position.pasivo.total.ars + position.patrimonio_neto.total, "ARS")],
      ["Diferencia", formatCurrency(verificacionContable?.diferencia || 0, "ARS")],
      ["Estado", verificacionContable?.balanceado ? "✓ BALANCEADO" : "⚠ DESCUADRADO"],
    ]

    const ws1 = XLSX.utils.aoa_to_sheet(balanceData)
    XLSX.utils.book_append_sheet(wb, ws1, "Balance General")

    // Hoja 2: Estado de Resultados
    const resultadoData = [
      ["ESTADO DE RESULTADOS - " + monthNames[month - 1] + " " + year],
      [""],
      ["Concepto", "ARS", "USD"],
      ["Ingresos", formatCurrency(position.resultado.ingresosARS || 0, "ARS"), formatCurrency(position.resultado.ingresosUSD || 0, "USD")],
      ["(-) Costos", formatCurrency(position.resultado.costosARS || 0, "ARS"), formatCurrency(position.resultado.costosUSD || 0, "USD")],
      ["(-) Gastos", formatCurrency(position.resultado.gastosARS || 0, "ARS"), formatCurrency(position.resultado.gastosUSD || 0, "USD")],
      [""],
      ["RESULTADO DEL MES", formatCurrency(position.resultado.resultadoARS || 0, "ARS"), formatCurrency(position.resultado.resultadoUSD || 0, "USD")],
    ]

    const ws2 = XLSX.utils.aoa_to_sheet(resultadoData)
    XLSX.utils.book_append_sheet(wb, ws2, "Estado de Resultados")

    // Descargar archivo
    const fileName = `posicion-contable-${year}-${String(month).padStart(2, "0")}.xlsx`
    XLSX.writeFile(wb, fileName)
    toast.success("Archivo exportado correctamente")
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Posición Contable Mensual</h1>
          <p className="text-muted-foreground">Estado de situación patrimonial al cierre del mes</p>
        </div>
        {position && (
          <div className="flex gap-2">
            {(userRole === "SUPER_ADMIN" || userRole === "ADMIN") && (
              <Button onClick={handleOpenDistribution} variant="outline" disabled={loadingPartners}>
                {loadingPartners ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Users className="mr-2 h-4 w-4" />
                )}
                Distribuir a Socios
              </Button>
            )}
            <Button onClick={handleExportExcel} variant="outline">
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Exportar Excel
            </Button>
          </div>
        )}
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label>Mes y Año</Label>
              <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? (
                      format(selectedDate, "MMMM yyyy", { locale: es })
                    ) : (
                      <span>Seleccionar fecha</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleDateSelect}
                    defaultMonth={selectedDate}
                    locale={es}
                    captionLayout="dropdown"
                    fromYear={2020}
                    toYear={2030}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {agencies.length > 0 && (
              <div className="space-y-2">
                <Label>Agencia</Label>
                <Select value={agencyId} onValueChange={setAgencyId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas las agencias" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todas las agencias</SelectItem>
                    {agencies.map((agency) => (
                      <SelectItem key={agency.id} value={agency.id}>
                        {agency.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">Cargando posición contable...</div>
          </CardContent>
        </Card>
      ) : position ? (
        <>
          {/* Resumen Ejecutivo */}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Activo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold text-green-600 break-words">
                  {formatCurrency(position.activo.total.ars, "ARS")}
                  {position.activo.total.usd > 0 && (
                    <span className="ml-2 text-sm sm:text-base text-muted-foreground">
                      ({formatCurrency(position.activo.total.usd, "USD")})
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Pasivo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold text-red-600 break-words">
                  {formatCurrency(position.pasivo.total.ars, "ARS")}
                  {position.pasivo.total.usd > 0 && (
                    <span className="ml-2 text-sm sm:text-base text-muted-foreground">
                      ({formatCurrency(position.pasivo.total.usd, "USD")})
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Patrimonio Neto</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold text-blue-600 break-words">
                  {formatCurrency(position.patrimonio_neto.total)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Resultado del Mes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-xl sm:text-2xl font-bold break-words ${(position.resultado.resultadoARS || position.resultado.total) >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatCurrency(position.resultado.resultadoARS || position.resultado.total, "ARS")}
                  {position.resultado.resultadoUSD !== undefined && position.resultado.resultadoUSD !== 0 && (
                    <span className="ml-2 text-sm sm:text-base text-muted-foreground">
                      ({formatCurrency(position.resultado.resultadoUSD, "USD")})
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Verificación Contable */}
          {verificacionContable && (
            <Card className={verificacionContable.balanceado ? "border-green-500/50 bg-green-500/5" : "border-yellow-500/50 bg-yellow-500/5"}>
              <CardContent className="py-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {verificacionContable.balanceado ? (
                      <CheckCircle2 className="h-6 w-6 text-green-600" />
                    ) : (
                      <AlertTriangle className="h-6 w-6 text-yellow-600" />
                    )}
                    <div>
                      <p className="font-semibold">Verificación Contable</p>
                      <p className="text-sm text-muted-foreground">
                        Activo = Pasivo + Patrimonio Neto
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="text-right">
                      <p className="text-muted-foreground">Activo</p>
                      <p className="font-mono font-medium">{formatCurrency(verificacionContable.activo, "ARS")}</p>
                    </div>
                    <span className="text-muted-foreground">=</span>
                    <div className="text-right">
                      <p className="text-muted-foreground">Pasivo + PN</p>
                      <p className="font-mono font-medium">{formatCurrency(verificacionContable.pasivoPlusPN, "ARS")}</p>
                    </div>
                    <Badge variant={verificacionContable.balanceado ? "default" : "secondary"} className={verificacionContable.balanceado ? "bg-green-600" : "bg-yellow-600"}>
                      {verificacionContable.balanceado ? "Balanceado" : `Dif: ${formatCurrency(verificacionContable.diferencia, "ARS")}`}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Detalle por Rubros */}
          <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
            {/* ACTIVO */}
            <Card>
              <CardHeader>
                <CardTitle>ACTIVO</CardTitle>
                <CardDescription>Recursos y bienes de la empresa</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-2">
                    <span className="text-sm font-medium">Activo Corriente</span>
                    <div className="font-bold text-green-600 text-sm sm:text-base break-words">
                      {formatCurrency(position.activo.corriente.ars, "ARS")}
                      {position.activo.corriente.usd > 0 && (
                        <span className="ml-2 text-xs sm:text-sm text-muted-foreground">
                          ({formatCurrency(position.activo.corriente.usd, "USD")})
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Caja, Bancos, Cuentas por Cobrar, Activos en Stock
                  </div>
                </div>
                <div>
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-2">
                    <span className="text-sm font-medium">Activo No Corriente</span>
                    <div className="font-bold text-green-600 text-sm sm:text-base break-words">
                      {formatCurrency(position.activo.no_corriente.ars, "ARS")}
                      {position.activo.no_corriente.usd > 0 && (
                        <span className="ml-2 text-xs sm:text-sm text-muted-foreground">
                          ({formatCurrency(position.activo.no_corriente.usd, "USD")})
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Inversiones a largo plazo
                  </div>
                </div>
                <div className="pt-2 border-t">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                    <span className="text-base sm:text-lg font-bold">Total Activo</span>
                    <div className="text-base sm:text-lg font-bold text-green-600 break-words">
                      {formatCurrency(position.activo.total.ars, "ARS")}
                      {position.activo.total.usd > 0 && (
                        <span className="ml-2 text-xs sm:text-sm text-muted-foreground">
                          ({formatCurrency(position.activo.total.usd, "USD")})
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* PASIVO Y PATRIMONIO */}
            <Card>
              <CardHeader>
                <CardTitle>PASIVO Y PATRIMONIO NETO</CardTitle>
                <CardDescription>Obligaciones y capital</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-2">
                    <span className="text-sm font-medium">Pasivo Corriente</span>
                    <div className="font-bold text-red-600 text-sm sm:text-base break-words">
                      {formatCurrency(position.pasivo.corriente.ars, "ARS")}
                      {position.pasivo.corriente.usd > 0 && (
                        <span className="ml-2 text-xs sm:text-sm text-muted-foreground">
                          ({formatCurrency(position.pasivo.corriente.usd, "USD")})
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Cuentas por Pagar, IVA a Pagar, Sueldos a Pagar
                  </div>
                </div>
                <div>
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-2">
                    <span className="text-sm font-medium">Pasivo No Corriente</span>
                    <div className="font-bold text-red-600 text-sm sm:text-base break-words">
                      {formatCurrency(position.pasivo.no_corriente.ars, "ARS")}
                      {position.pasivo.no_corriente.usd > 0 && (
                        <span className="ml-2 text-xs sm:text-sm text-muted-foreground">
                          ({formatCurrency(position.pasivo.no_corriente.usd, "USD")})
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Préstamos a largo plazo
                  </div>
                </div>
                <div className="pt-2 border-t">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-2">
                    <span className="text-sm font-medium">Total Pasivo</span>
                    <div className="font-bold text-red-600 text-sm sm:text-base break-words">
                      {formatCurrency(position.pasivo.total.ars, "ARS")}
                      {position.pasivo.total.usd > 0 && (
                        <span className="ml-2 text-xs sm:text-sm text-muted-foreground">
                          ({formatCurrency(position.pasivo.total.usd, "USD")})
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div>
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-2">
                    <span className="text-sm font-medium">Patrimonio Neto</span>
                    <span className="font-bold text-blue-600 text-sm sm:text-base break-words">{formatCurrency(position.patrimonio_neto.total)}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Capital, Reservas, Resultados Acumulados
                  </div>
                </div>
                <div className="pt-2 border-t">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                    <span className="text-base sm:text-lg font-bold">Total Pasivo + Patrimonio</span>
                    <div className="text-base sm:text-lg font-bold break-words">
                      {formatCurrency(position.pasivo.total.ars + position.patrimonio_neto.total, "ARS")}
                      {position.pasivo.total.usd > 0 && (
                        <span className="ml-2 text-xs sm:text-sm text-muted-foreground">
                          ({formatCurrency(position.pasivo.total.usd, "USD")})
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* RESULTADO DEL MES */}
          <Card>
            <CardHeader>
              <CardTitle>RESULTADO DEL MES ({monthNames[month - 1]} {year})</CardTitle>
              <CardDescription>Estado de resultados del período</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-2">
                  <span className="text-sm font-medium">Ingresos</span>
                  <div className="font-bold text-green-600 text-sm sm:text-base break-words">
                    {formatCurrency((position.resultado.ingresosARS || 0), "ARS")}
                    {(position.resultado.ingresosUSD !== undefined && position.resultado.ingresosUSD !== 0) && (
                      <span className="ml-2 text-xs sm:text-sm text-muted-foreground">
                        ({formatCurrency(position.resultado.ingresosUSD, "USD")})
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  Ventas de Viajes, Otros Ingresos
                </div>
              </div>
              <div>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-2">
                  <span className="text-sm font-medium">Costos</span>
                  <div className="font-bold text-red-600 text-sm sm:text-base break-words">
                    {(position.resultado.costosARS || 0) > 0 ? (
                      <>-{formatCurrency(position.resultado.costosARS || 0, "ARS")}</>
                    ) : (
                      <>{formatCurrency(0, "ARS")}</>
                    )}
                    {(position.resultado.costosUSD !== undefined && position.resultado.costosUSD !== 0) && (
                      <span className="ml-2 text-xs sm:text-sm text-muted-foreground">
                        (-{formatCurrency(position.resultado.costosUSD, "USD")})
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  Costo de Operadores, Otros Costos
                </div>
              </div>
              <div>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-2">
                  <span className="text-sm font-medium">Gastos</span>
                  <div className="font-bold text-red-600 text-sm sm:text-base break-words">
                    {(position.resultado.gastosARS || 0) > 0 ? (
                      <>-{formatCurrency(position.resultado.gastosARS || 0, "ARS")}</>
                    ) : (
                      <>{formatCurrency(0, "ARS")}</>
                    )}
                    {(position.resultado.gastosUSD !== undefined && position.resultado.gastosUSD !== 0) && (
                      <span className="ml-2 text-xs sm:text-sm text-muted-foreground">
                        (-{formatCurrency(position.resultado.gastosUSD, "USD")})
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  Gastos Administrativos, Comercialización y Gastos Financieros
                </div>
              </div>
              <div className="pt-2 border-t">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                  <span className="text-base sm:text-lg font-bold">Resultado del Mes</span>
                  <div className={`text-base sm:text-lg font-bold break-words ${(position.resultado.resultadoARS || position.resultado.total) >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {formatCurrency(position.resultado.resultadoARS || position.resultado.total, "ARS")}
                    {position.resultado.resultadoUSD !== undefined && position.resultado.resultadoUSD !== 0 && (
                      <span className="ml-2 text-xs sm:text-sm text-muted-foreground">
                        ({formatCurrency(position.resultado.resultadoUSD, "USD")})
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">No se pudo cargar la posición contable</div>
          </CardContent>
        </Card>
      )}

      {/* Dialog de Distribución a Socios */}
      <Dialog open={distributionOpen} onOpenChange={setDistributionOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Distribución de Ganancias a Socios</DialogTitle>
            <DialogDescription>
              Vista previa de la distribución del resultado de {monthNames[month - 1]} {year}
            </DialogDescription>
          </DialogHeader>

          {position && (
            <div className="space-y-4">
              {/* Resultado del mes */}
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Resultado del Mes</span>
                  <div className="text-right">
                    <span className={`font-bold ${(position.resultado.resultadoARS || 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {formatCurrency(position.resultado.resultadoARS || position.resultado.total, "ARS")}
                    </span>
                    {(position.resultado.resultadoUSD || 0) !== 0 && (
                      <span className="ml-2 text-muted-foreground">
                        ({formatCurrency(position.resultado.resultadoUSD || 0, "USD")})
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Tabla de distribución */}
              {partners.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Socio</TableHead>
                      <TableHead className="text-right">%</TableHead>
                      <TableHead className="text-right">ARS</TableHead>
                      <TableHead className="text-right">USD</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getDistribution().map((partner) => (
                      <TableRow key={partner.id}>
                        <TableCell className="font-medium">{partner.partner_name}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline">{partner.profit_percentage}%</Badge>
                        </TableCell>
                        <TableCell className={`text-right ${partner.amountARS >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {formatCurrency(partner.amountARS, "ARS")}
                        </TableCell>
                        <TableCell className={`text-right ${partner.amountUSD >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {formatCurrency(partner.amountUSD, "USD")}
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* Total */}
                    <TableRow className="font-bold border-t-2">
                      <TableCell>TOTAL</TableCell>
                      <TableCell className="text-right">
                        {partners.reduce((sum, p) => sum + (p.profit_percentage || 0), 0)}%
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(getDistribution().reduce((sum, p) => sum + p.amountARS, 0), "ARS")}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(getDistribution().reduce((sum, p) => sum + p.amountUSD, 0), "USD")}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No hay socios configurados con porcentajes de ganancia.</p>
                  <p className="text-sm mt-1">Configuralos en Contabilidad → Cuentas de Socios</p>
                </div>
              )}

              {/* Advertencia si no suma 100% */}
              {partners.length > 0 && partners.reduce((sum, p) => sum + (p.profit_percentage || 0), 0) !== 100 && (
                <div className="flex items-center gap-2 p-3 bg-yellow-500/10 rounded-lg text-yellow-600">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm">
                    Los porcentajes no suman 100%. Hay {100 - partners.reduce((sum, p) => sum + (p.profit_percentage || 0), 0)}% sin asignar.
                  </span>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDistributionOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
