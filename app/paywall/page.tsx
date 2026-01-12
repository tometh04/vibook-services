"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Check, Loader2, Sparkles, Zap } from "lucide-react"
import { useSubscription } from "@/hooks/use-subscription"
import type { SubscriptionPlan } from "@/lib/billing/types"
import Script from "next/script"

export default function PaywallPage() {
  const router = useRouter()
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [loading, setLoading] = useState(true)
  const { subscription, loading: subscriptionLoading } = useSubscription()

  useEffect(() => {
    async function fetchPlans() {
      try {
        const response = await fetch('/api/billing/plans')
        const data = await response.json()
        // Filtrar plan FREE, solo mostrar planes de pago
        const paidPlans = (data.plans || []).filter((plan: SubscriptionPlan) => plan.name !== 'FREE')
        setPlans(paidPlans)
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

  // Si ya tiene una suscripción activa, redirigir al dashboard
  useEffect(() => {
    if (!subscriptionLoading && subscription) {
      if (subscription.status === 'ACTIVE' || subscription.status === 'TRIAL') {
        router.push('/dashboard')
      }
    }
  }, [subscription, subscriptionLoading, router])

  if (loading || subscriptionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Cargando planes...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <div className="container mx-auto py-10 space-y-8 max-w-6xl">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-4">
            <Sparkles className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white">
            Comenzá tu prueba gratuita de 7 días
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            Elegí el plan que mejor se adapte a tu agencia. Probá todas las funcionalidades sin costo durante 7 días.
          </p>
          <div className="flex items-center justify-center gap-2 mt-4">
            <Badge className="bg-green-500 text-white px-4 py-2 text-sm">
              <Zap className="h-4 w-4 mr-2" />
              7 días gratis
            </Badge>
            <Badge variant="outline" className="border-green-500 text-green-500 px-4 py-2 text-sm">
              Sin tarjeta requerida
            </Badge>
          </div>
        </div>

        {/* Plan Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const price = plan.price_monthly
            const isPopular = plan.name === 'PRO'

            return (
              <Card
                key={plan.id}
                className={`relative ${isPopular ? 'border-primary shadow-lg scale-105 bg-primary/5' : ''}`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary">Más Popular</Badge>
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
                        <span className="h-4 w-4 text-muted-foreground">—</span>
                      )}
                      <span className="text-sm">Integración Trello</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {plan.features.manychat ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <span className="h-4 w-4 text-muted-foreground">—</span>
                      )}
                      <span className="text-sm">Integración Manychat</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {plan.features.emilia ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <span className="h-4 w-4 text-muted-foreground">—</span>
                      )}
                      <span className="text-sm">Asistente IA (Emilia)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {plan.features.whatsapp ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <span className="h-4 w-4 text-muted-foreground">—</span>
                      )}
                      <span className="text-sm">WhatsApp</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {plan.features.reports ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <span className="h-4 w-4 text-muted-foreground">—</span>
                      )}
                      <span className="text-sm">Reportes avanzados</span>
                    </div>
                  </div>
                </CardContent>

                <CardFooter>
                  {plan.name === 'STARTER' ? (
                    // Botón de Mercado Pago para STARTER (usando Preapproval Plan)
                    <div className="w-full">
                      <a 
                        href="https://www.mercadopago.com.ar/subscriptions/checkout?preapproval_plan_id=5e365ad7ca4540a5a0fd28511fa5ac46" 
                        id="MP-payButton"
                        data-name="MP-payButton"
                        className="mp-pay-button w-full inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                      >
                        Comenzar Prueba Gratis
                      </a>
                    </div>
                  ) : (
                    <Button
                      className="w-full"
                      variant={isPopular ? "default" : "outline"}
                      onClick={() => handleUpgrade(plan.id)}
                    >
                      Comenzar Prueba Gratis
                    </Button>
                  )}
                </CardFooter>
              </Card>
            )
          })}
        </div>

        {/* Script de Mercado Pago para renderizar botones */}
        <Script
          id="mercadopago-subscriptions"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                function $MPC_load() {
                  window.$MPC_loaded !== true && (function() {
                    var s = document.createElement("script");
                    s.type = "text/javascript";
                    s.async = true;
                    s.src = document.location.protocol + "//secure.mlstatic.com/mptools/render.js";
                    var x = document.getElementsByTagName('script')[0];
                    x.parentNode.insertBefore(s, x);
                    window.$MPC_loaded = true;
                  })();
                }
                window.$MPC_loaded !== true ? (window.attachEvent ? window.attachEvent('onload', $MPC_load) : window.addEventListener('load', $MPC_load, false)) : null;
              })();
              
              // Callback cuando se completa la suscripción
              function $MPC_message(event) {
                if (event.data && event.data.preapproval_id) {
                  // Redirigir a billing con el preapproval_id
                  window.location.href = '/api/billing/preapproval-callback?preapproval_id=' + event.data.preapproval_id + '&status=success';
                }
              }
              window.addEventListener("message", $MPC_message);
            `
          }}
        />

        {/* Info adicional */}
        <div className="text-center space-y-4 pt-8">
          <p className="text-sm text-slate-400">
            🔒 Tu información está protegida. No se realizará ningún cobro durante los 7 días de prueba.
          </p>
          <p className="text-sm text-slate-400">
            Después de la prueba, se cobrará automáticamente según el plan elegido. Podés cancelar en cualquier momento.
          </p>
        </div>
      </div>
    </div>
  )
}
