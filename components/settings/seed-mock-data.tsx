"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2 } from "lucide-react"

export function SeedMockData() {
  const [loading, setLoading] = useState(false)
  const [userLoading, setUserLoading] = useState(false)
  const [userResult, setUserResult] = useState<{ success: boolean; message?: string; error?: string } | null>(null)
  const [email, setEmail] = useState("")
  const [adminToken, setAdminToken] = useState("")

  const handleUserSeed = async () => {
    if (!email.trim()) {
      setUserResult({ success: false, error: "Ingresa un email válido." })
      return
    }

    if (!confirm(`¿Querés cargar datos demo para ${email.trim()}?`)) {
      return
    }

    setUserLoading(true)
    setUserResult(null)

    try {
      const response = await fetch("/api/admin/seed-user-demo-data", {
        method: "POST",
        headers: adminToken ? { "x-admin-token": adminToken } : undefined,
        body: JSON.stringify({ email: email.trim() }),
      })

      const data = await response.json()

      if (data.success) {
        setUserResult({
          success: true,
          message: data.message || "Seed ejecutado correctamente.",
        })
      } else {
        setUserResult({
          success: false,
          error: data.error || "Error al ejecutar el seed",
        })
      }
    } catch (error: any) {
      setUserResult({
        success: false,
        error: error.message || "Error al ejecutar el seed",
      })
    } finally {
      setUserLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Datos de Ejemplo (Mock Data)</CardTitle>
        <CardDescription>
          Genera datos de ejemplo para probar la aplicación (por usuario/agencia).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border bg-muted/40 p-4 space-y-3">
          <div>
            <h3 className="font-semibold">Cargar seed para un usuario</h3>
            <p className="text-sm text-muted-foreground">
              Agrega datos demo (operaciones, pagos, caja, alertas) para una agencia específica.
            </p>
          </div>

          {userResult && (
            <Alert variant={userResult.success ? "default" : "destructive"}>
              <AlertDescription>
                {userResult.success ? userResult.message : userResult.error}
              </AlertDescription>
            </Alert>
          )}

          <div className="grid gap-2 md:grid-cols-2">
            <Input
              placeholder="Email del usuario (ej: mossottigerardo3@gmail.com)"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <Input
              placeholder="Admin token (opcional)"
              value={adminToken}
              onChange={(event) => setAdminToken(event.target.value)}
              type="password"
            />
          </div>

          <Button onClick={handleUserSeed} disabled={userLoading}>
            {userLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Ejecutando seed...
              </>
            ) : (
              "Cargar seed para este usuario"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
