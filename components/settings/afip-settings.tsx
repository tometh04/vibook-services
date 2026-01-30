"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, XCircle, Loader2, Shield } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface AfipSettingsProps {
  agencies: Array<{ id: string; name: string }>
  defaultAgencyId: string | null
}

interface AfipStatus {
  configured: boolean
  config?: {
    cuit: string
    environment: string
    punto_venta: number
    automation_status: string
    created_at: string
  }
}

export function AfipSettings({ agencies, defaultAgencyId }: AfipSettingsProps) {
  const [selectedAgencyId, setSelectedAgencyId] = useState(defaultAgencyId || "")
  const [cuit, setCuit] = useState("")
  const [password, setPassword] = useState("")
  const [puntoVenta, setPuntoVenta] = useState("1")
  const [loading, setLoading] = useState(false)
  const [checkingStatus, setCheckingStatus] = useState(false)
  const [status, setStatus] = useState<AfipStatus | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    if (selectedAgencyId) {
      checkStatus(selectedAgencyId)
    }
  }, [selectedAgencyId])

  async function checkStatus(agencyId: string) {
    setCheckingStatus(true)
    try {
      const res = await fetch(`/api/settings/afip/status?agencyId=${agencyId}`)
      const data = await res.json()
      setStatus(data)
    } catch {
      setStatus(null)
    } finally {
      setCheckingStatus(false)
    }
  }

  async function handleSetup() {
    if (!selectedAgencyId || !cuit || !password) {
      toast({ title: "Error", description: "Complete todos los campos", variant: "destructive" })
      return
    }

    const cuitClean = cuit.replace(/\D/g, '')
    if (cuitClean.length !== 11) {
      toast({ title: "Error", description: "El CUIT debe tener 11 dígitos", variant: "destructive" })
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/settings/afip/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agency_id: selectedAgencyId,
          cuit: cuitClean,
          password,
          punto_venta: parseInt(puntoVenta, 10),
        }),
      })

      const data = await res.json()

      if (data.success) {
        toast({ title: "AFIP configurado", description: "La agencia ya puede emitir facturas electrónicas" })
        setPassword("")
        setCuit("")
        checkStatus(selectedAgencyId)
      } else {
        toast({ title: "Error", description: data.error || "Error al configurar AFIP", variant: "destructive" })
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Error de conexión", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Facturación AFIP</h2>

      {agencies.length > 1 && (
        <div className="space-y-2">
          <Label>Agencia</Label>
          <Select value={selectedAgencyId} onValueChange={setSelectedAgencyId}>
            <SelectTrigger className="w-[300px]">
              <SelectValue placeholder="Seleccionar agencia" />
            </SelectTrigger>
            <SelectContent>
              {agencies.map((a) => (
                <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {checkingStatus && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Verificando estado...
        </div>
      )}

      {status?.configured && status.config && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              AFIP Configurado
            </CardTitle>
            <CardDescription>Esta agencia tiene facturación electrónica habilitada</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">CUIT:</span>
                <span className="ml-2 font-mono">{status.config.cuit}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Punto de Venta:</span>
                <span className="ml-2">{status.config.punto_venta}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Entorno:</span>
                <Badge variant={status.config.environment === 'production' ? 'default' : 'secondary'} className="ml-2">
                  {status.config.environment === 'production' ? 'Producción' : 'Sandbox'}
                </Badge>
              </div>
              <div>
                <span className="text-muted-foreground">Estado:</span>
                <Badge variant="default" className="ml-2 bg-green-500">Activo</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {status && !status.configured && !checkingStatus && (
        <Alert>
          <XCircle className="h-4 w-4" />
          <AlertDescription>
            Esta agencia no tiene AFIP configurado. Complete el formulario para habilitar la facturación electrónica.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {status?.configured ? "Reconfigurar AFIP" : "Configurar AFIP"}
          </CardTitle>
          <CardDescription>
            Ingrese las credenciales de ARCA (ex-AFIP) para habilitar la facturación electrónica.
            La contraseña solo se usa para la vinculación y no se almacena.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="cuit">CUIT</Label>
              <Input
                id="cuit"
                placeholder="20-12345678-9"
                value={cuit}
                onChange={(e) => setCuit(e.target.value)}
                disabled={loading}
                maxLength={13}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña ARCA</Label>
              <Input
                id="password"
                type="password"
                placeholder="Contraseña de ARCA"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="puntoVenta">Punto de Venta</Label>
              <Input
                id="puntoVenta"
                type="number"
                min={1}
                max={99999}
                value={puntoVenta}
                onChange={(e) => setPuntoVenta(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <Button onClick={handleSetup} disabled={loading || !selectedAgencyId || !cuit || !password}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loading ? "Configurando..." : "Vincular con AFIP"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
