"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle2 } from "lucide-react"

export const dynamic = 'force-dynamic'

export default function VerifiedPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirigir a paywall después de 2 segundos
    const timer = setTimeout(() => {
      router.push("/paywall")
    }, 2000)

    return () => clearTimeout(timer)
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center">
            <CheckCircle2 className="h-8 w-8 text-green-500" />
          </div>
          <CardTitle className="text-2xl">¡Email verificado!</CardTitle>
          <CardDescription>
            Tu cuenta ha sido verificada exitosamente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800 dark:text-green-200">
              Redirigiendo para elegir tu plan y comenzar tu prueba gratuita...
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  )
}
