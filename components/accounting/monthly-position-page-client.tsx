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
import { CalendarIcon, Download, CheckCircle2, AlertTriangle, FileSpreadsheet } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import * as XLSX from "xlsx"

interface MonthlyPositionPageClientProps {
  agencies: Array<{ id: string; name: string }>
  userRole: string
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
          <Button onClick={handleExportExcel} variant="outline">
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Exportar Excel
          </Button>
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
                  Gastos Administrativos, Comercialización, Comisiones, Gastos Financieros
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
    </div>
  )
}

