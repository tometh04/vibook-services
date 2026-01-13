"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createBrowserClient } from "@supabase/ssr"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, CheckCircle2, AlertCircle, Eye, EyeOff } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

function AcceptInviteContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [userName, setUserName] = useState<string | null>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    const checkSession = async () => {
      try {
        // Verificar si hay un token en la URL (Supabase lo pasa como hash)
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const accessToken = hashParams.get("access_token")
        const refreshToken = hashParams.get("refresh_token")
        const type = hashParams.get("type")

        // También verificar searchParams
        const code = searchParams.get("code")
        const tokenHash = searchParams.get("token_hash")

        console.log("[AcceptInvite] Checking session...", { 
          hasAccessToken: !!accessToken, 
          type, 
          code: !!code,
          tokenHash: !!tokenHash 
        })

        // Si hay access_token en el hash, establecer la sesión
        if (accessToken && refreshToken) {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })

          if (error) {
            console.error("[AcceptInvite] Error setting session:", error)
            setError("El enlace de invitación es inválido o ha expirado.")
            setLoading(false)
            return
          }

          if (data.user) {
            setUserEmail(data.user.email || null)
            setUserName(data.user.user_metadata?.name || null)
            setLoading(false)
            return
          }
        }

        // Si hay un code (PKCE flow), intercambiarlo por sesión
        if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code)
          
          if (error) {
            console.error("[AcceptInvite] Error exchanging code:", error)
            setError("El enlace de invitación es inválido o ha expirado.")
            setLoading(false)
            return
          }

          if (data.user) {
            setUserEmail(data.user.email || null)
            setUserName(data.user.user_metadata?.name || null)
            setLoading(false)
            return
          }
        }

        // Verificar si ya hay una sesión activa
        const { data: { user } } = await supabase.auth.getUser()
        
        if (user) {
          setUserEmail(user.email || null)
          setUserName(user.user_metadata?.name || null)
          setLoading(false)
          return
        }

        // No hay sesión válida
        setError("Enlace de invitación inválido o expirado. Solicita una nueva invitación al administrador.")
        setLoading(false)
      } catch (err) {
        console.error("[AcceptInvite] Error:", err)
        setError("Error al procesar la invitación.")
        setLoading(false)
      }
    }

    checkSession()
  }, [searchParams, supabase.auth])

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validaciones
    if (password.length < 8) {
      toast.error("La contraseña debe tener al menos 8 caracteres")
      return
    }

    if (password !== confirmPassword) {
      toast.error("Las contraseñas no coinciden")
      return
    }

    const hasUpperCase = /[A-Z]/.test(password)
    const hasLowerCase = /[a-z]/.test(password)
    const hasNumbers = /\d/.test(password)

    if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
      toast.error("La contraseña debe contener mayúsculas, minúsculas y números")
      return
    }

    setSubmitting(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      })

      if (error) {
        console.error("[AcceptInvite] Error updating password:", error)
        toast.error(error.message || "Error al establecer la contraseña")
        setSubmitting(false)
        return
      }

      setSuccess(true)
      toast.success("¡Contraseña establecida correctamente!")
      
      // Redirigir al dashboard después de 2 segundos
      setTimeout(() => {
        router.push("/dashboard")
      }, 2000)
    } catch (err: any) {
      console.error("[AcceptInvite] Error:", err)
      toast.error(err.message || "Error al establecer la contraseña")
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 flex flex-col items-center justify-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Verificando invitación...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-500 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Error de Invitación
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600">{error}</p>
            </div>
            <Button asChild className="w-full">
              <Link href="/login">Ir al Login</Link>
            </Button>
            <p className="text-sm text-center text-muted-foreground">
              Si el problema persiste, contacta al administrador del sistema.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-green-500 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              ¡Cuenta Activada!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Tu cuenta ha sido configurada correctamente. Serás redirigido al dashboard en unos segundos...
            </p>
            <div className="flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Configurar tu Cuenta</CardTitle>
          <CardDescription>
            {userName ? `Bienvenido, ${userName}!` : "Bienvenido!"} Establece tu contraseña para acceder al sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSetPassword} className="space-y-4">
            {userEmail && (
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={userEmail} disabled className="bg-muted" />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="password">Nueva Contraseña</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  className="pr-10"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <p className={password.length >= 8 ? "text-green-500" : ""}>
                  • Mínimo 8 caracteres
                </p>
                <p className={/[A-Z]/.test(password) ? "text-green-500" : ""}>
                  • Al menos una mayúscula
                </p>
                <p className={/[a-z]/.test(password) ? "text-green-500" : ""}>
                  • Al menos una minúscula
                </p>
                <p className={/\d/.test(password) ? "text-green-500" : ""}>
                  • Al menos un número
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
              <Input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repite la contraseña"
                required
              />
              {confirmPassword && password !== confirmPassword && (
                <p className="text-xs text-red-500">Las contraseñas no coinciden</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Configurando...
                </>
              ) : (
                "Activar mi Cuenta"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6 flex flex-col items-center justify-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Cargando...</p>
        </CardContent>
      </Card>
    </div>
  )
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <AcceptInviteContent />
    </Suspense>
  )
}
