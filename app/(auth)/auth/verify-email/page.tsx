"use client"

import { Suspense, useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Image from "next/image"
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
      <div className="grid min-h-svh lg:grid-cols-2">
        <div className="bg-[#0b1220] relative hidden lg:flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-1/4 left-1/4 w-[520px] h-[520px] bg-sky-500/20 rounded-full blur-[130px] animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-[420px] h-[420px] bg-blue-500/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: "1s" }} />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[640px] h-[640px] bg-cyan-400/10 rounded-full blur-[160px]" />
          </div>
          <div
            className="absolute inset-0 opacity-[0.15]"
            style={{
              backgroundImage: `linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
                               linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)`,
              backgroundSize: "60px 60px",
            }}
          />
          <div className="relative z-10 px-8 text-white">
            <h2 className="text-4xl font-bold mb-4 leading-tight">
              Verificación de cuenta<br />
              para <span className="bg-gradient-to-r from-sky-400 via-blue-400 to-cyan-300 bg-clip-text text-transparent">Vibook</span>
            </h2>
            <p className="text-slate-300 text-lg">Estamos preparando tu acceso</p>
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center p-6 md:p-10 bg-white">
          <div className="w-full max-w-md">
            <div className="flex justify-center mb-8">
              <Link href="/" className="flex items-center">
                <Image
                  src="/logo-black-2.png"
                  alt="Vibook"
                  width={120}
                  height={40}
                  className="h-10 w-auto object-contain"
                  priority
                  unoptimized
                />
              </Link>
            </div>
            <Card className="w-full border-slate-200/80 bg-white shadow-xl shadow-slate-200/40">
              <CardHeader className="text-center space-y-2 pb-2">
                <div className="mx-auto mb-2 h-16 w-16 rounded-full bg-blue-50 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
                </div>
                <CardTitle className="text-2xl font-semibold text-slate-900">Verificando email...</CardTitle>
                <CardDescription className="text-slate-500">Por favor esperá un momento</CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="bg-[#0b1220] relative hidden lg:flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-[520px] h-[520px] bg-sky-500/20 rounded-full blur-[130px] animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-[420px] h-[420px] bg-blue-500/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: "1s" }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[640px] h-[640px] bg-cyan-400/10 rounded-full blur-[160px]" />
        </div>
        <div
          className="absolute inset-0 opacity-[0.15]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
                             linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />
        <div className="relative z-10 px-8 text-white">
          <h2 className="text-4xl font-bold mb-4 leading-tight">
            Verificá tu cuenta<br />
            para <span className="bg-gradient-to-r from-sky-400 via-blue-400 to-cyan-300 bg-clip-text text-transparent">Vibook</span>
          </h2>
          <p className="text-slate-300 text-lg">Un paso más y empezás a operar</p>
        </div>
      </div>
      <div className="flex flex-1 items-center justify-center p-6 md:p-10 bg-white">
        <div className="w-full max-w-md">
          <div className="flex justify-center mb-8">
            <Link href="/" className="flex items-center">
              <Image
                src="/logo-black-2.png"
                alt="Vibook"
                width={120}
                height={40}
                className="h-10 w-auto object-contain"
                priority
                unoptimized
              />
            </Link>
          </div>
          <Card className="w-full border-slate-200/80 bg-white shadow-xl shadow-slate-200/40">
            <CardHeader className="text-center space-y-2 pb-2">
              <div className="mx-auto mb-2 h-16 w-16 rounded-full bg-blue-50 flex items-center justify-center">
                <Mail className="h-8 w-8 text-blue-600" />
              </div>
              <CardTitle className="text-2xl font-semibold text-slate-900">Verificá tu email</CardTitle>
              <CardDescription className="text-slate-500">
                {email ? (
                  <>
                    Enviamos un enlace a{" "}
                    <span className="font-semibold text-slate-800">{email}</span>
                  </>
                ) : (
                  "Enviamos un enlace de verificación a tu email"
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
              <p className="text-sm text-slate-500 text-center">
                Hacé clic en el enlace para verificar tu cuenta y comenzar a usar Vibook Gestión.
              </p>

              {success && (
                <Alert className="border-emerald-200 bg-emerald-50 text-emerald-700">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <AlertDescription className="text-emerald-700">
                    Email reenviado. Revisá tu bandeja de entrada.
                  </AlertDescription>
                </Alert>
              )}

              {error && (
                <Alert className="border-red-200 bg-red-50 text-red-700">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="bg-slate-50 border border-slate-200/70 p-4 rounded-lg text-sm space-y-2 text-slate-600">
                <p className="font-medium text-slate-900">¿No recibiste el email?</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Revisá la carpeta de spam o correo no deseado</li>
                  <li>Verificá que el email sea correcto</li>
                  <li>Esperá unos minutos e intentá de nuevo</li>
                  <li>El enlace expira en 24 horas</li>
                </ul>
              </div>

              {email && (
                <Button
                  onClick={handleResendEmail}
                  disabled={loading || success}
                  className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-200/60 bg-none"
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
                <Button variant="ghost" className="w-full text-slate-600 hover:text-slate-900">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Volver al Login
                </Button>
              </Link>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="grid min-h-svh lg:grid-cols-2">
        <div className="bg-[#0b1220] relative hidden lg:flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-1/4 left-1/4 w-[520px] h-[520px] bg-sky-500/20 rounded-full blur-[130px] animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-[420px] h-[420px] bg-blue-500/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: "1s" }} />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[640px] h-[640px] bg-cyan-400/10 rounded-full blur-[160px]" />
          </div>
          <div
            className="absolute inset-0 opacity-[0.15]"
            style={{
              backgroundImage: `linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
                               linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)`,
              backgroundSize: "60px 60px",
            }}
          />
          <div className="relative z-10 px-8 text-white">
            <h2 className="text-4xl font-bold mb-4 leading-tight">
              Verificá tu cuenta<br />
              para <span className="bg-gradient-to-r from-sky-400 via-blue-400 to-cyan-300 bg-clip-text text-transparent">Vibook</span>
            </h2>
            <p className="text-slate-300 text-lg">Estamos preparando tu acceso</p>
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center p-6 md:p-10 bg-white">
          <div className="w-full max-w-md">
            <div className="flex justify-center mb-8">
              <Link href="/" className="flex items-center">
                <Image
                  src="/logo-black-2.png"
                  alt="Vibook"
                  width={120}
                  height={40}
                  className="h-10 w-auto object-contain"
                  priority
                  unoptimized
                />
              </Link>
            </div>
            <Card className="w-full border-slate-200/80 bg-white shadow-xl shadow-slate-200/40">
              <CardHeader className="text-center space-y-2 pb-2">
                <div className="mx-auto mb-2 h-16 w-16 rounded-full bg-blue-50 flex items-center justify-center">
                  <Mail className="h-8 w-8 text-blue-600" />
                </div>
                <CardTitle className="text-2xl font-semibold text-slate-900">Verificá tu email</CardTitle>
                <CardDescription className="text-slate-500">Cargando...</CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  )
}
