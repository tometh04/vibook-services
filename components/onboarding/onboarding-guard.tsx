"use client"

import { useEffect, useMemo, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, Circle, ArrowRight } from "lucide-react"
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
  mode?: "AUTO" | "FORCE_ON" | "FORCE_OFF"
}

function isAllowedPath(pathname: string, allowedPrefixes: string[]) {
  return allowedPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(prefix + "/"))
}

interface OnboardingGuardProps {
  variant?: "floating" | "sidebar"
}

export function OnboardingGuard({ variant = "floating" }: OnboardingGuardProps) {
  const router = useRouter()
  const pathname = usePathname()
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

  const isCompleted = Boolean(progress && progress.totalCount > 0 && progress.completedCount === progress.totalCount)
  const showCompleted = progress?.mode === "FORCE_ON" && !progress.currentStep && isCompleted

  if (loading || skipRequested || (!progress?.active && !showCompleted) || (!progress?.currentStep && !showCompleted)) {
    return null
  }

  const current = progress.currentStep

  const handleSkip = async () => {
    setSkipRequested(true)
    setProgress((prev) => (prev ? { ...prev, active: false, currentStep: null } : prev))
    await trackOnboardingEvent("skipped_onboarding")
  }

  if (variant === "sidebar") {
    return (
      <div className="group-data-[collapsible=icon]:hidden px-2 pb-3">
        <div className="rounded-xl border border-sidebar-border bg-sidebar px-3 py-3 text-sidebar-foreground shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-sidebar-foreground/70">
              Onboarding
            </div>
            <div className="flex items-center gap-1.5">
              <span className="rounded-full border border-sidebar-border px-2 py-0.5 text-[10px]">
                {completionPercent}%
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[10px] text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                onClick={handleSkip}
              >
                Saltar
              </Button>
            </div>
          </div>

          <Progress
            value={completionPercent}
            className="mt-2 h-1.5 bg-sidebar-accent/60 [&>div]:bg-sidebar-primary"
          />
          <p className="mt-2 text-[11px] text-sidebar-foreground/70">
            Completá cada paso para desbloquear el sistema.
          </p>

          {showCompleted ? (
            <div className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2">
              <p className="text-[10px] uppercase tracking-wide text-emerald-700/70">
                Completado
              </p>
              <p className="mt-1 text-xs font-semibold text-emerald-700">
                Onboarding finalizado
              </p>
              <p className="mt-1 text-[11px] text-emerald-700/70">
                El usuario ya recorrió todos los pasos.
              </p>
            </div>
          ) : current ? (
            <div className="mt-3 rounded-lg border border-sidebar-border/60 bg-sidebar-accent/30 p-2">
              <p className="text-[10px] uppercase tracking-wide text-sidebar-foreground/60">
                Paso actual
              </p>
              <p className="mt-1 text-xs font-semibold">{current.title}</p>
              <p className="mt-1 text-[11px] text-sidebar-foreground/70 line-clamp-2">
                {current.description}
              </p>
              <Button
                size="sm"
                className="mt-2 h-7 w-full text-xs bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90"
                onClick={() => router.push(current.actionPath)}
              >
                {current.actionLabel}
                <ArrowRight className="ml-2 h-3.5 w-3.5" />
              </Button>
            </div>
          ) : null}

          <div className="mt-3 space-y-1 text-[11px]">
            {progress.steps.map((step) => (
              <div key={step.id} className="flex items-start gap-2">
                {step.completed ? (
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-green-500" />
                ) : (
                  <Circle className="mt-0.5 h-3.5 w-3.5 text-sidebar-foreground/50" />
                )}
                <span className={step.completed ? "text-sidebar-foreground/50 line-through" : "text-sidebar-foreground"}>
                  {step.title}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[360px] max-w-[90vw]">
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
          {showCompleted ? (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
              <p className="text-xs uppercase tracking-wide text-emerald-700/70">
                Completado
              </p>
              <p className="text-sm font-semibold mt-1 text-emerald-700">
                Onboarding finalizado
              </p>
              <p className="text-xs text-emerald-700/70 mt-1">
                El usuario ya completó todos los pasos.
              </p>
            </div>
          ) : current ? (
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
          ) : null}

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
