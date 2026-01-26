"use client"

import { useState, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, Users, TrendingUp, Target, UserCheck, DollarSign, Download, Percent, Instagram, MessageCircle, Megaphone, Globe, MapPin, Calendar, UsersRound } from "lucide-react"
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

interface LeadsStatistics {
  overview: {
    totalLeads: number
    activeLeads: number
    wonLeads: number
    lostLeads: number
    conversionRate: number
    totalQuoted: number
    totalDeposits: number
    newThisMonth: number
    avgBudget: number
    avgAdults: number
    avgChildren: number
    avgInfants: number
    totalPassengers: number
  }
  pipeline: Array<{
    status: string
    label: string
    count: number
    value: number
  }>
  distributions: {
    bySource: Array<{
      source: string
      count: number
      won: number
      conversionRate: number
      totalQuoted: number
      totalDeposits: number
    }>
    byRegion: Array<{
      region: string
      count: number
      won: number
      conversionRate: number
      totalQuoted: number
    }>
    byDestination: Array<{
      destination: string
      count: number
      won: number
      conversionRate: number
    }>
    bySeller: Array<{
      id: string
      name: string
      leads: number
      won: number
      conversionRate: number
      totalQuoted: number
    }>
    byBudget: Array<{
      range: string
      count: number
    }>
  }
  trends: {
    monthly: Array<{
      month: string
      monthName: string
      newLeads: number
      wonLeads: number
      lostLeads: number
      quotedLeads: number
      totalQuoted: number
      totalDeposits: number
    }>
  }
  rankings: {
    topSellers: Array<{
      id: string
      name: string
      leads: number
      won: number
      conversionRate: number
      totalQuoted: number
    }>
    topSources: Array<{
      source: string
      count: number
      won: number
      conversionRate: number
      totalQuoted: number
      totalDeposits: number
    }>
    topDestinations: Array<{
      destination: string
      count: number
      won: number
      conversionRate: number
    }>
  }
}

const PIPELINE_COLORS = ['#f97316', '#fb923c', '#fbbf24', '#22c55e', '#ef4444']
const SOURCE_COLORS: Record<string, string> = {
  Instagram: '#E1306C',
  WhatsApp: '#25D366',
  'Meta Ads': '#1877F2',
  Website: '#000000',
  Referral: '#8b5cf6',
  CRM: '#3b82f6',
  Other: '#6b7280',
}

const REGION_COLORS = ['#3b82f6', '#06b6d4', '#10b981', '#8b5cf6', '#ef4444', '#f59e0b', '#ec4899']

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(value)
}

const getSourceIcon = (source: string) => {
  switch (source) {
    case 'Instagram':
      return <Instagram className="h-4 w-4" />
    case 'WhatsApp':
      return <MessageCircle className="h-4 w-4" />
    case 'Meta Ads':
      return <Megaphone className="h-4 w-4" />
    case 'Website':
      return <Globe className="h-4 w-4" />
    default:
      return null
  }
}

export function LeadsStatisticsPageClient() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<LeadsStatistics | null>(null)
  const [months, setMonths] = useState("12")

  useEffect(() => {
    loadStatistics()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [months])

  const loadStatistics = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/leads/statistics?months=${months}`)
      
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

  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/sales/leads">Leads</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbPage>Estadísticas</BreadcrumbPage>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Estadísticas de Leads</h1>
          <p className="text-muted-foreground">
            Análisis completo del pipeline de leads y performance
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

      {/* Cards de resumen - ESTÁNDAR: 4 cards, mismo tamaño */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.overview.totalLeads.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {stats.overview.newThisMonth} nuevos este mes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Activos</CardTitle>
            <Target className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.overview.activeLeads}</div>
            <p className="text-xs text-muted-foreground">
              en proceso de venta
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasa de Conversión</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.overview.conversionRate >= 20 ? 'text-green-600' : stats.overview.conversionRate >= 10 ? 'text-yellow-600' : 'text-red-600'}`}>
              {Math.round(stats.overview.conversionRate * 10) / 10}%
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.overview.wonLeads} ganados / {stats.overview.lostLeads} perdidos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cotizaciones</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(stats.overview.totalQuoted)}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(stats.overview.totalDeposits)} en depósitos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline de ventas - ESTÁNDAR: Card con grid */}
      <Card>
        <CardHeader>
          <CardTitle>Pipeline de Ventas</CardTitle>
          <CardDescription>Distribución de leads por etapa con valores cotizados</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-5">
            {stats.pipeline.map((stage, index) => (
              <div key={stage.status} className="text-center">
                <div 
                  className="rounded-lg p-4 mb-2"
                  style={{ backgroundColor: `${PIPELINE_COLORS[index]}20` }}
                >
                  <div className="text-3xl font-bold" style={{ color: PIPELINE_COLORS[index] }}>
                    {stage.count}
                  </div>
                </div>
                <p className="font-medium">{stage.label}</p>
                {stage.value > 0 && (
                  <p className="text-xs text-muted-foreground">{formatCurrency(stage.value)}</p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Gráficos - ESTÁNDAR: h-[300px] para todos */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Tendencia mensual - ESTÁNDAR: col-span-2, h-[300px] */}
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Tendencia de Leads</CardTitle>
            <CardDescription>Evolución mensual de nuevos leads, conversiones y cotizaciones</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.trends.monthly}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="monthName" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => formatCurrency(v)} />
                  <Tooltip 
                    formatter={(value: number, name: string) => [
                      name === 'newLeads' || name === 'wonLeads' || name === 'lostLeads' || name === 'quotedLeads' 
                        ? value 
                        : formatCurrency(value),
                      name === 'newLeads' ? 'Nuevos' 
                        : name === 'wonLeads' ? 'Ganados' 
                        : name === 'lostLeads' ? 'Perdidos'
                        : name === 'quotedLeads' ? 'Cotizados'
                        : name === 'totalQuoted' ? 'Total Cotizado'
                        : 'Depósitos'
                    ]}
                  />
                  <Legend />
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="newLeads" 
                    name="Nuevos"
                    stroke="#f97316" 
                    strokeWidth={2}
                    dot={{ fill: '#f97316' }}
                  />
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="wonLeads" 
                    name="Ganados"
                    stroke="#22c55e" 
                    strokeWidth={2}
                    dot={{ fill: '#22c55e' }}
                  />
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="lostLeads" 
                    name="Perdidos"
                    stroke="#ef4444" 
                    strokeWidth={2}
                    dot={{ fill: '#ef4444' }}
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="totalQuoted" 
                    name="Total Cotizado"
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={{ fill: '#3b82f6' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Por origen - ESTÁNDAR: h-[300px] */}
        <Card>
          <CardHeader>
            <CardTitle>Por Origen</CardTitle>
            <CardDescription>Leads y conversión por canal de origen</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.distributions.bySource}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="source" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `${v}%`} />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="count" name="Leads" fill="#3b82f6" />
                  <Bar yAxisId="left" dataKey="won" name="Ganados" fill="#22c55e" />
                  <Line yAxisId="right" type="monotone" dataKey="conversionRate" name="Conversión %" stroke="#f97316" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Por región - ESTÁNDAR: h-[300px] */}
        <Card>
          <CardHeader>
            <CardTitle>Por Región</CardTitle>
            <CardDescription>Distribución de leads por destino</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.distributions.byRegion}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ region, percent }) => `${region}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {stats.distributions.byRegion.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={REGION_COLORS[index % REGION_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Por presupuesto - ESTÁNDAR: h-[300px] */}
        <Card>
          <CardHeader>
            <CardTitle>Por Presupuesto</CardTitle>
            <CardDescription>Distribución de leads por rango de presupuesto</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.distributions.byBudget} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="range" type="category" width={100} />
                  <Tooltip />
                  <Bar dataKey="count" name="Leads" fill="#8b5cf6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top destinos - ESTÁNDAR: h-[300px] */}
        <Card>
          <CardHeader>
            <CardTitle>Top Destinos</CardTitle>
            <CardDescription>Destinos más solicitados</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.rankings.topDestinations.slice(0, 8)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="destination" type="category" width={120} />
                  <Tooltip />
                  <Bar dataKey="count" name="Leads" fill="#06b6d4" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rankings - ESTÁNDAR: grid gap-4 md:grid-cols-2 */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Top vendedores */}
        <Card>
          <CardHeader>
            <CardTitle>Top Vendedores</CardTitle>
            <CardDescription>Mejor tasa de conversión (mín. 5 leads)</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Vendedor</TableHead>
                  <TableHead className="text-right">Leads</TableHead>
                  <TableHead className="text-right">Conversión</TableHead>
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
                    <TableCell className="text-right">{seller.leads}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={seller.conversionRate >= 25 ? "default" : seller.conversionRate >= 15 ? "secondary" : "outline"}>
                        {Math.round(seller.conversionRate * 10) / 10}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {stats.rankings.topSellers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      No hay datos suficientes
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Rendimiento por origen */}
        <Card>
          <CardHeader>
            <CardTitle>Rendimiento por Origen</CardTitle>
            <CardDescription>Efectividad de cada canal</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Origen</TableHead>
                  <TableHead className="text-right">Leads</TableHead>
                  <TableHead className="text-right">Ganados</TableHead>
                  <TableHead className="text-right">Conversión</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.rankings.topSources.map((source) => (
                  <TableRow key={source.source}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {getSourceIcon(source.source)}
                        {source.source}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{source.count}</TableCell>
                    <TableCell className="text-right">{source.won}</TableCell>
                    <TableCell className="text-right">
                      <Badge 
                        style={{ 
                          backgroundColor: `${SOURCE_COLORS[source.source] || '#6b7280'}20`,
                          color: SOURCE_COLORS[source.source] || '#6b7280'
                        }}
                      >
                        {Math.round(source.conversionRate * 10) / 10}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Métricas adicionales - ESTÁNDAR: Cards adicionales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Presupuesto Promedio</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.overview.avgBudget)}</div>
            <p className="text-xs text-muted-foreground">
              por lead
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pasajeros Totales</CardTitle>
            <UsersRound className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.overview.totalPassengers}</div>
            <p className="text-xs text-muted-foreground">
              {stats.overview.avgAdults} adultos / {stats.overview.avgChildren} niños / {stats.overview.avgInfants} bebés
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cotizado</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{formatCurrency(stats.overview.totalQuoted)}</div>
            <p className="text-xs text-muted-foreground">
              en cotizaciones
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Depósitos</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(stats.overview.totalDeposits)}</div>
            <p className="text-xs text-muted-foreground">
              recibidos
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
