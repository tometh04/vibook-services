"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Loader2, CheckCircle2, XCircle, Link2, Unlink, ShieldCheck, Eye, EyeOff } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface AfipConfig {
  id: string
  cuit: string
  punto_venta: number
  automation_status: string
  is_active: boolean
  cert_automation_id?: string
  wsfe_automation_id?: string
}

export function AfipSettings() {
  const [config, setConfig] = useState<AfipConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // Form state
  const [cuit, setCuit] = useState("")
  const [puntoVenta, setPuntoVenta] = useState("1")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")

  // Polling state
  const [polling, setPolling] = useState(false)
  const [pollMessage, setPollMessage] = useState("")
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    fetchConfig()
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
    }
  }, [])

  async function fetchConfig() {
    try {
      const res = await fetch("/api/afip/config")
      const data = await res.json()
      if (data.config) {
        setConfig(data.config)
        setCuit(data.config.cuit || "")
        setPuntoVenta(String(data.config.punto_venta || "1"))
        // Si está en running, empezar polling
        if (data.config.automation_status === "running") {
          startPolling()
        }
      }
    } catch (error) {
      console.error("Error fetching AFIP config:", error)
    } finally {
      setLoading(false)
    }
  }

  const startPolling = useCallback(() => {
    setPolling(true)
    setPollMessage("Configurando certificado AFIP...")

    // Limpiar interval anterior si existe
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)

    let attempts = 0
    const maxAttempts = 30 // 30 * 5s = 150s máximo

    pollIntervalRef.current = setInterval(async () => {
      attempts++

      if (attempts > maxAttempts) {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
        setPolling(false)
        setPollMessage("")
        toast.error("La configuración tardó demasiado. Intentá de nuevo.")
        return
      }

      try {
        const res = await fetch("/api/afip/automation-status")
        const data = await res.json()

        // Actualizar mensaje de progreso
        if (data.cert_status && data.wsfe_status) {
          const certLabel = data.cert_status === "complete" ? "✓" : "..."
          const wsfeLabel = data.wsfe_status === "complete" ? "✓" : "..."
          setPollMessage(`Certificado: ${certLabel}  |  Autorización WSFE: ${wsfeLabel}`)
        }

        if (data.status === "complete") {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
          setPolling(false)
          setPollMessage("")
          setConfig(data.config)
          toast.success("¡AFIP configurado correctamente!")
        } else if (data.status === "failed") {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
          setPolling(false)
          setPollMessage("")
          setConfig(data.config)
          toast.error(data.error || "Error en la configuración automática de AFIP")
        }
        // Si "running", sigue el polling
      } catch (err) {
        console.error("Error polling automation status:", err)
      }
    }, 5000)
  }, [])

  async function handleConnect() {
    if (!cuit || !puntoVenta) {
      toast.error("Completá CUIT y punto de venta")
      return
    }

    if (cuit.length !== 11 || isNaN(Number(cuit))) {
      toast.error("El CUIT debe tener 11 dígitos numéricos")
      return
    }

    if (!username || !password) {
      toast.error("Ingresá tu usuario y contraseña de ARCA (clave fiscal)")
      return
    }

    setSaving(true)
    try {
      const res = await fetch("/api/afip/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cuit,
          punto_venta: Number(puntoVenta),
          username,
          password,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || "Error al conectar con AFIP")
        return
      }

      if (data.config) {
        setConfig(data.config)
      }

      if (data.mode === "setup") {
        // Modo async: empezar polling
        toast.info("Configurando certificado AFIP. Esto puede tardar hasta 2 minutos...")
        startPolling()
        // Limpiar credenciales del form (no se guardan)
        setUsername("")
        setPassword("")
      } else if (data.mode === "quick") {
        // Modo rápido
        if (data.connection_test?.connected) {
          toast.success(`Conectado a AFIP. Último comprobante: ${data.connection_test.lastVoucher ?? 0}`)
        } else {
          toast.error(
            data.connection_test?.error ||
            "No se pudo conectar con AFIP. Verificá que el certificado esté creado y el punto de venta habilitado."
          )
        }
      }
    } catch (error: any) {
      toast.error(error?.message || "Error al conectar con AFIP")
    } finally {
      setSaving(false)
    }
  }

  async function handleDisconnect() {
    setDisconnecting(true)
    try {
      const res = await fetch("/api/afip/config", { method: "DELETE" })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || "Error al desconectar")
        return
      }

      setConfig(null)
      setCuit("")
      setPuntoVenta("1")
      setUsername("")
      setPassword("")
      toast.success("AFIP desconectado")
    } catch (error: any) {
      toast.error(error?.message || "Error al desconectar")
    } finally {
      setDisconnecting(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  const isConnected = config?.automation_status === "complete" && config?.is_active
  const isRunning = config?.automation_status === "running" || polling

  return (
    <div className="space-y-4">
      {/* Estado de conexión */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Estado de Conexión</CardTitle>
              <CardDescription>
                Conexión con AFIP para facturación electrónica
              </CardDescription>
            </div>
            {isRunning ? (
              <Badge variant="outline" className="gap-1">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Configurando...
              </Badge>
            ) : isConnected ? (
              <Badge variant="success-soft" className="gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Conectado
              </Badge>
            ) : (
              <Badge variant="destructive-soft" className="gap-1">
                <XCircle className="h-3.5 w-3.5" />
                No conectado
              </Badge>
            )}
          </div>
        </CardHeader>
        {isRunning && (
          <CardContent>
            <Alert>
              <Loader2 className="h-4 w-4 animate-spin" />
              <AlertDescription>
                {pollMessage || "Configurando certificado AFIP. Esto puede tardar hasta 2 minutos, no cierres esta página..."}
              </AlertDescription>
            </Alert>
          </CardContent>
        )}
        {isConnected && config && (
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">CUIT:</span>{" "}
                  <span className="font-medium">{config.cuit}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Punto de Venta:</span>{" "}
                  <span className="font-medium">{config.punto_venta}</span>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="text-destructive hover:text-destructive"
              >
                {disconnecting ? (
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Unlink className="mr-2 h-3.5 w-3.5" />
                )}
                Desconectar
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Formulario de conexión */}
      {!isRunning && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {isConnected ? "Reconectar AFIP" : "Conectar con AFIP"}
            </CardTitle>
            <CardDescription>
              Ingresá tu CUIT, credenciales de ARCA (clave fiscal) y punto de venta.
              Se creará automáticamente el certificado de producción.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cuit">CUIT</Label>
                <Input
                  id="cuit"
                  placeholder="20123456789"
                  value={cuit}
                  onChange={(e) => setCuit(e.target.value.replace(/\D/g, "").slice(0, 11))}
                  maxLength={11}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="punto_venta">Punto de Venta</Label>
                <Input
                  id="punto_venta"
                  type="number"
                  min={1}
                  placeholder="1"
                  value={puntoVenta}
                  onChange={(e) => setPuntoVenta(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="username">Usuario ARCA (Clave Fiscal)</Label>
                <Input
                  id="username"
                  placeholder="Tu CUIT o usuario de ARCA"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="off"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña ARCA</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Tu contraseña de clave fiscal"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="off"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>
            </div>

            <Alert>
              <ShieldCheck className="h-4 w-4" />
              <AlertDescription className="text-xs text-muted-foreground">
                Tus credenciales de ARCA se usan solo para crear el certificado digital y NO se guardan en nuestra base de datos.
              </AlertDescription>
            </Alert>

            <Button onClick={handleConnect} disabled={saving || isRunning} className="w-full sm:w-auto">
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Conectando...
                </>
              ) : (
                <>
                  <Link2 className="mr-2 h-4 w-4" />
                  {isConnected ? "Reconectar" : "Conectar con AFIP"}
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
