"use client"

import { useCallback, useEffect, useState } from "react"
import dynamic from "next/dynamic"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DashboardFilters, DashboardFiltersState } from "./dashboard-filters"
import { PendingAlertsCard } from "./pending-alerts-card"
import { UpcomingTripsCard } from "./upcoming-trips-card"
import { TopSellersCard } from "./top-sellers-card"
import { BirthdaysTodayCard } from "./birthdays-today-card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { DollarSign, TrendingUp, Package, Percent, Users, Building2 } from "lucide-react"
import { formatUSD } from "@/lib/currency"

// Dynamic imports para charts pesados (reduce bundle inicial ~200KB)
const SalesBySellerChart = dynamic(() => import("./sales-by-seller-chart").then(mod => ({ default: mod.SalesBySellerChart })), {
  ssr: false,
  loading: () => <Skeleton className="h-[350px] w-full" />
})
const DestinationsChart = dynamic(() => import("./destinations-chart").then(mod => ({ default: mod.DestinationsChart })), {
  ssr: false,
  loading: () => <Skeleton className="h-[350px] w-full" />
})
const DestinationsPieChart = dynamic(() => import("./destinations-pie-chart").then(mod => ({ default: mod.DestinationsPieChart })), {
  ssr: false,
  loading: () => <Skeleton className="h-[350px] w-full" />
})
const RegionsRadarChart = dynamic(() => import("./regions-radar-chart").then(mod => ({ default: mod.RegionsRadarChart })), {
  ssr: false,
  loading: () => <Skeleton className="h-[350px] w-full" />
})
const CashflowChart = dynamic(() => import("./cashflow-chart").then(mod => ({ default: mod.CashflowChart })), {
  ssr: false,
  loading: () => <Skeleton className="h-[350px] w-full" />
})

interface DashboardPageClientProps {
  agencies: Array<{ id: string; name: string }>
  sellers: Array<{ id: string; name: string }>
  defaultFilters: DashboardFiltersState
}

interface KPIs {
  totalSales: number
  totalMargin: number
  operationsCount: number
  avgMarginPercent: number
  pendingCustomerPayments: number
  pendingOperatorPayments: number
}

export function DashboardPageClient({
  agencies,
  sellers,
  defaultFilters,
}: DashboardPageClientProps) {
  const [filters, setFilters] = useState(defaultFilters)
  const [loading, setLoading] = useState(false)
  const [kpis, setKpis] = useState<KPIs>({
    totalSales: 0,
    totalMargin: 0,
    operationsCount: 0,
    avgMarginPercent: 0,
    pendingCustomerPayments: 0,
    pendingOperatorPayments: 0,
  })
  const [sellersData, setSellersData] = useState<any[]>([])
  const [destinationsData, setDestinationsData] = useState<any[]>([])
  const [destinationsAllData, setDestinationsAllData] = useState<any[]>([])
  const [cashflowData, setCashflowData] = useState<any[]>([])

  const fetchDashboardData = useCallback(async () => {
    setLoading(true)
    // Resetear estados para evitar mostrar datos anteriores en sesiones nuevas
    setKpis({
      totalSales: 0,
      totalMargin: 0,
      operationsCount: 0,
      avgMarginPercent: 0,
      pendingCustomerPayments: 0,
      pendingOperatorPayments: 0,
    })
    setSellersData([])
    setDestinationsData([])
    setDestinationsAllData([])
    setCashflowData([])
    try {
      const params = new URLSearchParams()
      params.set("dateFrom", filters.dateFrom)
      params.set("dateTo", filters.dateTo)
      if (filters.agencyId !== "ALL") {
        params.set("agencyId", filters.agencyId)
      }
      if (filters.sellerId !== "ALL") {
        params.set("sellerId", filters.sellerId)
      }

      // Fetch all data in parallel with cache headers
      const fetchOptions = {
        next: { revalidate: 30 } // Cache por 30 segundos
      }

      // Optimización: Una sola llamada a destinations con limit=10, luego usamos slice para limit=5
      const [salesRes, sellersRes, destinationsAllRes, cashflowRes, pendingBalancesRes] = await Promise.all([
        fetch(`/api/analytics/sales?${params.toString()}`, fetchOptions),
        fetch(`/api/analytics/sellers?${params.toString()}`, fetchOptions),
        fetch(`/api/analytics/destinations?${params.toString()}&limit=10`, fetchOptions),
        fetch(`/api/analytics/cashflow?${params.toString()}`, fetchOptions),
        fetch(`/api/analytics/pending-balances`, fetchOptions),
      ])

      const salesData = salesRes.ok ? await salesRes.json() : {}
      const sellersData = sellersRes.ok ? await sellersRes.json() : {}
      const destinationsAllData = destinationsAllRes.ok ? await destinationsAllRes.json() : {}
      const cashflowData = cashflowRes.ok ? await cashflowRes.json() : {}
      const pendingBalancesData = pendingBalancesRes.ok ? await pendingBalancesRes.json() : {}

      setKpis({
        totalSales: salesData.totalSales || 0,
        totalMargin: salesData.totalMargin || 0,
        operationsCount: salesData.operationsCount || 0,
        avgMarginPercent: salesData.avgMarginPercent || 0,
        pendingCustomerPayments: pendingBalancesData.accountsReceivable || 0,
        pendingOperatorPayments: pendingBalancesData.accountsPayable || 0,
      })

      const allDestinations = destinationsAllData.destinations || []
      setSellersData(sellersData.sellers || [])
      setDestinationsData(allDestinations.slice(0, 5)) // Top 5 para pie chart
      setDestinationsAllData(allDestinations) // Top 10 para bar chart
      setCashflowData(cashflowData.cashflow || [])
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
      setKpis({
        totalSales: 0,
        totalMargin: 0,
        operationsCount: 0,
        avgMarginPercent: 0,
        pendingCustomerPayments: 0,
        pendingOperatorPayments: 0,
      })
      setSellersData([])
      setDestinationsData([])
      setDestinationsAllData([])
      setCashflowData([])
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    fetchDashboardData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.dateFrom, filters.dateTo, filters.agencyId, filters.sellerId])

  const kpiCardClass =
    "border-border/60 bg-gradient-to-br from-primary/5 via-background to-background/80 shadow-[0_12px_30px_-20px_rgba(15,23,42,0.35)] dark:from-primary/10"

  return (
    <div className="flex-1 space-y-4 pt-4 md:pt-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Dashboard</h2>
          <p className="text-sm text-muted-foreground sm:text-base">
            Vista general del negocio
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={fetchDashboardData} disabled={loading} variant="outline" size="sm" className="w-full sm:w-auto">
            Actualizar
          </Button>
        </div>
      </div>

      <DashboardFilters
        agencies={agencies}
        sellers={sellers}
        value={filters}
        defaultValue={defaultFilters}
        onChange={setFilters}
      />

      {/* KPIs */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card className={kpiCardClass}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Ventas Totales
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-4xl font-bold text-foreground">
                  {formatUSD(kpis.totalSales)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {kpis.operationsCount} ops • vs anterior
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className={kpiCardClass}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Total Operaciones
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-4xl font-bold text-foreground">
                  {kpis.operationsCount}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  vs período anterior
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className={kpiCardClass}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Margen Total
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-4xl font-bold text-foreground">
                  {formatUSD(kpis.totalMargin)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {kpis.avgMarginPercent.toFixed(1)}% promedio
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className={kpiCardClass}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Margen Promedio
            </CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-4xl font-bold text-foreground">
                  {kpis.avgMarginPercent.toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Margen promedio
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 grid-cols-2">
        <Card className={kpiCardClass}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Deudores por Ventas
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-4xl font-bold text-foreground">
                  {formatUSD(kpis.pendingCustomerPayments)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Por cobrar de clientes
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className={kpiCardClass}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Deuda a Operadores
            </CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-4xl font-bold text-foreground">
                  {formatUSD(kpis.pendingOperatorPayments)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Por pagar a operadores
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Cumpleaños del día */}
      <BirthdaysTodayCard />

      {/* Alertas, Próximos Viajes y Top Vendedores */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
        <PendingAlertsCard agencyId={filters.agencyId} sellerId={filters.sellerId} />
        <UpcomingTripsCard agencyId={filters.agencyId} sellerId={filters.sellerId} />
        <TopSellersCard agencyId={filters.agencyId} sellerId={filters.sellerId} dateFrom={filters.dateFrom} dateTo={filters.dateTo} />
      </div>

      {/* Charts */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        <SalesBySellerChart data={sellersData} />
        <DestinationsChart data={destinationsData} />
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        <div className="md:col-span-1 lg:col-span-1">
          <DestinationsPieChart data={destinationsAllData} />
        </div>
        <div className="md:col-span-1 lg:col-span-1">
          <RegionsRadarChart data={destinationsAllData} />
        </div>
        <div className="md:col-span-2 lg:col-span-2">
          <CashflowChart data={cashflowData} />
        </div>
      </div>
    </div>
  )
}
