"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Check, X, Loader2 } from "lucide-react"
import { useSubscription } from "@/hooks/use-subscription"
import type { SubscriptionPlan } from "@/lib/billing/types"

export default function PricingPage() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [loading, setLoading] = useState(true)
  const { subscription, loading: subscriptionLoading } = useSubscription()

  useEffect(() => {
    async function fetchPlans() {
      try {
        const response = await fetch('/api/billing/plans')
        const data = await response.json()
        setPlans(data.plans || [])
      } catch (error) {
        console.error('Error fetching plans:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchPlans()
  }, [])

  const handleUpgrade = async (planId: string) => {
    try {
      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      })
      const data = await response.json()
      // Mercado Pago devuelve initPoint (producción) o sandboxInitPoint (testing)
      const checkoutUrl = data.initPoint || data.sandboxInitPoint
      if (checkoutUrl) {
        window.location.href = checkoutUrl
      } else {
        console.error('No se recibió URL de checkout:', data)
        alert('Error al crear la sesión de pago. Por favor intenta nuevamente.')
      }
    } catch (error) {
      console.error('Error creating checkout session:', error)
      alert('Error al crear la sesión de pago. Por favor intenta nuevamente.')
    }
  }

  const formatPrice = (price: number | null) => {
    if (price === null || price === 0) return 'Gratis'
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price)
  }

  const formatLimit = (limit: number | null) => {
    if (limit === null) return 'Ilimitado'
    return limit.toLocaleString('es-AR')
  }

  if (loading || subscriptionLoading) {
    return (
      <div className="container mx-auto py-10">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Cargando planes...</p>
        </div>
      </div>
    )
  }

  const currentPlanId = subscription?.plan_id

  return (
    <div className="container mx-auto py-10 space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">Planes y Precios</h1>
        <p className="text-muted-foreground text-lg">
          Elegí el plan que mejor se adapte a tu agencia. Todos los planes son mensuales.
        </p>
      </div>

      {/* Plan Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map((plan) => {
          const price = plan.price_monthly
          const isCurrentPlan = currentPlanId === plan.id
          const isPopular = plan.name === 'PRO'

          return (
            <Card
              key={plan.id}
              className={`relative ${isPopular ? 'border-primary shadow-lg scale-105' : ''} ${isCurrentPlan ? 'border-green-500' : ''}`}
            >
              {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary">Más Popular</Badge>
                </div>
              )}
              {isCurrentPlan && (
                <div className="absolute -top-3 right-4">
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-500">
                    Plan Actual
                  </Badge>
                </div>
              )}
              
              <CardHeader>
                <CardTitle className="text-2xl">{plan.display_name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">{formatPrice(price)}</span>
                  {price !== null && price > 0 && (
                    <span className="text-muted-foreground">/mes</span>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">
                      {formatLimit(plan.max_users)} {plan.max_users === null ? 'usuarios' : plan.max_users === 1 ? 'usuario' : 'usuarios'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">
                      {formatLimit(plan.max_operations_per_month)} operaciones/mes
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {plan.features.trello ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <X className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="text-sm">Integración Trello</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {plan.features.manychat ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <X className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="text-sm">Integración Manychat</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {plan.features.emilia ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <X className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="text-sm">Asistente IA (Emilia)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {plan.features.reports ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <X className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="text-sm">Reportes avanzados</span>
                  </div>
                </div>
              </CardContent>

              <CardFooter>
                <Button
                  className="w-full"
                  variant={isCurrentPlan ? "outline" : isPopular ? "default" : "outline"}
                  disabled={isCurrentPlan}
                  onClick={() => handleUpgrade(plan.id)}
                >
                  {isCurrentPlan ? 'Plan Actual' : 'Elegir Plan'}
                </Button>
              </CardFooter>
            </Card>
          )
        })}
      </div>

      {/* FAQ Section */}
      <div className="mt-16 space-y-4">
        <h2 className="text-2xl font-bold text-center">Preguntas Frecuentes</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">¿Puedo cambiar de plan en cualquier momento?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Sí, podés cambiar de plan en cualquier momento. Los cambios se aplicarán en el próximo ciclo de facturación.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">¿Hay período de prueba?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Todos los planes nuevos incluyen 14 días de prueba gratuita. El cobro mensual comenzará después del período de prueba.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">¿Qué métodos de pago aceptan?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Aceptamos todas las tarjetas de crédito y débito, dinero en cuenta de Mercado Pago, y transferencias bancarias a través de Mercado Pago.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">¿Puedo cancelar en cualquier momento?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Sí, podés cancelar tu suscripción en cualquier momento desde la configuración de billing. No hay penalizaciones.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
