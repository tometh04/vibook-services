"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Check, Loader2, Sparkles, Zap, Shield, CreditCard } from "lucide-react"
import { useSubscription } from "@/hooks/use-subscription"
import type { SubscriptionPlan } from "@/lib/billing/types"
import Image from "next/image"
import Link from "next/link"

export default function PaywallPage() {
  const router = useRouter()
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [hasUsedTrial, setHasUsedTrial] = useState(false)
  const [trialDays, setTrialDays] = useState(7)
  const [usingFallbackPlans, setUsingFallbackPlans] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const { subscription, loading: subscriptionLoading } = useSubscription()

  useEffect(() => {
    async function fetchPlans() {
      try {
        const [plansResponse, agencyResponse, configResponse] = await Promise.all([
          fetch('/api/billing/plans'),
          fetch('/api/agencies/current'),
          fetch('/api/system-config?key=trial_days')
        ])
        
        const plansData = await plansResponse.json()
        setUsingFallbackPlans(Boolean(plansData?.fallback))
        // Filtrar plan FREE, solo mostrar planes de pago
        const paidPlans = (plansData.plans || []).filter((plan: SubscriptionPlan) => plan.name !== 'FREE')
        setPlans(paidPlans)

        // Verificar si ya usó trial
        if (agencyResponse.ok) {
          const agencyData = await agencyResponse.json()
          setHasUsedTrial(agencyData.has_used_trial || false)
        }

        // Obtener días de trial configurados
        if (configResponse.ok) {
          const configData = await configResponse.json()
          setTrialDays(configData.value ? parseInt(configData.value) : 7)
        }
      } catch (error) {
        console.error('Error fetching plans:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchPlans()
  }, [])

  const handleUpgrade = async (planId: string, isUpgradeDuringTrial: boolean = false) => {
    try {
      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, isUpgradeDuringTrial }),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        
        // Si ya usó trial, mostrar mensaje específico
        if (errorData.requiresImmediatePayment) {
          alert('Ya utilizaste tu período de prueba gratuito. Por favor, elegí un plan para continuar.')
          return
        }
        
        throw new Error(errorData.error || 'Error al crear la sesión de pago')
      }
      
      const data = await response.json()
      
      // Si es upgrade durante trial, mostrar advertencia
      if (isUpgradeDuringTrial && data.warning) {
        const confirmed = confirm(data.warning + '\n\n¿Deseas continuar?')
        if (!confirmed) return
      }
      
      const checkoutUrl = data.checkoutUrl || data.initPoint || data.sandboxInitPoint
      
      if (checkoutUrl) {
        window.location.href = checkoutUrl
      } else {
        console.error('No se recibió URL de checkout:', data)
        alert('Error al crear la sesión de pago. Por favor intenta nuevamente.')
      }
    } catch (error) {
      console.error('Error creating checkout session:', error)
      alert(error instanceof Error ? error.message : 'Error al crear la sesión de pago. Por favor intenta nuevamente.')
    }
  }

  const handleVerifyPayment = async () => {
    setVerifying(true)
    try {
      const response = await fetch('/api/billing/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      const data = await response.json()
      if (data.success) {
        alert(data.message || 'Pago verificado correctamente')
        if (data.newStatus === 'ACTIVE' || data.mpStatus === 'authorized') {
          router.push('/dashboard')
        } else {
          window.location.reload()
        }
      } else {
        alert(data.error || data.message || 'Error al verificar el pago')
      }
    } catch (error) {
      console.error('Error verifying payment:', error)
      alert('Error al verificar el pago. Por favor intenta nuevamente.')
    } finally {
      setVerifying(false)
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

  const LeftPanel = () => (
    <div className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-[#0b1220] px-12 py-16 text-white">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 h-[520px] w-[520px] rounded-full bg-sky-500/20 blur-[140px]" />
        <div className="absolute bottom-1/4 right-1/4 h-[420px] w-[420px] rounded-full bg-blue-500/20 blur-[130px]" />
        <div className="absolute top-1/2 left-1/2 h-[640px] w-[640px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-400/10 blur-[170px]" />
      </div>
      <div
        className="absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />
      <div className="relative z-10">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-200">
          <Sparkles className="h-3.5 w-3.5 text-sky-300" />
          Vibook Gestion
        </div>
        <h2 className="mt-6 text-4xl font-bold leading-tight">
          Elegi el plan ideal para tu agencia y activa todo el potencial de{" "}
          <span className="bg-gradient-to-r from-sky-400 via-blue-400 to-cyan-300 bg-clip-text text-transparent">Vibook</span>
        </h2>
        <p className="mt-4 text-lg text-slate-300">
          Automatiza ventas, operaciones y cobros desde un solo lugar. Sin vueltas, sin planillas.
        </p>
        <div className="mt-8 space-y-3 text-sm text-slate-200">
          <div className="flex items-start gap-3">
            <span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300">
              <Check className="h-3.5 w-3.5" />
            </span>
            Panel unificado para ventas, clientes, caja y reportes
          </div>
          <div className="flex items-start gap-3">
            <span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300">
              <Check className="h-3.5 w-3.5" />
            </span>
            IA integrada con Cerebro y Emilia para responder mas rapido
          </div>
          <div className="flex items-start gap-3">
            <span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300">
              <Check className="h-3.5 w-3.5" />
            </span>
            Acceso inmediato y soporte cercano para tu equipo
          </div>
        </div>
      </div>
      <div className="relative z-10 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
        <p className="font-medium text-white">7 dias gratis para empezar</p>
        <p className="mt-1 text-slate-300">Configura tu agencia y cancela cuando quieras.</p>
      </div>
    </div>
  )

  const MobileHero = () => (
    <div className="lg:hidden rounded-3xl bg-[#0b1220] px-6 py-8 text-white shadow-xl shadow-slate-900/20">
      <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-200">
        <Sparkles className="h-3.5 w-3.5 text-sky-300" />
        Vibook Gestion
      </div>
      <h2 className="mt-4 text-2xl font-semibold leading-tight">
        Elegi el plan ideal para impulsar tu agencia
      </h2>
      <p className="mt-2 text-sm text-slate-300">
        Todo lo que necesitas en un solo panel, con IA y automatizaciones.
      </p>
    </div>
  )

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
      <div className="grid min-h-svh lg:grid-cols-[1.05fr_1.25fr]">
        <LeftPanel />
        <div className="flex items-center justify-center bg-white p-6">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
            <p className="text-slate-500">Cargando planes...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="grid min-h-svh lg:grid-cols-[1.05fr_1.25fr]">
      <LeftPanel />
      <div className="bg-white">
        <div className="mx-auto flex min-h-svh max-w-6xl flex-col px-6 py-10 lg:px-10 lg:py-12">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center">
              <Image
                src="/logo-black-2.png"
                alt="Vibook"
                width={120}
                height={40}
                className="h-9 w-auto object-contain"
                priority
                unoptimized
              />
            </Link>
            <div className="hidden items-center gap-2 text-xs text-slate-500 md:flex">
              <CreditCard className="h-3.5 w-3.5 text-slate-400" />
              Sin tarjeta requerida
            </div>
          </div>

          <div className="mt-8">
            <MobileHero />
            <div className="mt-8 max-w-3xl">
              <h1 className="text-3xl font-semibold text-slate-900 md:text-4xl">
                {hasUsedTrial ? 'Elegi tu plan y segui operando' : `Comenza tu prueba gratuita (${trialDays} dias)`}
              </h1>
              <p className="mt-2 text-base text-slate-500 md:text-lg">
                Planes claros, soporte humano y todo lo que necesitas para crecer sin fricciones.
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-2">
                {!hasUsedTrial && (
                  <Badge className="border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                    <Zap className="mr-1.5 h-3.5 w-3.5" />
                    {trialDays} dias gratis
                  </Badge>
                )}
                {hasUsedTrial && (
                  <Badge className="border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                    <Shield className="mr-1.5 h-3.5 w-3.5" />
                    Ya usaste tu prueba gratuita
                  </Badge>
                )}
                <Badge className="border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                  <CreditCard className="mr-1.5 h-3.5 w-3.5" />
                  Sin tarjeta requerida
                </Badge>
                <Badge className="border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                  <Shield className="mr-1.5 h-3.5 w-3.5" />
                  Cancelas cuando quieras
                </Badge>
              </div>
            </div>
          </div>

          {usingFallbackPlans && (
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Billing no configurado en este entorno. Se muestran planes de ejemplo para el layout.
            </div>
          )}

          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            {plans.map((plan) => {
              const price = plan.price_monthly
              const isPopular = plan.name === 'PRO'

              return (
                <Card
                  key={plan.id}
                  className={`relative flex h-full flex-col border ${
                    isPopular
                      ? "border-primary/40 bg-gradient-to-b from-primary/10 to-white shadow-[0_25px_60px_-30px_rgba(37,99,235,0.35)]"
                      : "border-slate-200 bg-white shadow-[0_20px_50px_-35px_rgba(15,23,42,0.25)]"
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-4 left-6 z-20">
                      <Badge className="border border-primary/30 bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow-lg">
                        Mas popular
                      </Badge>
                    </div>
                  )}

                  <CardHeader className="space-y-3 pb-3">
                    <CardTitle className="text-xl font-semibold text-slate-900">{plan.display_name}</CardTitle>
                    <CardDescription className="text-sm text-slate-500">
                      {plan.description}
                    </CardDescription>
                    <div className="pt-4">
                      <div className="flex items-end gap-2">
                        <span className="text-4xl font-semibold text-slate-900">{formatPrice(price)}</span>
                        {price !== null && price > 0 && (
                          <span className="text-sm text-slate-500">/mes</span>
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="flex-1 space-y-3">
                    <div className="space-y-2.5 text-sm text-slate-600">
                      <div className="flex items-start gap-3">
                        <Check className="mt-0.5 h-4 w-4 text-emerald-500" />
                        {formatLimit(plan.max_users)} {plan.max_users === null ? 'usuarios' : plan.max_users === 1 ? 'usuario' : 'usuarios'}
                      </div>
                      <div className="flex items-start gap-3">
                        <Check className="mt-0.5 h-4 w-4 text-emerald-500" />
                        {formatLimit(plan.max_operations_per_month)} operaciones/mes
                      </div>
                      <div className="flex items-start gap-3">
                        {plan.features.cerebro ? (
                          <Check className="mt-0.5 h-4 w-4 text-emerald-500" />
                        ) : (
                          <span className="mt-0.5 h-4 w-4 text-slate-300">—</span>
                        )}
                        <span className={plan.features.cerebro ? "text-slate-600" : "text-slate-400"}>
                          Cerebro (Asistente IA)
                        </span>
                      </div>
                      <div className="flex items-start gap-3">
                        {plan.features.emilia ? (
                          <Check className="mt-0.5 h-4 w-4 text-emerald-500" />
                        ) : (
                          <span className="mt-0.5 h-4 w-4 text-slate-300">—</span>
                        )}
                        <span className={plan.features.emilia ? "text-slate-600" : "text-slate-400"}>
                          Emilia (Asistente IA)
                        </span>
                      </div>
                      <div className="flex items-start gap-3">
                        {plan.features.whatsapp ? (
                          <Check className="mt-0.5 h-4 w-4 text-emerald-500" />
                        ) : (
                          <span className="mt-0.5 h-4 w-4 text-slate-300">—</span>
                        )}
                        <span className={plan.features.whatsapp ? "text-slate-600" : "text-slate-400"}>
                          WhatsApp
                        </span>
                      </div>
                      <div className="flex items-start gap-3">
                        {plan.features.reports ? (
                          <Check className="mt-0.5 h-4 w-4 text-emerald-500" />
                        ) : (
                          <span className="mt-0.5 h-4 w-4 text-slate-300">—</span>
                        )}
                        <span className={plan.features.reports ? "text-slate-600" : "text-slate-400"}>
                          Reportes avanzados
                        </span>
                      </div>
                      <div className="flex items-start gap-3">
                        {plan.features.marketing_ads ? (
                          <Check className="mt-0.5 h-4 w-4 text-emerald-500" />
                        ) : (
                          <span className="mt-0.5 h-4 w-4 text-slate-300">—</span>
                        )}
                        <span className={plan.features.marketing_ads ? "text-slate-600" : "text-slate-400"}>
                          Marketing y Ads
                        </span>
                      </div>
                    </div>
                  </CardContent>

                  <CardFooter className="pt-4">
                    <Button
                      className={`h-11 w-full text-sm font-semibold ${usingFallbackPlans ? "cursor-not-allowed opacity-70" : ""}`}
                      variant={isPopular ? "default" : "outline"}
                      onClick={() => handleUpgrade(plan.id)}
                      disabled={loading || usingFallbackPlans}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Cargando...
                        </>
                      ) : (
                        usingFallbackPlans ? 'Configurar Billing' : 'Comenzar Prueba Gratis'
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              )
            })}
          </div>

          <div className="mt-10 space-y-2 text-sm text-slate-500">
            <div className="flex items-start gap-2">
              <Shield className="mt-0.5 h-4 w-4 text-slate-400" />
              <p>
                {hasUsedTrial
                  ? 'El pago se realizara inmediatamente al suscribirte.'
                  : `Tu informacion esta protegida. No se realizara ningun cobro durante los ${trialDays} dias de prueba.`}
              </p>
            </div>
            <p>
              {hasUsedTrial
                ? 'Podes cancelar en cualquier momento desde la configuracion de tu cuenta.'
                : 'Despues de la prueba, se cobrara automaticamente segun el plan elegido. Podes cancelar en cualquier momento.'}
            </p>
          </div>

          <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-medium text-slate-900">¿Mercado Pago no te redirigio?</p>
                <p>Si ya confirmaste el pago, revisa el estado aca mismo.</p>
              </div>
              <Button onClick={handleVerifyPayment} disabled={verifying} className="h-10">
                {verifying ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  'Verificar pago'
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
