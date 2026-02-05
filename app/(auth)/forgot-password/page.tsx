"use client"

import { useState } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Mail, ArrowLeft, CheckCircle2 } from "lucide-react"

export const dynamic = 'force-dynamic'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })

      if (resetError) {
        console.error("Reset password error:", resetError)
        setError(resetError.message || "Error al enviar el email de recuperación")
        setLoading(false)
        return
      }

      setSuccess(true)
    } catch (err: any) {
      console.error("Error:", err)
      setError(err.message || "Error al procesar la solicitud")
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-4">
        <Card className="w-full max-w-md border-slate-200/80 bg-white shadow-xl shadow-slate-200/40">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto mb-2 h-16 w-16 rounded-full bg-emerald-50 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
            <CardTitle className="text-2xl text-slate-900">¡Email enviado!</CardTitle>
            <CardDescription className="text-slate-500">
              Revisá tu bandeja de entrada en <strong className="text-slate-800">{email}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-500 text-center">
              Te enviamos un enlace para restablecer tu contraseña.
              El enlace expira en 24 horas.
            </p>
            <div className="bg-slate-50 p-4 rounded-lg text-sm text-slate-600 border border-slate-200/60">
              <p className="font-medium mb-2 text-slate-800">¿No recibiste el email?</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Revisá la carpeta de spam</li>
                <li>Verificá que el email sea correcto</li>
                <li>Esperá unos minutos e intentá de nuevo</li>
              </ul>
            </div>
          </CardContent>
          <CardFooter>
            <Link href="/login" className="w-full">
              <Button variant="outline" className="w-full border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver al Login
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4">
      <Card className="w-full max-w-md border-slate-200/80 bg-white shadow-xl shadow-slate-200/40">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto mb-2 h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center">
            <Mail className="h-6 w-6 text-blue-600" />
          </div>
          <CardTitle className="text-2xl text-slate-900">¿Olvidaste tu contraseña?</CardTitle>
          <CardDescription className="text-slate-500">
            Ingresá tu email y te enviaremos un enlace para restablecerla
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-900">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
                autoFocus
                className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus-visible:border-blue-500 focus-visible:ring-blue-500/20 focus-visible:ring-offset-0"
              />
            </div>

            {error && (
              <Alert className="border-red-200 bg-red-50 text-red-700">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              className="w-full h-11"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                "Enviar enlace de recuperación"
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
  )
}
