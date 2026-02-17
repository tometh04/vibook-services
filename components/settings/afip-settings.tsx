"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Loader2, CheckCircle2, XCircle, Link2, Unlink, ShieldCheck, Eye, EyeOff, AlertTriangle, RefreshCw, ExternalLink } from "lucide-react"
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
  has_cert?: boolean
}

export function AfipSettings() {
  const [config, setConfig] = useState<AfipConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // Form state
  const [cuit, setCuit] = useState("")
  const [password, setPassword] = useState("")

  // Polling state
  const [polling, setPolling] = useState(false)
  const [pollMessage, setPollMessage] = useState("")
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Punto de venta state
  const [needsSalesPoint, setNeedsSalesPoint] = useState(false)
  const [checkingSalesPoints, setCheckingSalesPoints] = useState(false)

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
        // Si está en running, empezar polling
        if (data.config.automation_status === "running") {
          startPolling()
        }
        // Si está complete y tiene cert, verificar punto de venta
        if (data.config.automation_status === "complete" && data.config.has_cert && !data.config.punto_venta) {
          checkSalesPoints()
        }
      }
    } catch (error) {
      console.error("Error fetching AFIP config:", error)
    } finally {
      setLoading(false)
    }
  }

  async function checkSalesPoints() {
    setCheckingSalesPoints(true)
    try {
      const res = await fetch("/api/afip/sales-points")
      const data = await res.json()

      if (data.salesPoints && data.salesPoints.length > 0) {
        // Hay puntos de venta para WebServices — usar el primero activo
        const activePto = data.salesPoints.find((sp: any) => sp.Bloqueado === "N") || data.salesPoints[0]
        const ptoVtaNum = activePto.Nro

        // Guardar en DB
        await fetch("/api/afip/config/update-pto-vta", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ punto_venta: ptoVtaNum }),
        })

        setConfig(prev => prev ? { ...prev, punto_venta: ptoVtaNum } : prev)
        setNeedsSalesPoint(false)
        toast.success(`Punto de venta ${ptoVtaNum} configurado automáticamente`)
      } else {
        // No hay puntos de venta para WebServices
        setNeedsSalesPoint(true)
      }
    } catch (error: any) {
      console.error("Error checking sales points:", error)
      setNeedsSalesPoint(true)
    } finally {
      setCheckingSalesPoints(false)
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

        // Actualizar mensaje de progreso según el paso actual
        if (data.message) {
          setPollMessage(data.message)
        } else if (data.cert_status && data.wsfe_status) {
          const certLabel = data.cert_status === "complete" ? "✓" : "..."
          const wsfeLabel = data.wsfe_status === "complete" ? "✓" : "..."
          setPollMessage(`Certificado: ${certLabel}  |  Autorización WSFE: ${wsfeLabel}`)
        }

        if (data.status === "complete") {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
          setPolling(false)
          setPollMessage("")
          setConfig(data.config)
          toast.success("¡Certificado AFIP configurado correctamente!")

          // Ahora buscar puntos de venta automáticamente
          setPollMessage("Buscando puntos de venta habilitados...")
          setTimeout(() => checkSalesPoints(), 1500)
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
    if (!cuit) {
      toast.error("Completá el CUIT")
      return
    }

    if (cuit.length !== 11 || isNaN(Number(cuit))) {
      toast.error("El CUIT debe tener 11 dígitos numéricos")
      return
    }

    if (!password) {
      toast.error("Ingresá tu contraseña de clave fiscal de ARCA")
      return
    }

    setSaving(true)
    try {
      const res = await fetch("/api/afip/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cuit,
          punto_venta: 1, // temporal, se actualiza al detectar puntos de venta
          username: cuit, // En ARCA el usuario es el CUIT
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
        // Limpiar contraseña del form (no se guarda)
        setPassword("")
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
      setPassword("")
      setNeedsSalesPoint(false)
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
  const isFullyReady = isConnected && config?.punto_venta && config.punto_venta > 0 && !needsSalesPoint
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
            ) : isFullyReady ? (
              <Badge variant="success-soft" className="gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Conectado
              </Badge>
            ) : isConnected && needsSalesPoint ? (
              <Badge variant="outline" className="gap-1 border-yellow-500 text-yellow-600">
                <AlertTriangle className="h-3.5 w-3.5" />
                Falta punto de venta
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
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">CUIT:</span>{" "}
                  <span className="font-medium">{config.cuit}</span>
                </div>
                {config.punto_venta && !needsSalesPoint && (
                  <div>
                    <span className="text-muted-foreground">Punto de Venta:</span>{" "}
                    <span className="font-medium">{config.punto_venta}</span>
                  </div>
                )}
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

            {/* Alerta de punto de venta faltante */}
            {needsSalesPoint && (
              <Alert className="border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="space-y-3">
                  <p className="font-medium text-yellow-800 dark:text-yellow-200">
                    No se encontró un punto de venta habilitado para Web Services
                  </p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    El certificado AFIP está creado correctamente, pero necesitás un punto de venta
                    habilitado para <strong>Factura Electrónica - Web Service</strong> en ARCA.
                  </p>
                  <div className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                    <p className="font-medium">Pasos para crearlo:</p>
                    <ol className="list-decimal list-inside space-y-1 ml-1">
                      <li>Entrá a ARCA con tu CUIT/clave fiscal</li>
                      <li>Buscá <strong>"Administración de Puntos de Venta y Domicilios"</strong></li>
                      <li>Click en <strong>"A/B/M de puntos de venta"</strong> → <strong>"Agregar"</strong></li>
                      <li>Seleccioná: <strong>"Factura Electrónica - Monotributo - Web Service"</strong></li>
                      <li>Confirmá con <strong>"Aceptar"</strong></li>
                    </ol>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => checkSalesPoints()}
                      disabled={checkingSalesPoints}
                      className="border-yellow-500/50 hover:bg-yellow-100 dark:hover:bg-yellow-950/40"
                    >
                      {checkingSalesPoints ? (
                        <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="mr-2 h-3.5 w-3.5" />
                      )}
                      Verificar de nuevo
                    </Button>
                    <a
                      href="https://auth.afip.gob.ar/contribuyente_/login.xhtml"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button size="sm" variant="outline" className="border-yellow-500/50">
                        <ExternalLink className="mr-2 h-3.5 w-3.5" />
                        Ir a ARCA
                      </Button>
                    </a>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        )}
      </Card>

      {/* Formulario de conexión */}
      {!isRunning && !isConnected && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Conectar con AFIP</CardTitle>
            <CardDescription>
              Ingresá tu CUIT y contraseña de clave fiscal.
              Se crearán automáticamente el certificado y la autorización de facturación.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
              <Label htmlFor="password">Contraseña Clave Fiscal (ARCA)</Label>
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
                  Conectar con AFIP
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
