"use client"

import { Suspense, useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Mail, Loader2, CheckCircle2, ArrowLeft } from "lucide-react"

export const dynamic = 'force-dynamic'

function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const email = searchParams.get("email")
  const token = searchParams.get("token")
  const type = searchParams.get("type")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [verified, setVerified] = useState(false)

  useEffect(() => {
    // Verificar si viene con token de verificación (desde el link del email)
    const handleVerification = async () => {
      try {
        // Si hay un hash en la URL, Supabase ya procesó el token
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const accessToken = hashParams.get("access_token")
        const refreshToken = hashParams.get("refresh_token")
        const typeFromHash = hashParams.get("type")

        if (accessToken && refreshToken) {
          // Establecer la sesión con los tokens
          const { data, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })

          if (sessionError) {
            console.error("Error setting session:", sessionError)
            setError("Error al verificar el email. El enlace puede haber expirado.")
            setLoading(false)
            return
          }

          if (data.user) {
            // Verificar si el email está confirmado
            const { data: { user: updatedUser } } = await supabase.auth.getUser()
            if (updatedUser?.email_confirmed_at) {
              // Email verificado exitosamente - redirigir a página de confirmación y luego onboarding
              router.push("/auth/verified")
              return
            }
          }
        }

        // Verificar si el usuario ya está verificado (página normal de verify-email)
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user?.email_confirmed_at) {
          router.push("/auth/verified")
          return
        }

        setLoading(false)
      } catch (err: any) {
        console.error("Error in verification:", err)
        setError(err.message || "Error al verificar el email")
        setLoading(false)
      }
    }

    handleVerification()
  }, [router])

  const handleResendEmail = async () => {
    if (!email) {
      setError("No se encontró el email")
      return
    }

    setError(null)
    setLoading(true)

    try {
      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/verify-email?email=${encodeURIComponent(email)}`,
        },
      })

      if (resendError) throw resendError

      setSuccess(true)
      setTimeout(() => setSuccess(false), 5000)
    } catch (err: any) {
      setError(err.message || "Error al reenviar el email")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
            <CardTitle className="text-2xl">Verificando email...</CardTitle>
            <CardDescription>Por favor espera</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Mail className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Verifica tu email</CardTitle>
          <CardDescription>
            {email ? (
              <>
                Te enviamos un enlace de verificación a <strong>{email}</strong>
              </>
            ) : (
              "Te enviamos un enlace de verificación a tu email"
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            Hacé clic en el enlace del email para verificar tu cuenta y comenzar a usar Vibook Gestión.
          </p>

          {success && (
            <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800 dark:text-green-200">
                Email reenviado exitosamente. Revisá tu bandeja de entrada.
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="bg-muted p-4 rounded-lg text-sm space-y-2">
            <p className="font-medium mb-2">¿No recibiste el email?</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li>Revisá tu carpeta de spam o correo no deseado</li>
              <li>Verificá que el email sea correcto</li>
              <li>Esperá unos minutos e intentá de nuevo</li>
              <li>El enlace expira en 24 horas</li>
            </ul>
          </div>

          {email && (
            <Button
              onClick={handleResendEmail}
              disabled={loading || success}
              variant="outline"
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                "Reenviar email de verificación"
              )}
            </Button>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Link href="/login" className="w-full">
            <Button variant="ghost" className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver al Login
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Mail className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Verifica tu email</CardTitle>
            <CardDescription>Cargando...</CardDescription>
          </CardHeader>
        </Card>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  )
}
