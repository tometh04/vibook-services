"use client"

import { useEffect, useMemo, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, Circle, ArrowRight } from "lucide-react"
import { useIsMobile } from "@/hooks/use-mobile"
import { trackOnboardingEvent } from "@/lib/onboarding/client"

interface OnboardingStep {
  id: string
  title: string
  description: string
  actionLabel: string
  actionPath: string
  allowedPrefixes: string[]
  completed: boolean
}

interface OnboardingProgress {
  active: boolean
  steps: OnboardingStep[]
  currentStep: OnboardingStep | null
  completedCount: number
  totalCount: number
  planName: string | null
}

function isAllowedPath(pathname: string, allowedPrefixes: string[]) {
  return allowedPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(prefix + "/"))
}

export function OnboardingGuard() {
  const router = useRouter()
  const pathname = usePathname()
  const isMobile = useIsMobile()
  const [progress, setProgress] = useState<OnboardingProgress | null>(null)
  const [loading, setLoading] = useState(true)
  const [skipRequested, setSkipRequested] = useState(false)

  const refresh = async () => {
    try {
      const response = await fetch("/api/onboarding/progress", { cache: "no-store" })
      if (!response.ok) return
      const data = await response.json()
      setProgress(data)
    } catch (error) {
      console.error("[OnboardingGuard] Error:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [pathname])

  useEffect(() => {
    const interval = setInterval(refresh, 8000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (loading || skipRequested || !progress?.active || !progress.currentStep || !pathname) return
    if (!isAllowedPath(pathname, progress.currentStep.allowedPrefixes)) {
      router.push(progress.currentStep.actionPath)
    }
  }, [loading, skipRequested, progress, pathname, router])

  const completionPercent = useMemo(() => {
    if (!progress || progress.totalCount === 0) return 0
    return Math.round((progress.completedCount / progress.totalCount) * 100)
  }, [progress])

  if (loading || skipRequested || !progress?.active || !progress.currentStep) return null

  const current = progress.currentStep
  const shouldDockLeft = !isMobile && current.id === "payment" && Boolean(pathname?.startsWith("/operations"))

  const handleSkip = async () => {
    setSkipRequested(true)
    setProgress((prev) => (prev ? { ...prev, active: false, currentStep: null } : prev))
    await trackOnboardingEvent("skipped_onboarding")
  }

  return (
    <div
      className="fixed bottom-6 right-6 z-50 w-[360px] max-w-[90vw]"
      style={shouldDockLeft ? { left: "calc(var(--sidebar-width) + 1.5rem)", right: "auto" } : undefined}
    >
      <Card className="border border-primary/20 bg-background/95 shadow-xl backdrop-blur">
        <CardHeader className="space-y-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Onboarding guiado</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{completionPercent}%</Badge>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={handleSkip}
              >
                Saltar
              </Button>
            </div>
          </div>
          <Progress value={completionPercent} className="h-2" />
          <p className="text-xs text-muted-foreground">
            Completá cada paso para desbloquear el resto del sistema.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-border/70 bg-muted/40 p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Paso actual
            </p>
            <p className="text-sm font-semibold mt-1">{current.title}</p>
            <p className="text-xs text-muted-foreground mt-1">{current.description}</p>
            <Button
              size="sm"
              className="mt-3 w-full"
              onClick={() => router.push(current.actionPath)}
            >
              {current.actionLabel}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-2">
            {progress.steps.map((step) => (
              <div key={step.id} className="flex items-start gap-2 text-xs">
                {step.completed ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-green-500" />
                ) : (
                  <Circle className="mt-0.5 h-4 w-4 text-muted-foreground" />
                )}
                <div>
                  <span className={step.completed ? "text-muted-foreground line-through" : "text-foreground"}>
                    {step.title}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
