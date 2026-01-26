"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatCurrency } from "@/lib/currency"
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { ArrowUpCircle, ArrowDownCircle, HelpCircle } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface CashSummaryClientProps {
  agencies: Array<{ id: string; name: string }>
  defaultDateFrom: string
  defaultDateTo: string
}

interface AccountBalance {
  id: string
  name: string
  type: string
  currency: string
  current_balance: number
}

interface DailyBalance {
  date: string
  balance: number
}

interface CashMovement {
  id: string
  type: "INCOME" | "EXPENSE"
  concept: string
  currency: "ARS" | "USD"
  amount: number
  created_at: string
  reference?: string
}

const chartConfig = {
  balance: {
    label: "Balance",
    theme: {
      light: "hsl(142, 76%, 36%)",
      dark: "hsl(142, 76%, 50%)",
    },
  },
} satisfies ChartConfig

export function CashSummaryClient({ agencies, defaultDateFrom, defaultDateTo }: CashSummaryClientProps) {
  const [dateFrom, setDateFrom] = useState(defaultDateFrom)
  const [dateTo, setDateTo] = useState(defaultDateTo)
  const [accounts, setAccounts] = useState<AccountBalance[]>([])
  const [dailyBalances, setDailyBalances] = useState<DailyBalance[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("resumen")
  const [accountMovements, setAccountMovements] = useState<Record<string, CashMovement[]>>({})
  const [loadingMovements, setLoadingMovements] = useState<Record<string, boolean>>({})
  const [totalIncome, setTotalIncome] = useState({ ars: 0, usd: 0 })
  const [totalExpenses, setTotalExpenses] = useState({ ars: 0, usd: 0 })

  const fetchSummary = useCallback(async () => {
    setLoading(true)
    try {
      // Obtener balances de cuentas financieras
      const accountsResponse = await fetch("/api/accounting/financial-accounts")
      if (accountsResponse.ok) {
        const accountsData = await accountsResponse.json()
        setAccounts(accountsData.accounts || [])
      }

      // Obtener evolución diaria de la caja
      const dailyResponse = await fetch(
        `/api/cash/daily-balance?dateFrom=${dateFrom}&dateTo=${dateTo}`
      )
      if (dailyResponse.ok) {
        const dailyData = await dailyResponse.json()
        setDailyBalances(dailyData.dailyBalances || [])
      }

      // Obtener ingresos totales
      const incomeParams = new URLSearchParams()
      incomeParams.set("dateFrom", dateFrom)
      incomeParams.set("dateTo", dateTo)
      incomeParams.set("direction", "INCOME")
      incomeParams.set("status", "PAID")
      const incomeResponse = await fetch(`/api/payments?${incomeParams.toString()}`)
      if (incomeResponse.ok) {
        const incomeData = await incomeResponse.json()
        const payments = incomeData.payments || []
        const ars = payments
          .filter((p: any) => p.currency === "ARS")
          .reduce((sum: number, p: any) => sum + parseFloat(p.amount?.toString() || "0"), 0)
        const usd = payments
          .filter((p: any) => p.currency === "USD")
          .reduce((sum: number, p: any) => sum + parseFloat(p.amount?.toString() || "0"), 0)
        setTotalIncome({ ars, usd })
      }

      // Obtener egresos totales
      const expenseParams = new URLSearchParams()
      expenseParams.set("dateFrom", dateFrom)
      expenseParams.set("dateTo", dateTo)
      expenseParams.set("direction", "EXPENSE")
      expenseParams.set("status", "PAID")
      const expenseResponse = await fetch(`/api/payments?${expenseParams.toString()}`)
      if (expenseResponse.ok) {
        const expenseData = await expenseResponse.json()
        const payments = expenseData.payments || []
        const ars = payments
          .filter((p: any) => p.currency === "ARS")
          .reduce((sum: number, p: any) => sum + parseFloat(p.amount?.toString() || "0"), 0)
        const usd = payments
          .filter((p: any) => p.currency === "USD")
          .reduce((sum: number, p: any) => sum + parseFloat(p.amount?.toString() || "0"), 0)
        setTotalExpenses({ ars, usd })
      }
    } catch (error) {
      console.error("Error fetching summary:", error)
    } finally {
      setLoading(false)
    }
  }, [dateFrom, dateTo])

  useEffect(() => {
    fetchSummary()
  }, [fetchSummary])

  // Calcular KPIs - Incluir todos los tipos de cuenta bancaria
  const kpis = useMemo(() => {
    // Efectivo ARS: CASH_ARS
    const efectivoARS = accounts
      .filter((acc) => acc.type === "CASH_ARS")
      .reduce((sum, acc) => sum + (acc.current_balance || 0), 0)

    // Efectivo USD: CASH_USD
    const efectivoUSD = accounts
      .filter((acc) => acc.type === "CASH_USD")
      .reduce((sum, acc) => sum + (acc.current_balance || 0), 0)

    // Caja Ahorro ARS: SAVINGS_ARS + CHECKING_ARS (cuentas corrientes también)
    const cajaAhorroARS = accounts
      .filter((acc) => acc.type === "SAVINGS_ARS" || acc.type === "CHECKING_ARS")
      .reduce((sum, acc) => sum + (acc.current_balance || 0), 0)

    // Caja Ahorro USD: SAVINGS_USD + CHECKING_USD (cuentas corrientes también)
    const cajaAhorroUSD = accounts
      .filter((acc) => acc.type === "SAVINGS_USD" || acc.type === "CHECKING_USD")
      .reduce((sum, acc) => sum + (acc.current_balance || 0), 0)

    return {
      efectivoARS,
      efectivoUSD,
      cajaAhorroARS,
      cajaAhorroUSD,
    }
  }, [accounts])

  // Filtrar y ordenar cuentas por moneda y saldo (descendente)
  const usdAccounts = useMemo(() => {
    return accounts
      .filter((acc) => acc.currency === "USD")
      .sort((a, b) => (b.current_balance || 0) - (a.current_balance || 0))
  }, [accounts])

  const arsAccounts = useMemo(() => {
    return accounts
      .filter((acc) => acc.currency === "ARS")
      .sort((a, b) => (b.current_balance || 0) - (a.current_balance || 0))
  }, [accounts])

  // Cargar movimientos de una cuenta
  const fetchAccountMovements = useCallback(async (accountId: string) => {
    if (accountMovements[accountId]) return // Ya cargados
    
    setLoadingMovements(prev => ({ ...prev, [accountId]: true }))
    try {
      const response = await fetch(
        `/api/cash/movements?accountId=${accountId}&dateFrom=${dateFrom}&dateTo=${dateTo}&limit=20`
      )
      if (response.ok) {
        const data = await response.json()
        setAccountMovements(prev => ({ ...prev, [accountId]: data.movements || [] }))
      }
    } catch (error) {
      console.error("Error fetching movements:", error)
    } finally {
      setLoadingMovements(prev => ({ ...prev, [accountId]: false }))
    }
  }, [dateFrom, dateTo, accountMovements])

  // OPTIMIZACIÓN: Cargar movimientos en paralelo cuando se cambia de tab
  useEffect(() => {
    const accountsToLoad = activeTab === "usd" ? usdAccounts : activeTab === "ars" ? arsAccounts : []
    
    // Filtrar cuentas que aún no tienen movimientos cargados
    const accountsToFetch = accountsToLoad.filter(acc => !accountMovements[acc.id])
    
    if (accountsToFetch.length > 0) {
      // Paralelizar todos los fetches
      Promise.all(
        accountsToFetch.map(acc => fetchAccountMovements(acc.id))
      ).catch(error => {
        console.error("Error fetching account movements in parallel:", error)
      })
    }
  }, [activeTab, usdAccounts, arsAccounts, accountMovements, fetchAccountMovements])

  // Calcular ingresos y egresos por cuenta
  const calculateAccountStats = useCallback((accountId: string) => {
    const movements = accountMovements[accountId] || []
    const income = movements
      .filter(m => m.type === "INCOME")
      .reduce((sum, m) => sum + (m.amount || 0), 0)
    const expense = movements
      .filter(m => m.type === "EXPENSE")
      .reduce((sum, m) => sum + (m.amount || 0), 0)
    return { income, expense }
  }, [accountMovements])

  // Preparar datos para el gráfico
  const chartData = useMemo(() => {
    return dailyBalances.map((item) => ({
      date: format(new Date(item.date), "dd/MM", { locale: es }),
      Balance: Math.round(item.balance),
    }))
  }, [dailyBalances])

  // Función para formatear números grandes en el eje Y
  const formatYAxisValue = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(0)}M`
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`
    }
    return `$${Math.round(value)}`
  }

  // Renderizar movimientos de una cuenta
  const renderAccountMovements = (account: AccountBalance, currency: "USD" | "ARS") => {
    const movements = accountMovements[account.id] || []
    const isLoading = loadingMovements[account.id] || false
    const stats = calculateAccountStats(account.id)

    return (
      <Card key={account.id} className="mb-4">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">{account.name}</CardTitle>
              <CardDescription>{account.type.replace("_", " ")}</CardDescription>
            </div>
            <Badge variant="outline" className="text-lg font-semibold">
              {formatCurrency(account.current_balance || 0, currency)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {/* Stats de ingresos/egresos */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="flex items-center gap-2 p-2 rounded-lg bg-green-50 dark:bg-green-950">
              <ArrowUpCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-xs text-muted-foreground">Ingresos</p>
                <p className="font-semibold text-green-600">{formatCurrency(stats.income, currency)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-red-50 dark:bg-red-950">
              <ArrowDownCircle className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-xs text-muted-foreground">Egresos</p>
                <p className="font-semibold text-red-600">{formatCurrency(stats.expense, currency)}</p>
              </div>
            </div>
          </div>

          {/* Tabla de movimientos */}
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : movements.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No hay movimientos en el período seleccionado
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Concepto</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.slice(0, 10).map((mov) => (
                  <TableRow key={mov.id}>
                    <TableCell className="text-sm">
                      {format(new Date(mov.created_at), "dd/MM/yy", { locale: es })}
                    </TableCell>
                    <TableCell className="text-sm">{mov.concept || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={mov.type === "INCOME" ? "default" : "destructive"} className="text-xs">
                        {mov.type === "INCOME" ? "Ingreso" : "Egreso"}
                      </Badge>
                    </TableCell>
                    <TableCell className={`text-right font-medium ${mov.type === "EXPENSE" ? "text-red-600" : "text-green-600"}`}>
                      {mov.type === "EXPENSE" ? "-" : "+"}{formatCurrency(mov.amount || 0, currency)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {movements.length > 10 && (
            <p className="text-xs text-muted-foreground text-center mt-2">
              Mostrando 10 de {movements.length} movimientos
            </p>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-bold">Caja</h1>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-5 w-5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="font-medium mb-1">¿Cómo funciona?</p>
                <p className="text-xs mb-2"><strong>Resumen:</strong> Vista general de todas las cuentas con sus saldos actuales.</p>
                <p className="text-xs mb-2"><strong>Caja USD:</strong> Detalle de cuentas en dólares con movimientos recientes.</p>
                <p className="text-xs"><strong>Caja ARS:</strong> Detalle de cuentas en pesos con movimientos recientes.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <button
          onClick={async () => {
            if (confirm("¿Sincronizar pagos pagados con movimientos de caja?")) {
              try {
                const response = await fetch("/api/cash/sync-movements", { method: "POST" })
                const data = await response.json()
                if (response.ok) {
                  alert(`✅ ${data.message}\nCreados: ${data.created}\nErrores: ${data.errors}`)
                  fetchSummary()
                } else {
                  alert(`❌ Error: ${data.error}`)
                }
              } catch (error) {
                alert("❌ Error al sincronizar")
              }
            }
          }}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 text-sm font-medium"
        >
          Sincronizar Movimientos
        </button>
      </div>
      <p className="text-muted-foreground">Monitorea el estado de la caja y su evolución</p>

      {/* Filtro de fechas */}
      <div className="rounded-lg border bg-card p-4 shadow-sm">
        <div className="space-y-1.5 max-w-xs">
          <label className="text-xs font-medium">Rango de fechas</label>
          <DateRangePicker
            dateFrom={dateFrom}
            dateTo={dateTo}
            onChange={(from, to) => {
              setDateFrom(from)
              setDateTo(to)
              setAccountMovements({}) // Limpiar movimientos para recargar
            }}
            placeholder="Seleccionar rango"
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="resumen">Resumen</TabsTrigger>
          <TabsTrigger value="usd">Caja USD</TabsTrigger>
          <TabsTrigger value="ars">Caja ARS</TabsTrigger>
        </TabsList>

        {/* TAB: Resumen */}
        <TabsContent value="resumen" className="space-y-6">
          {/* KPIs de Ingresos y Egresos */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ingresos Totales ARS</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{formatCurrency(totalIncome.ars, "ARS")}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ingresos Totales USD</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{formatCurrency(totalIncome.usd, "USD")}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Egresos Totales ARS</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{formatCurrency(totalExpenses.ars, "ARS")}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Egresos Totales USD</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{formatCurrency(totalExpenses.usd, "USD")}</div>
              </CardContent>
            </Card>
          </div>

          {/* KPIs de Saldos de Cuentas */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Efectivo ARS</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(kpis.efectivoARS, "ARS")}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Efectivo USD</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(kpis.efectivoUSD, "USD")}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Caja Ahorro ARS</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(kpis.cajaAhorroARS, "ARS")}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Caja Ahorro USD</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(kpis.cajaAhorroUSD, "USD")}</div>
              </CardContent>
            </Card>
          </div>

          {/* Gráfico de evolución */}
          <Card>
            <CardHeader>
              <CardTitle>Evolución de la Caja</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-[300px] flex items-center justify-center">
                  <p className="text-muted-foreground">Cargando...</p>
                </div>
              ) : chartData.length === 0 ? (
                <div className="h-[300px] flex items-center justify-center">
                  <p className="text-muted-foreground">No hay datos disponibles</p>
                </div>
              ) : (
                <ChartContainer config={chartConfig} className="h-[350px] w-full">
                  <LineChart 
                    data={chartData}
                    margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      tickMargin={8}
                      axisLine={false}
                      className="text-xs"
                    />
                    <YAxis
                      tickLine={false}
                      tickMargin={8}
                      axisLine={false}
                      className="text-xs"
                      tickFormatter={formatYAxisValue}
                    />
                    <ChartTooltip
                      cursor={{ stroke: "hsl(142, 76%, 36%)", strokeWidth: 1 }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const value = payload[0].value as number
                          return (
                            <div className="rounded-lg border bg-background p-2 shadow-sm">
                              <div className="grid gap-2">
                                <div className="flex items-center justify-between gap-4">
                                  <span className="text-xs text-muted-foreground">Balance</span>
                                  <span className="font-semibold">{formatCurrency(value, "ARS")}</span>
                                </div>
                              </div>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="Balance"
                      stroke="hsl(142, 76%, 36%)"
                      strokeWidth={3}
                      dot={false}
                      activeDot={{ r: 6, fill: "hsl(142, 76%, 36%)" }}
                    />
                  </LineChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          {/* Lista de cuentas */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Cuentas USD</CardTitle>
              </CardHeader>
              <CardContent>
                {usdAccounts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No hay cuentas USD</p>
                ) : (
                  <div className="space-y-2">
                    {usdAccounts.map((account) => (
                      <div 
                        key={account.id} 
                        className="flex items-center justify-between p-2 border rounded hover:bg-muted/50"
                      >
                        <span className="text-sm">{account.name}</span>
                        <span className={`font-medium ${(account.current_balance || 0) < 0 ? 'text-red-600' : ''}`}>
                          {formatCurrency(account.current_balance || 0, "USD")}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Cuentas ARS</CardTitle>
              </CardHeader>
              <CardContent>
                {arsAccounts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No hay cuentas ARS</p>
                ) : (
                  <div className="space-y-2">
                    {arsAccounts.map((account) => (
                      <div 
                        key={account.id} 
                        className="flex items-center justify-between p-2 border rounded hover:bg-muted/50"
                      >
                        <span className="text-sm">{account.name}</span>
                        <span className={`font-medium ${(account.current_balance || 0) < 0 ? 'text-red-600' : ''}`}>
                          {formatCurrency(account.current_balance || 0, "ARS")}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB: Caja USD */}
        <TabsContent value="usd" className="space-y-4">
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          ) : usdAccounts.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No hay cuentas USD configuradas
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {usdAccounts.map(account => renderAccountMovements(account, "USD"))}
            </div>
          )}
        </TabsContent>

        {/* TAB: Caja ARS */}
        <TabsContent value="ars" className="space-y-4">
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          ) : arsAccounts.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No hay cuentas ARS configuradas
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {arsAccounts.map(account => renderAccountMovements(account, "ARS"))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

