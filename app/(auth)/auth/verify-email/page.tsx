"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Mail, Loader2, CheckCircle2, ArrowLeft } from "lucide-react"

export default function VerifyEmailPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const email = searchParams.get("email")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    // Verificar si el usuario ya está verificado
    const checkVerification = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user?.email_confirmed_at) {
        router.push("/dashboard")
      }
    }
    checkVerification()
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
          emailRedirectTo: `${window.location.origin}/auth/verify-email`,
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
