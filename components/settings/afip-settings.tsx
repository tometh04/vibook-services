"use client"

import { useState, useEffect } from "react"
import { Loader2, CheckCircle2, XCircle, Link2, Unlink } from "lucide-react"
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

interface AfipConfig {
  id: string
  cuit: string
  punto_venta: number
  automation_status: string
  is_active: boolean
}

export function AfipSettings() {
  const [config, setConfig] = useState<AfipConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)

  // Form state
  const [cuit, setCuit] = useState("")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [puntoVenta, setPuntoVenta] = useState("1")

  useEffect(() => {
    fetchConfig()
  }, [])

  async function fetchConfig() {
    try {
      const res = await fetch("/api/afip/config")
      const data = await res.json()
      if (data.config) {
        setConfig(data.config)
        setCuit(data.config.cuit || "")
        setPuntoVenta(String(data.config.punto_venta || "1"))
      }
    } catch (error) {
      console.error("Error fetching AFIP config:", error)
    } finally {
      setLoading(false)
    }
  }

  async function handleConnect() {
    if (!cuit || !username || !password || !puntoVenta) {
      toast.error("Completá todos los campos")
      return
    }

    if (cuit.length !== 11 || isNaN(Number(cuit))) {
      toast.error("El CUIT debe tener 11 dígitos numéricos")
      return
    }

    setSaving(true)
    try {
      const res = await fetch("/api/afip/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cuit,
          username,
          password,
          punto_venta: Number(puntoVenta),
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

      if (data.connection_test?.connected) {
        toast.success("AFIP conectado correctamente")
      } else {
        toast.warning(
          `Configuración guardada, pero la prueba de conexión falló: ${data.connection_test?.error || "Error desconocido"}`
        )
      }

      // Limpiar credenciales sensibles
      setUsername("")
      setPassword("")
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
            {isConnected ? (
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
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {isConnected ? "Reconectar AFIP" : "Conectar con AFIP"}
          </CardTitle>
          <CardDescription>
            Ingresá tus datos de ARCA (ex AFIP) para habilitar la facturación electrónica.
            Las credenciales se usan solo para la configuración inicial y no se guardan.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cuit">CUIT (11 dígitos)</Label>
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
                placeholder="Tu usuario de ARCA"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña ARCA</Label>
              <Input
                id="password"
                type="password"
                placeholder="Tu contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <Button onClick={handleConnect} disabled={saving} className="w-full sm:w-auto">
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
    </div>
  )
}
