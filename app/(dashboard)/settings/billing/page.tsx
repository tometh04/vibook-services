"use client"

import { useState } from "react"
import { useSubscription } from "@/hooks/use-subscription"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  CreditCard, 
  Calendar, 
  Users, 
  FileText, 
  TrendingUp,
  Loader2,
  ExternalLink,
  CheckCircle2,
  XCircle,
  AlertCircle
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"

export default function BillingPage() {
  const { subscription, usage, loading } = useSubscription()
  const [openingPortal, setOpeningPortal] = useState(false)

  const handleOpenPortal = async () => {
    setOpeningPortal(true)
    try {
      const response = await fetch('/api/billing/portal', {
        method: 'POST',
      })
      const data = await response.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch (error) {
      console.error('Error opening portal:', error)
    } finally {
      setOpeningPortal(false)
    }
  }

  const formatPrice = (price: number | null) => {
    if (price === null || price === 0) return 'Gratis'
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(price)
  }

  const formatLimit = (limit: number | null) => {
    if (limit === null) return 'Ilimitado'
    return limit.toLocaleString('es-AR')
  }

  const getUsagePercentage = (current: number, limit: number | null) => {
    if (limit === null) return 0
    return Math.min((current / limit) * 100, 100)
  }

  const getStatusBadge = () => {
    if (!subscription) return null
    
    switch (subscription.status) {
      case 'ACTIVE':
        return <Badge className="bg-green-500"><CheckCircle2 className="h-3 w-3 mr-1" /> Activa</Badge>
      case 'TRIAL':
        return <Badge className="bg-blue-500"><Calendar className="h-3 w-3 mr-1" /> En Prueba</Badge>
      case 'PAST_DUE':
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" /> Pago Pendiente</Badge>
      case 'CANCELED':
        return <Badge variant="outline"><XCircle className="h-3 w-3 mr-1" /> Cancelada</Badge>
      default:
        return <Badge variant="outline">{subscription.status}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Facturación y Suscripción</h1>
          <p className="text-muted-foreground">Gestiona tu plan y métodos de pago</p>
        </div>
        <div className="text-center py-10">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Cargando información de suscripción...</p>
        </div>
      </div>
    )
  }

  if (!subscription) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Facturación y Suscripción</h1>
          <p className="text-muted-foreground">Gestiona tu plan y métodos de pago</p>
        </div>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No se encontró una suscripción activa. <a href="/pricing" className="underline">Elegí un plan</a> para comenzar.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const plan = subscription.plan
  const isTrial = subscription.status === 'TRIAL'
  const trialEndsAt = subscription.trial_end ? new Date(subscription.trial_end) : null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Facturación y Suscripción</h1>
        <p className="text-muted-foreground">Gestiona tu plan y métodos de pago</p>
      </div>

      {/* Plan Actual */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">{plan.display_name}</CardTitle>
              <CardDescription>{plan.description}</CardDescription>
            </div>
            {getStatusBadge()}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Precio</p>
              <p className="text-2xl font-bold">
                {formatPrice(subscription.billing_cycle === 'YEARLY' && plan.price_yearly !== null 
                  ? plan.price_yearly 
                  : plan.price_monthly)}
              </p>
              <p className="text-xs text-muted-foreground">
                /{subscription.billing_cycle === 'YEARLY' ? 'año' : 'mes'}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Próximo Pago</p>
              <p className="text-lg font-semibold">
                {formatDistanceToNow(new Date(subscription.current_period_end), {
                  addSuffix: true,
                  locale: es,
                })}
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(subscription.current_period_end).toLocaleDateString('es-AR')}
              </p>
            </div>
            {isTrial && trialEndsAt && (
              <div>
                <p className="text-sm text-muted-foreground">Prueba Termina</p>
                <p className="text-lg font-semibold text-blue-600">
                  {formatDistanceToNow(trialEndsAt, {
                    addSuffix: true,
                    locale: es,
                  })}
                </p>
                <p className="text-xs text-muted-foreground">
                  {trialEndsAt.toLocaleDateString('es-AR')}
                </p>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground">Ciclo de Facturación</p>
              <p className="text-lg font-semibold capitalize">
                {subscription.billing_cycle === 'YEARLY' ? 'Anual' : 'Mensual'}
              </p>
            </div>
          </div>

          <div className="flex gap-2 pt-4 border-t">
            <Button onClick={handleOpenPortal} disabled={openingPortal}>
              {openingPortal ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Abriendo...
                </>
              ) : (
                <>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Gestionar Suscripción
                </>
              )}
            </Button>
            <Button variant="outline" asChild>
              <a href="/pricing">
                Cambiar Plan
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Uso Actual */}
      {usage && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Usuarios
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Usados</span>
                <span className="font-semibold">
                  {usage.users_count} / {formatLimit(plan.max_users)}
                </span>
              </div>
              {plan.max_users !== null && (
                <Progress value={getUsagePercentage(usage.users_count, plan.max_users)} />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Operaciones este Mes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Usadas</span>
                <span className="font-semibold">
                  {usage.operations_count} / {formatLimit(plan.max_operations_per_month)}
                </span>
              </div>
              {plan.max_operations_per_month !== null && (
                <Progress value={getUsagePercentage(usage.operations_count, plan.max_operations_per_month)} />
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Métodos de Pago */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Métodos de Pago
          </CardTitle>
          <CardDescription>
            Gestiona tus métodos de pago desde el portal de Stripe
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={handleOpenPortal} disabled={openingPortal}>
            <CreditCard className="mr-2 h-4 w-4" />
            Gestionar Métodos de Pago
          </Button>
        </CardContent>
      </Card>

      {/* Facturas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Facturas
          </CardTitle>
          <CardDescription>
            Accede a tu historial de facturas desde el portal de Stripe
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={handleOpenPortal} disabled={openingPortal}>
            <FileText className="mr-2 h-4 w-4" />
            Ver Facturas
          </Button>
        </CardContent>
      </Card>

      {/* Alerta si está en trial */}
      {isTrial && trialEndsAt && (
        <Alert>
          <Calendar className="h-4 w-4" />
          <AlertDescription>
            Estás en período de prueba. Tu prueba termina el{" "}
            <strong>{trialEndsAt.toLocaleDateString('es-AR')}</strong>.
            {trialEndsAt < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) && (
              <span className="block mt-2">
                Tu tarjeta será cobrada automáticamente cuando termine la prueba.
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Alerta si está en past_due */}
      {subscription.status === 'PAST_DUE' && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Tu último pago falló. Por favor, actualiza tu método de pago para continuar usando el servicio.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
