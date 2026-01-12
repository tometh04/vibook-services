"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Check, Loader2, Sparkles, Zap, Shield, CreditCard } from "lucide-react"
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-slate-300">Cargando planes...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="container mx-auto px-4 py-12 md:py-16">
        {/* Header - Centrado y mejorado */}
        <div className="text-center space-y-6 mb-12 max-w-3xl mx-auto">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/20 mb-2">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight">
            Comenzá tu prueba gratuita
          </h1>
          <p className="text-xl md:text-2xl text-slate-300 leading-relaxed">
            Elegí el plan que mejor se adapte a tu agencia
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Badge className="bg-green-500/20 text-green-400 border-green-500/50 px-4 py-1.5 text-sm font-medium">
              <Zap className="h-3.5 w-3.5 mr-1.5" />
              7 días gratis
            </Badge>
            <Badge variant="outline" className="border-slate-600 text-slate-300 px-4 py-1.5 text-sm font-medium">
              <CreditCard className="h-3.5 w-3.5 mr-1.5" />
              Sin tarjeta requerida
            </Badge>
            <Badge variant="outline" className="border-slate-600 text-slate-300 px-4 py-1.5 text-sm font-medium">
              <Shield className="h-3.5 w-3.5 mr-1.5" />
              Cancelá cuando quieras
            </Badge>
          </div>
        </div>

        {/* Plan Cards - Centrados y mejor alineados */}
        <div className="flex flex-wrap justify-center items-stretch gap-6 max-w-6xl mx-auto mb-12">
          {plans.map((plan) => {
            const price = plan.price_monthly
            const isPopular = plan.name === 'PRO'

            return (
              <Card
                key={plan.id}
                className={`relative flex flex-col w-full sm:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] max-w-sm ${
                  isPopular 
                    ? 'border-primary shadow-xl shadow-primary/20 bg-primary/5 scale-105 z-10' 
                    : 'border-slate-700 bg-slate-800/50'
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20">
                    <Badge className="bg-primary text-primary-foreground px-4 py-1 text-xs font-semibold shadow-lg">
                      Más Popular
                    </Badge>
                  </div>
                )}
                
                <CardHeader className="text-center pb-4">
                  <CardTitle className="text-2xl font-bold mb-2">{plan.display_name}</CardTitle>
                  <CardDescription className="text-slate-400 min-h-[40px]">
                    {plan.description}
                  </CardDescription>
                  <div className="mt-6 mb-2">
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-5xl font-bold text-white">{formatPrice(price)}</span>
                      {price !== null && price > 0 && (
                        <span className="text-lg text-slate-400">/mes</span>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="flex-1 space-y-3 px-6">
                  <div className="space-y-2.5">
                    <div className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-slate-300">
                        {formatLimit(plan.max_users)} {plan.max_users === null ? 'usuarios' : plan.max_users === 1 ? 'usuario' : 'usuarios'}
                      </span>
                    </div>
                    <div className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-slate-300">
                        {formatLimit(plan.max_operations_per_month)} operaciones/mes
                      </span>
                    </div>
                    <div className="flex items-start gap-3">
                      {plan.features.trello ? (
                        <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      ) : (
                        <span className="h-5 w-5 text-slate-600 mt-0.5 flex-shrink-0 flex items-center justify-center">—</span>
                      )}
                      <span className={`text-sm ${plan.features.trello ? 'text-slate-300' : 'text-slate-500'}`}>
                        Integración Trello
                      </span>
                    </div>
                    <div className="flex items-start gap-3">
                      {plan.features.manychat ? (
                        <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      ) : (
                        <span className="h-5 w-5 text-slate-600 mt-0.5 flex-shrink-0 flex items-center justify-center">—</span>
                      )}
                      <span className={`text-sm ${plan.features.manychat ? 'text-slate-300' : 'text-slate-500'}`}>
                        Integración Manychat
                      </span>
                    </div>
                    <div className="flex items-start gap-3">
                      {plan.features.emilia ? (
                        <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      ) : (
                        <span className="h-5 w-5 text-slate-600 mt-0.5 flex-shrink-0 flex items-center justify-center">—</span>
                      )}
                      <span className={`text-sm ${plan.features.emilia ? 'text-slate-300' : 'text-slate-500'}`}>
                        Asistente IA (Emilia)
                      </span>
                    </div>
                    <div className="flex items-start gap-3">
                      {plan.features.whatsapp ? (
                        <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      ) : (
                        <span className="h-5 w-5 text-slate-600 mt-0.5 flex-shrink-0 flex items-center justify-center">—</span>
                      )}
                      <span className={`text-sm ${plan.features.whatsapp ? 'text-slate-300' : 'text-slate-500'}`}>
                        WhatsApp
                      </span>
                    </div>
                    <div className="flex items-start gap-3">
                      {plan.features.reports ? (
                        <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      ) : (
                        <span className="h-5 w-5 text-slate-600 mt-0.5 flex-shrink-0 flex items-center justify-center">—</span>
                      )}
                      <span className={`text-sm ${plan.features.reports ? 'text-slate-300' : 'text-slate-500'}`}>
                        Reportes avanzados
                      </span>
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="pt-6 pb-6 px-6">
                  {plan.name === 'STARTER' ? (
                    <div className="w-full">
                      <a 
                        href="https://www.mercadopago.com.ar/subscriptions/checkout?preapproval_plan_id=5e365ad7ca4540a5a0fd28511fa5ac46" 
                        id="MP-payButton"
                        data-name="MP-payButton"
                        className="mp-pay-button w-full inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-base font-semibold text-primary-foreground shadow-lg transition-all hover:bg-primary/90 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
                      >
                        Comenzar Prueba Gratis
                      </a>
                    </div>
                  ) : (
                    <Button
                      className="w-full h-12 text-base font-semibold"
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

        {/* Info adicional - Centrado */}
        <div className="text-center space-y-3 pt-8 max-w-2xl mx-auto">
          <div className="flex items-center justify-center gap-2 text-slate-400">
            <Shield className="h-4 w-4" />
            <p className="text-sm">
              Tu información está protegida. No se realizará ningún cobro durante los 7 días de prueba.
            </p>
          </div>
          <p className="text-sm text-slate-500">
            Después de la prueba, se cobrará automáticamente según el plan elegido. Podés cancelar en cualquier momento.
          </p>
        </div>
      </div>
    </div>
  )
}
