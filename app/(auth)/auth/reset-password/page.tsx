"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, CheckCircle2, AlertCircle, Eye, EyeOff, KeyRound, ArrowLeft } from "lucide-react"

export const dynamic = 'force-dynamic'

// Traducir errores comunes de Supabase al español
function translateError(message: string): string {
  const translations: Record<string, string> = {
    "New password should be different from the old password.":
      "La nueva contraseña debe ser diferente a la anterior.",
    "Password should be at least 6 characters":
      "La contraseña debe tener al menos 6 caracteres.",
    "Auth session missing!":
      "La sesión ha expirado. Solicitá un nuevo enlace de recuperación.",
    "Token has expired or is invalid":
      "El enlace ha expirado o es inválido. Solicitá uno nuevo.",
  }
  return translations[message] || message
}

export default function ResetPasswordPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [validSession, setValidSession] = useState(false)

  useEffect(() => {
    async function handleReset() {
      try {
        // Verificar si hay un hash en la URL (token de reset)
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const accessToken = hashParams.get("access_token")
        const refreshToken = hashParams.get("refresh_token")
        const type = hashParams.get("type")

        if (type === "recovery" && accessToken && refreshToken) {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })

          if (error) {
            console.error("Set session error:", error)
            setError("El enlace de recuperación ha expirado o es inválido. Solicitá uno nuevo.")
            setLoading(false)
            return
          }

          if (data.session) {
            setValidSession(true)
          }
        } else {
          // Verificar si ya hay una sesión activa (usuario logueado quiere cambiar contraseña)
          const { data: { session } } = await supabase.auth.getSession()
          if (session) {
            setValidSession(true)
          } else {
            setError("Enlace de recuperación inválido o expirado. Solicitá uno nuevo desde el login.")
          }
        }

        setLoading(false)
      } catch (err) {
        console.error("Error handling reset:", err)
        setError("Error al procesar la solicitud")
        setLoading(false)
      }
    }

    handleReset()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validaciones
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres")
      return
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden")
      return
    }

    // Validar fortaleza
    const hasUpperCase = /[A-Z]/.test(password)
    const hasLowerCase = /[a-z]/.test(password)
    const hasNumbers = /\d/.test(password)

    if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
      setError("La contraseña debe contener mayúsculas, minúsculas y números")
      return
    }

    setSubmitting(true)

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      })

      if (updateError) {
        console.error("Update password error:", updateError)
        setError(translateError(updateError.message) || "Error al actualizar la contraseña")
        setSubmitting(false)
        return
      }

      setSuccess(true)

      // Redirigir al login después de 2 segundos
      setTimeout(() => {
        router.push("/login")
      }, 2000)
    } catch (err: any) {
      console.error("Error resetting password:", err)
      setError(translateError(err.message) || "Error al actualizar la contraseña")
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-4">
        <div className="w-full max-w-md">
          <div className="flex justify-center mb-8">
            <Image
              src="/logo-black-2.png"
              alt="Vibook"
              width={120}
              height={40}
              className="h-10 w-auto object-contain"
              unoptimized
            />
          </div>
          <Card className="border-slate-200/80 bg-white shadow-xl shadow-slate-200/40">
            <CardContent className="pt-6 flex flex-col items-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
              <p className="text-slate-500">Verificando enlace...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-4">
        <div className="w-full max-w-md">
          <div className="flex justify-center mb-8">
            <Image
              src="/logo-black-2.png"
              alt="Vibook"
              width={120}
              height={40}
              className="h-10 w-auto object-contain"
              unoptimized
            />
          </div>
          <Card className="border-slate-200/80 bg-white shadow-xl shadow-slate-200/40">
            <CardContent className="pt-8 pb-8 flex flex-col items-center">
              <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-emerald-50 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              </div>
              <h2 className="text-xl font-semibold text-slate-900 mb-2">¡Contraseña actualizada!</h2>
              <p className="text-slate-500 text-center text-sm">
                Tu contraseña fue cambiada exitosamente. Redirigiendo al login...
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (!validSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-4">
        <div className="w-full max-w-md">
          <div className="flex justify-center mb-8">
            <Link href="/login">
              <Image
                src="/logo-black-2.png"
                alt="Vibook"
                width={120}
                height={40}
                className="h-10 w-auto object-contain"
                unoptimized
              />
            </Link>
          </div>
          <Card className="border-slate-200/80 bg-white shadow-xl shadow-slate-200/40">
            <CardHeader className="text-center space-y-2">
              <div className="mx-auto mb-2 h-12 w-12 rounded-full bg-red-50 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <CardTitle className="text-2xl text-slate-900">Enlace inválido</CardTitle>
              <CardDescription className="text-slate-500">
                {error}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button onClick={() => router.push("/forgot-password")} className="w-full h-11">
                Solicitar nuevo enlace
              </Button>
              <Button onClick={() => router.push("/login")} variant="outline" className="w-full h-11 border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver al Login
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Link href="/login">
            <Image
              src="/logo-black-2.png"
              alt="Vibook"
              width={120}
              height={40}
              className="h-10 w-auto object-contain"
              unoptimized
            />
          </Link>
        </div>
        <Card className="border-slate-200/80 bg-white shadow-xl shadow-slate-200/40">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto mb-2 h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center">
              <KeyRound className="h-6 w-6 text-blue-600" />
            </div>
            <CardTitle className="text-2xl text-slate-900">Nueva Contraseña</CardTitle>
            <CardDescription className="text-slate-500">
              Ingresá tu nueva contraseña para acceder a tu cuenta
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-900">Nueva Contraseña</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    required
                    minLength={8}
                    autoFocus
                    className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus-visible:border-blue-500 focus-visible:ring-blue-500/20 focus-visible:ring-offset-0"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 text-slate-400 hover:text-slate-600"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-slate-900">Confirmar Contraseña</Label>
                <Input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repetí la contraseña"
                  required
                  className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus-visible:border-blue-500 focus-visible:ring-blue-500/20 focus-visible:ring-offset-0"
                />
              </div>

              {/* Requisitos de contraseña */}
              <div className="text-xs space-y-1">
                <p className={password.length >= 8 ? "text-emerald-600" : "text-slate-400"}>
                  ✓ Mínimo 8 caracteres
                </p>
                <p className={/[A-Z]/.test(password) ? "text-emerald-600" : "text-slate-400"}>
                  ✓ Al menos una mayúscula
                </p>
                <p className={/[a-z]/.test(password) ? "text-emerald-600" : "text-slate-400"}>
                  ✓ Al menos una minúscula
                </p>
                <p className={/\d/.test(password) ? "text-emerald-600" : "text-slate-400"}>
                  ✓ Al menos un número
                </p>
              </div>

              {error && (
                <Alert className="border-red-200 bg-red-50 text-red-700">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full h-11" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Actualizando...
                  </>
                ) : (
                  "Actualizar Contraseña"
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Link
              href="/login"
              className="text-sm text-slate-500 hover:text-blue-600 flex items-center gap-1"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver al Login
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
