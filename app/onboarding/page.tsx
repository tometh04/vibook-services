"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, CheckCircle2, Building2, Palette, Users } from "lucide-react"

const onboardingSchema = z.object({
  agencyName: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  city: z.string().min(2, "La ciudad debe tener al menos 2 caracteres"),
  timezone: z.string().min(1, "La zona horaria es requerida"),
  brandName: z.string().min(2, "El nombre de marca debe tener al menos 2 caracteres"),
})

type OnboardingFormValues = z.infer<typeof onboardingSchema>

const TIMEZONES = [
  { value: "America/Argentina/Buenos_Aires", label: "Buenos Aires (GMT-3)" },
  { value: "America/Argentina/Cordoba", label: "Córdoba (GMT-3)" },
  { value: "America/Argentina/Mendoza", label: "Mendoza (GMT-3)" },
  { value: "America/Montevideo", label: "Montevideo (GMT-3)" },
  { value: "America/Santiago", label: "Santiago (GMT-3)" },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const totalSteps = 3

  const form = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      agencyName: "",
      city: "",
      timezone: "America/Argentina/Buenos_Aires",
      brandName: "",
    },
  })

  const handleNext = async () => {
    const isValid = await form.trigger()
    if (!isValid) return

    if (step < totalSteps) {
      setStep(step + 1)
    } else {
      await handleSubmit()
    }
  }

  const handleSubmit = async () => {
    setError(null)
    setLoading(true)

    try {
      const data = form.getValues()
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Error al completar el onboarding")
      }

      // Redirigir al dashboard
      router.push("/dashboard")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al completar el onboarding")
    } finally {
      setLoading(false)
    }
  }

  const progress = (step / totalSteps) * 100

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="space-y-4">
          <div className="space-y-2">
            <CardTitle className="text-3xl font-bold">Bienvenido a Vibook Gestión</CardTitle>
            <CardDescription className="text-base">
              Configurá tu agencia en unos simples pasos
            </CardDescription>
          </div>
          <Progress value={progress} className="h-2" />
          <div className="text-sm text-muted-foreground text-center">
            Paso {step} de {totalSteps}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Step 1: Información de la agencia */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Información de tu agencia</h3>
                  <p className="text-sm text-muted-foreground">
                    Datos básicos para configurar tu cuenta
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="agencyName">Nombre de la agencia *</Label>
                  <Input
                    id="agencyName"
                    {...form.register("agencyName")}
                    placeholder="Mi Agencia de Viajes"
                    disabled={loading}
                  />
                  {form.formState.errors.agencyName && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.agencyName.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="city">Ciudad *</Label>
                  <Input
                    id="city"
                    {...form.register("city")}
                    placeholder="Buenos Aires"
                    disabled={loading}
                  />
                  {form.formState.errors.city && (
                    <p className="text-sm text-destructive">{form.formState.errors.city.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timezone">Zona horaria *</Label>
                  <select
                    id="timezone"
                    {...form.register("timezone")}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={loading}
                  >
                    {TIMEZONES.map((tz) => (
                      <option key={tz.value} value={tz.value}>
                        {tz.label}
                      </option>
                    ))}
                  </select>
                  {form.formState.errors.timezone && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.timezone.message}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Branding */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Palette className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Personalización</h3>
                  <p className="text-sm text-muted-foreground">
                    Configurá el nombre de tu marca (podés cambiarlo después)
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="brandName">Nombre de marca *</Label>
                  <Input
                    id="brandName"
                    {...form.register("brandName")}
                    placeholder="Mi Agencia"
                    disabled={loading}
                  />
                  <p className="text-xs text-muted-foreground">
                    Este nombre aparecerá en emails, facturas y documentos
                  </p>
                  {form.formState.errors.brandName && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.brandName.message}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Resumen */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-primary/10">
                  <CheckCircle2 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">¡Casi listo!</h3>
                  <p className="text-sm text-muted-foreground">
                    Revisá la información y completá el setup
                  </p>
                </div>
              </div>

              <div className="bg-muted p-4 rounded-lg space-y-3">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Agencia</p>
                  <p className="text-base font-semibold">{form.watch("agencyName")}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Ciudad</p>
                  <p className="text-base font-semibold">{form.watch("city")}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Zona horaria</p>
                  <p className="text-base font-semibold">
                    {TIMEZONES.find((tz) => tz.value === form.watch("timezone"))?.label}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Nombre de marca</p>
                  <p className="text-base font-semibold">{form.watch("brandName")}</p>
                </div>
              </div>
            </div>
          )}

          {/* Botones de navegación */}
          <div className="flex justify-between pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep(Math.max(1, step - 1))}
              disabled={step === 1 || loading}
            >
              Anterior
            </Button>
            <Button
              type="button"
              onClick={handleNext}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : step === totalSteps ? (
                "Completar setup"
              ) : (
                "Siguiente"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
