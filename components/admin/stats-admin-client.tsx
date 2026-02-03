"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3, Users, CreditCard, DollarSign, Sparkles } from "lucide-react"

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
    <div className="space-y-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            Insights
          </div>
          <h1 className="mt-3 text-3xl font-semibold text-foreground">Estadisticas del sistema</h1>
          <p className="mt-1 text-muted-foreground">
            Seguimiento de crecimiento, ingresos y comportamiento de planes.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Sparkles className="h-4 w-4 text-primary" />
          Datos en tiempo real
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "MRR",
            value: formatPrice(mrr),
            description: "Ingresos recurrentes mensuales",
            icon: DollarSign,
            tone: "bg-emerald-100/80 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-200",
          },
          {
            label: "Usuarios totales",
            value: stats.users.total,
            description: `${stats.users.thisMonth} este mes`,
            icon: Users,
            tone: "bg-blue-100/80 text-blue-600 dark:bg-blue-500/20 dark:text-blue-200",
          },
          {
            label: "Suscripciones activas",
            value: stats.subscriptions.byStatus.active,
            description: `${stats.subscriptions.byStatus.trial} en prueba`,
            icon: CreditCard,
            tone: "bg-indigo-100/80 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-200",
          },
          {
            label: "Agencias",
            value: stats.agencies.total,
            description: "Total registradas",
            icon: BarChart3,
            tone: "bg-purple-100/80 text-purple-600 dark:bg-purple-500/20 dark:text-purple-200",
          },
        ].map((card) => {
          const Icon = card.icon
          return (
            <Card key={card.label} className="border-border/60 bg-card/80">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{card.label}</CardTitle>
                <div className={`flex h-9 w-9 items-center justify-center rounded-full ${card.tone}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold text-foreground">{card.value}</div>
                <p className="text-xs text-muted-foreground">{card.description}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card className="border-border/60 bg-card/80 shadow-[0_18px_45px_-30px_rgba(15,23,42,0.35)]">
          <CardHeader>
            <CardTitle>Suscripciones por plan</CardTitle>
            <CardDescription>Distribucion de suscripciones</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(stats.subscriptions.byPlan).map(([planName, planStats]) => (
                <div key={planName} className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/30 px-4 py-3">
                  <div>
                    <div className="font-medium text-foreground">{planName}</div>
                    <div className="text-sm text-muted-foreground">
                      {planStats.active} activas, {planStats.trial} en prueba
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold text-foreground">{planStats.total}</div>
                    <div className="text-xs text-muted-foreground">total</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/80 shadow-[0_18px_45px_-30px_rgba(15,23,42,0.35)]">
          <CardHeader>
            <CardTitle>Estados de suscripcion</CardTitle>
            <CardDescription>Distribucion por estado</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-emerald-600 dark:text-emerald-300">
                <span className="font-medium">Activas</span>
                <span className="text-lg font-semibold">{stats.subscriptions.byStatus.active}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-blue-600 dark:text-blue-300">
                <span className="font-medium">En prueba</span>
                <span className="text-lg font-semibold">{stats.subscriptions.byStatus.trial}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-amber-700 dark:text-amber-300">
                <span className="font-medium">Sin pago</span>
                <span className="text-lg font-semibold">{stats.subscriptions.byStatus.unpaid}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-rose-600 dark:text-rose-300">
                <span className="font-medium">Canceladas</span>
                <span className="text-lg font-semibold">{stats.subscriptions.byStatus.canceled}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-slate-400/40 bg-slate-500/10 px-4 py-3 text-slate-600 dark:text-slate-300">
                <span className="font-medium">Suspendidas</span>
                <span className="text-lg font-semibold">{stats.subscriptions.byStatus.suspended}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
