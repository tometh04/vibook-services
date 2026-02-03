"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3, Users, CreditCard, TrendingUp, DollarSign } from "lucide-react"

interface Stats {
  subscriptions: {
    byPlan: Record<string, {
      total: number
      active: number
      trial: number
      canceled: number
      unpaid: number
    }>
    byStatus: {
      active: number
      trial: number
      canceled: number
      unpaid: number
      suspended: number
    }
  }
  users: {
    total: number
    thisMonth: number
  }
  agencies: {
    total: number
  }
}

interface StatsAdminClientProps {
  stats: Stats
}

export function StatsAdminClient({ stats }: StatsAdminClientProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(price)
  }

  // Calcular MRR (Monthly Recurring Revenue)
  // Precios actualizados: Starter $79k, Pro $129k, Business $399k
  const mrr = Object.entries(stats.subscriptions.byPlan).reduce((total, [planName, planStats]) => {
    if (planName === 'FREE' || planName === 'TESTER') return total
    const planPrice = planStats.active * (
      planName === 'STARTER' ? 79000 : 
      planName === 'PRO' ? 129000 : 
      planName === 'BUSINESS' ? 399000 : 
      0
    )
    return total + planPrice
  }, 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Estadísticas</h1>
        <p className="text-muted-foreground">Métricas y análisis del sistema</p>
      </div>

      {/* Métricas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">MRR</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPrice(mrr)}</div>
            <p className="text-xs text-muted-foreground">
              Ingresos recurrentes mensuales
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuarios Totales</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.users.total}</div>
            <p className="text-xs text-muted-foreground">
              {stats.users.thisMonth} este mes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Suscripciones Activas</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.subscriptions.byStatus.active}</div>
            <p className="text-xs text-muted-foreground">
              {stats.subscriptions.byStatus.trial} en prueba
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Agencias</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.agencies.total}</div>
            <p className="text-xs text-muted-foreground">
              Total registradas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Suscripciones por plan */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Suscripciones por Plan</CardTitle>
            <CardDescription>Distribución de suscripciones</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(stats.subscriptions.byPlan).map(([planName, planStats]) => (
                <div key={planName} className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{planName}</div>
                    <div className="text-sm text-muted-foreground">
                      {planStats.active} activas, {planStats.trial} en prueba
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{planStats.total}</div>
                    <div className="text-xs text-muted-foreground">total</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Estados de Suscripción</CardTitle>
            <CardDescription>Distribución por estado</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="font-medium">Activas</div>
                <div className="font-bold text-green-600">{stats.subscriptions.byStatus.active}</div>
              </div>
              <div className="flex items-center justify-between">
                <div className="font-medium">En Prueba</div>
                <div className="font-bold text-blue-600">{stats.subscriptions.byStatus.trial}</div>
              </div>
              <div className="flex items-center justify-between">
                <div className="font-medium">Sin Pago</div>
                <div className="font-bold text-muted-foreground">{stats.subscriptions.byStatus.unpaid}</div>
              </div>
              <div className="flex items-center justify-between">
                <div className="font-medium">Canceladas</div>
                <div className="font-bold text-red-600">{stats.subscriptions.byStatus.canceled}</div>
              </div>
              <div className="flex items-center justify-between">
                <div className="font-medium">Suspendidas</div>
                <div className="font-bold text-yellow-600">{stats.subscriptions.byStatus.suspended}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
