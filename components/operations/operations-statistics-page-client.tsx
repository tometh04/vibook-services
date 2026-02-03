"use client"

import { useState, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, Plane, TrendingUp, DollarSign, Download, Percent } from "lucide-react"
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import Link from "next/link"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts"
import { formatUSD, formatUSDCompact } from "@/lib/currency"

interface OperationStatistics {
  overview: {
    totalOperations: number
    confirmedOperations: number
    pendingOperations: number
    cancelledOperations: number
    totalSales: number
    totalMargin: number
    avgMarginPercentage: number
    avgTicket: number
    conversionRate: number
  }
  distributions: {
    byStatus: Array<{
      status: string
      label: string
      count: number
    }>
    byDestination: Array<{
      destination: string
      count: number
      totalSales: number
      totalMargin: number
      avgMargin: number
    }>
  }
  trends: {
    monthly: Array<{
      month: string
      monthName: string
      count: number
      sales: number
      margin: number
    }>
  }
  rankings: {
    topDestinations: Array<{
      destination: string
      count: number
      totalSales: number
      totalMargin: number
      avgMargin: number
    }>
    topSellers: Array<{
      id: string
      name: string
      count: number
      sales: number
      margin: number
    }>
  }
}

const STATUS_COLORS: Record<string, string> = {
  PRE_RESERVATION: '#94a3b8',
  RESERVED: '#3b82f6',
  CONFIRMED: '#10b981',
  CANCELLED: '#ef4444',
  TRAVELLED: '#8b5cf6',
  CLOSED: '#64748b',
}

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--chart-6))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
]

export function OperationsStatisticsPageClient() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<OperationStatistics | null>(null)
  const [months, setMonths] = useState("12")

  useEffect(() => {
    loadStatistics()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [months])

  const loadStatistics = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/operations/statistics?months=${months}`)
      
      if (!response.ok) {
        throw new Error('Error al cargar estadísticas')
      }

      const data = await response.json()
      setStats(data)
    } catch (error: any) {
      console.error('Error loading statistics:', error)
      toast({
        title: "Error",
        description: error.message || "No se pudieron cargar las estadísticas",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">No se encontraron estadísticas</p>
      </div>
    )
  }

  const kpiCardClass =
    "border-border/60 bg-gradient-to-br from-primary/5 via-background to-background/80 shadow-[0_12px_30px_-20px_rgba(15,23,42,0.35)] dark:from-primary/10"

  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/operations">Operaciones</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbPage>Estadísticas</BreadcrumbPage>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Estadísticas de Operaciones</h1>
          <p className="text-muted-foreground">
            Análisis de rendimiento y métricas de operaciones
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={months} onValueChange={setMonths}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">Últimos 3 meses</SelectItem>
              <SelectItem value="6">Últimos 6 meses</SelectItem>
              <SelectItem value="12">Últimos 12 meses</SelectItem>
              <SelectItem value="24">Últimos 24 meses</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Cards de resumen */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className={kpiCardClass}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Operaciones</CardTitle>
            <Plane className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.overview.totalOperations.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {stats.overview.confirmedOperations} confirmadas
            </p>
          </CardContent>
        </Card>

        <Card className={kpiCardClass}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ventas Totales</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatUSD(stats.overview.totalSales)}</div>
            <p className="text-xs text-muted-foreground">
              Ticket promedio: {formatUSD(stats.overview.avgTicket)}
            </p>
          </CardContent>
        </Card>

        <Card className={kpiCardClass}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Margen Total</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatUSD(stats.overview.totalMargin)}</div>
            <p className="text-xs text-muted-foreground">
              {Math.round(stats.overview.avgMarginPercentage * 10) / 10}% margen promedio
            </p>
          </CardContent>
        </Card>

        <Card className={kpiCardClass}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasa de Conversión</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.overview.conversionRate >= 20 ? 'text-green-600' : stats.overview.conversionRate >= 10 ? 'text-yellow-600' : 'text-red-600'}`}>
              {Math.round(stats.overview.conversionRate * 10) / 10}%
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.overview.pendingOperations} pendientes
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Tendencia mensual - ESTÁNDAR: LineChart con múltiples líneas */}
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Tendencia Mensual</CardTitle>
            <CardDescription>Evolución de ventas, margen y cantidad de operaciones por mes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.trends.monthly}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="monthName" />
                  <YAxis yAxisId="left" tickFormatter={(value) => formatUSDCompact(Number(value))} />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip 
                    formatter={(value: number, name: string) => [
                      name === 'count' ? value : formatUSD(value),
                      name === 'sales' ? 'Ventas' : name === 'margin' ? 'Margen' : 'Operaciones'
                    ]}
                  />
                  <Legend />
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="sales" 
                    name="Ventas"
                    stroke="hsl(var(--chart-1))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--chart-1))' }}
                  />
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="margin" 
                    name="Margen"
                    stroke="hsl(var(--chart-5))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--chart-5))' }}
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="count" 
                    name="Operaciones"
                    stroke="hsl(var(--chart-3))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--chart-3))' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Distribución por estado */}
        <Card>
          <CardHeader>
            <CardTitle>Por Estado</CardTitle>
            <CardDescription>Distribución de operaciones por estado</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.distributions.byStatus.filter(s => s.count > 0)}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ label, percent }) => `${label}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {stats.distributions.byStatus.map((entry) => (
                      <Cell key={`cell-${entry.status}`} fill={STATUS_COLORS[entry.status] || '#94a3b8'} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top destinos - ESTÁNDAR: BarChart con tooltip formateado */}
        <Card>
          <CardHeader>
            <CardTitle>Top Destinos</CardTitle>
            <CardDescription>Destinos con mayor facturación (Top 8)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.rankings.topDestinations.slice(0, 8)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={(value) => formatUSDCompact(Number(value))} />
                  <YAxis dataKey="destination" type="category" width={120} />
                  <Tooltip formatter={(value: number) => formatUSD(value)} />
                  <Bar dataKey="totalSales" name="Ventas" fill="hsl(var(--chart-1))" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rankings */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Top destinos detallado */}
        <Card>
          <CardHeader>
            <CardTitle>Destinos Más Rentables</CardTitle>
            <CardDescription>Top 10 destinos por ventas y margen</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Destino</TableHead>
                  <TableHead className="text-right">Ventas</TableHead>
                  <TableHead className="text-right">Margen %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.rankings.topDestinations.slice(0, 10).map((dest, index) => (
                  <TableRow key={dest.destination}>
                    <TableCell>
                      <Badge variant={index < 3 ? "default" : "outline"}>
                        {index + 1}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{dest.destination}</TableCell>
                    <TableCell className="text-right">{formatUSD(dest.totalSales)}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={dest.avgMargin >= 15 ? "default" : dest.avgMargin >= 10 ? "secondary" : "outline"}>
                        {Math.round(dest.avgMargin * 10) / 10}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {stats.rankings.topDestinations.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      No hay datos disponibles
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Top vendedores */}
        <Card>
          <CardHeader>
            <CardTitle>Top Vendedores</CardTitle>
            <CardDescription>Mejores vendedores por facturación</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Vendedor</TableHead>
                  <TableHead className="text-right">Ventas</TableHead>
                  <TableHead className="text-right">Ops</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.rankings.topSellers.map((seller, index) => (
                  <TableRow key={seller.id}>
                    <TableCell>
                      <Badge variant={index < 3 ? "default" : "outline"}>
                        {index + 1}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{seller.name}</TableCell>
                    <TableCell className="text-right">{formatUSD(seller.sales)}</TableCell>
                    <TableCell className="text-right">{seller.count}</TableCell>
                  </TableRow>
                ))}
                {stats.rankings.topSellers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      No hay datos disponibles
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
