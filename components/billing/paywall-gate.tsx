"use client"

import { ReactNode, useState } from "react"
import { useSubscription } from "@/hooks/use-subscription"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Lock, ArrowRight } from "lucide-react"
import Link from "next/link"
import { getPlanForFeature, getFeatureDisplayName } from "@/lib/billing/plan-features"

interface PaywallGateProps {
  children: ReactNode
  feature: string
  requiredPlan?: string
  message?: string
}

export function PaywallGate({ 
  children, 
  feature, 
  requiredPlan,
  message 
}: PaywallGateProps) {
  const { subscription, canUseFeature, loading } = useSubscription()
  const [showUpgrade, setShowUpgrade] = useState(false)

  if (loading) {
    return <div className="animate-pulse">{children}</div>
  }

  const hasAccess = canUseFeature(feature)

  if (hasAccess) {
    return <>{children}</>
  }

  // Si es TESTER, mostrar qué plan incluye esta feature
  const isTester = subscription?.plan?.name === "TESTER"
  const planInfo = getPlanForFeature(feature)
  const featureName = getFeatureDisplayName(feature)

  const defaultMessage = message || (
    isTester && planInfo
      ? `${featureName} está incluido en el plan ${planInfo.displayName}.`
      : `Esta funcionalidad requiere el plan ${requiredPlan || planInfo?.displayName || "Pro"}.`
  )

  // SIEMPRE mostrar el contenido, pero bloqueado (para Starter que puede ver pero no usar)
  return (
    <>
      <div className="relative">
        {/* Contenido visible pero bloqueado */}
        <div className="pointer-events-none opacity-50 blur-sm select-none">
          {children}
        </div>
        {/* Overlay de paywall */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg z-10">
          <div className="text-center p-6 space-y-4 max-w-md">
            <Lock className="h-12 w-12 mx-auto text-muted-foreground" />
            <div>
              <h3 className="text-lg font-semibold mb-2">Funcionalidad Premium</h3>
              <p className="text-sm text-muted-foreground mb-2">
                {defaultMessage}
              </p>
              {isTester && planInfo && (
                <Badge variant="outline" className="mb-4">
                  Incluido en: {planInfo.displayName}
                </Badge>
              )}
              <Button asChild onClick={() => setShowUpgrade(true)}>
                <Link href="/paywall">
                  Ver Planes
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={showUpgrade} onOpenChange={setShowUpgrade}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Actualizar Plan</DialogTitle>
            <DialogDescription>
              {defaultMessage}
            </DialogDescription>
          </DialogHeader>
          <Alert>
            <Lock className="h-4 w-4" />
            <AlertDescription>
              Necesitás un plan superior para acceder a esta funcionalidad.
            </AlertDescription>
          </Alert>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUpgrade(false)}>
              Cancelar
            </Button>
            <Button asChild>
              <Link href="/paywall">
                Ver Planes Disponibles
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
