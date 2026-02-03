"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Loader2 } from "lucide-react"
import Link from "next/link"

const signupSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  email: z.string().email("Email inválido"),
  password: z.string()
    .min(8, "La contraseña debe tener al menos 8 caracteres")
    .regex(/[A-Z]/, "Debe contener al menos una mayúscula")
    .regex(/[a-z]/, "Debe contener al menos una minúscula")
    .regex(/[0-9]/, "Debe contener al menos un número"),
  agencyName: z.string().min(2, "El nombre de la agencia debe tener al menos 2 caracteres"),
  city: z.string().min(2, "La ciudad debe tener al menos 2 caracteres"),
})

type SignupFormValues = z.infer<typeof signupSchema>

export function SignupForm() {
  const router = useRouter()
  const [error, setError] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [socialLoading, setSocialLoading] = React.useState<string | null>(null)

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      agencyName: "",
      city: "",
    },
  })

  const onSubmit = async (data: SignupFormValues) => {
    setError(null)
    setLoading(true)

    try {
      // Llamar a nuestra API route para manejar el signup completo
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          password: data.password,
          agencyName: data.agencyName,
          city: data.city,
        }),
      })

      // Verificar si la respuesta tiene contenido JSON
      let result
      const contentType = response.headers.get("content-type")
      if (contentType && contentType.includes("application/json")) {
        result = await response.json()
      } else {
        const text = await response.text()
        throw new Error(text || "Error al crear la cuenta")
      }

      if (!response.ok) {
        throw new Error(result.error || "Error al crear la cuenta")
      }

      // Si el signup fue exitoso, el usuario necesita verificar su email
      router.push("/auth/verify-email?email=" + encodeURIComponent(data.email))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear la cuenta")
    } finally {
      setLoading(false)
    }
  }

  const handleSocialLogin = async () => {
    setError(null)
    setSocialLoading("google")

    try {
      const origin = window.location.origin
      // IMPORTANTE: El redirectTo debe ser la URL de nuestra app, NO la de Supabase
      // Supabase manejará la redirección internamente
      // IMPORTANTE: El redirectTo debe ser la URL de nuestra app donde queremos que vuelva
      // Supabase manejará internamente la redirección a Google y luego de vuelta a nuestra app
      const redirectTo = `${origin}/auth/callback`

      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      })

      if (oauthError) {
        console.error("❌ OAuth error:", oauthError)
        throw oauthError
      }

      // Si data.url existe, significa que Supabase quiere redirigir manualmente
      if (data?.url) {
        window.location.href = data.url
      }
    } catch (err) {
      console.error("❌ Error en handleSocialLogin:", err)
      setError(err instanceof Error ? err.message : "Error al iniciar sesión con Google. Verifica que Google OAuth esté configurado en Supabase.")
      setSocialLoading(null)
    }
  }

  return (
    <Card className="w-full max-w-md border-slate-200/80 bg-white shadow-xl shadow-slate-200/40">
      <CardHeader className="space-y-1 pb-2">
        <CardTitle className="text-2xl font-semibold text-slate-900">Crear cuenta</CardTitle>
        <CardDescription className="text-slate-500">
          Comenzá tu prueba gratuita y gestioná tu agencia de viajes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={handleSocialLogin}
          disabled={loading || !!socialLoading}
          className="w-full h-12 text-base border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-sm"
        >
          {socialLoading === "google" ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
          )}
          Continuar con Google
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <Separator className="bg-slate-200" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-slate-400">
              O continuá con email
            </span>
          </div>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <Alert className="border-red-200 bg-red-50 text-red-700">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="name" className="text-slate-900">Nombre completo</Label>
            <Input
              id="name"
              type="text"
              placeholder="Juan Pérez"
              {...form.register("name")}
              disabled={loading || !!socialLoading}
              autoComplete="name"
              className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus-visible:border-blue-500 focus-visible:ring-blue-500/20 focus-visible:ring-offset-0"
            />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-slate-900">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="tu@email.com"
              {...form.register("email")}
              disabled={loading || !!socialLoading}
              autoComplete="email"
              className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus-visible:border-blue-500 focus-visible:ring-blue-500/20 focus-visible:ring-offset-0"
            />
            {form.formState.errors.email && (
              <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-slate-900">Contraseña</Label>
            <Input
              id="password"
              type="password"
              {...form.register("password")}
              disabled={loading || !!socialLoading}
              autoComplete="new-password"
              className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus-visible:border-blue-500 focus-visible:ring-blue-500/20 focus-visible:ring-offset-0"
            />
            {form.formState.errors.password && (
              <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
            )}
            <p className="text-xs text-slate-500">
              Mínimo 8 caracteres con mayúscula, minúscula y número
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="agencyName" className="text-slate-900">Nombre de tu agencia</Label>
            <Input
              id="agencyName"
              type="text"
              placeholder="Mi Agencia de Viajes"
              {...form.register("agencyName")}
              disabled={loading || !!socialLoading}
              className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus-visible:border-blue-500 focus-visible:ring-blue-500/20 focus-visible:ring-offset-0"
            />
            {form.formState.errors.agencyName && (
              <p className="text-sm text-destructive">{form.formState.errors.agencyName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="city" className="text-slate-900">Ciudad</Label>
            <Input
              id="city"
              type="text"
              placeholder="Buenos Aires"
              {...form.register("city")}
              disabled={loading || !!socialLoading}
              className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus-visible:border-blue-500 focus-visible:ring-blue-500/20 focus-visible:ring-offset-0"
            />
            {form.formState.errors.city && (
              <p className="text-sm text-destructive">{form.formState.errors.city.message}</p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-200/60 bg-none"
            disabled={loading || !!socialLoading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creando cuenta...
              </>
            ) : (
              "Crear cuenta"
            )}
          </Button>
        </form>

        <div className="text-center text-sm text-slate-500">
          ¿Ya tenés una cuenta?{" "}
          <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium">
            Iniciar sesión
          </Link>
        </div>

        <p className="text-xs text-center text-slate-500">
          Al crear una cuenta, aceptás nuestros{" "}
          <Link href="/terms" className="text-blue-600 hover:text-blue-700">
            Términos de servicio
          </Link>{" "}
          y{" "}
          <Link href="/privacy" className="text-blue-600 hover:text-blue-700">
            Política de privacidad
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
