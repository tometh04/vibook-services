"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  FileText, 
  Settings, 
  AlertCircle, 
  CheckCircle2, 
  Loader2,
  ExternalLink,
  Receipt,
  DollarSign,
  Building2,
  HelpCircle,
} from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface AfipConfig {
  id?: string
  cuit: string
  access_token: string
  environment: "sandbox" | "production"
  punto_venta: number
  is_active: boolean
}

interface InvoicingPageClientProps {
  agencies: Array<{ id: string; name: string }>
  userRole: string
  afipConfig: AfipConfig | null
}

interface PendingInvoice {
  id: string
  file_code: string
  customer_name: string
  destination: string
  sale_amount_total: number
  sale_currency: string
  departure_date: string | null
  status: string
}

export function InvoicingPageClient({ agencies, userRole, afipConfig: initialConfig }: InvoicingPageClientProps) {
  const [activeTab, setActiveTab] = useState("pending")
  const [loading, setLoading] = useState(false)
  const [pendingInvoices, setPendingInvoices] = useState<PendingInvoice[]>([])
  
  // Config state
  const [configOpen, setConfigOpen] = useState(false)
  const [config, setConfig] = useState<AfipConfig>(
    initialConfig || {
      cuit: "",
      access_token: "",
      environment: "sandbox",
      punto_venta: 1,
      is_active: false,
    }
  )
  const [savingConfig, setSavingConfig] = useState(false)

  const isConfigured = config.cuit && config.access_token && config.is_active

  // Fetch pending invoices (operations without invoice)
  const fetchPendingInvoices = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/accounting/invoicing/pending")
      if (response.ok) {
        const data = await response.json()
        setPendingInvoices(data.operations || [])
      }
    } catch (error) {
      console.error("Error fetching pending invoices:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isConfigured) {
      fetchPendingInvoices()
    }
  }, [fetchPendingInvoices, isConfigured])

  const handleSaveConfig = async () => {
    if (!config.cuit || !config.access_token) {
      toast.error("CUIT y Access Token son requeridos")
      return
    }

    setSavingConfig(true)
    try {
      const response = await fetch("/api/accounting/invoicing/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error)
      }

      toast.success("Configuración guardada correctamente")
      setConfigOpen(false)
    } catch (error: any) {
      toast.error(error.message || "Error al guardar configuración")
    } finally {
      setSavingConfig(false)
    }
  }

  const formatCurrency = (amount: number, currency: string = "ARS") => {
    if (currency === "USD") {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(amount)
    }
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-bold">Facturación Electrónica</h1>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-5 w-5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-sm">
                <p>Integración con AFIP SDK para emitir facturas electrónicas con CAE directamente desde las operaciones.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="flex items-center gap-2">
          {isConfigured ? (
            <Badge variant="default" className="bg-green-600">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Configurado
            </Badge>
          ) : (
            <Badge variant="destructive">
              <AlertCircle className="h-3 w-3 mr-1" />
              Sin configurar
            </Badge>
          )}
          <Button variant="outline" onClick={() => setConfigOpen(true)}>
            <Settings className="h-4 w-4 mr-2" />
            Configuración
          </Button>
        </div>
      </div>

      {/* Sin configurar */}
      {!isConfigured && (
        <Card className="border-yellow-500/50 bg-yellow-500/5">
          <CardContent className="py-8">
            <div className="flex flex-col items-center text-center gap-4">
              <AlertCircle className="h-12 w-12 text-yellow-600" />
              <div>
                <h3 className="text-lg font-semibold">Configuración Requerida</h3>
                <p className="text-muted-foreground mt-1">
                  Para emitir facturas electrónicas necesitás configurar tu cuenta de AFIP SDK.
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" asChild>
                  <a href="https://afipsdk.com" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Obtener Access Token
                  </a>
                </Button>
                <Button onClick={() => setConfigOpen(true)}>
                  <Settings className="h-4 w-4 mr-2" />
                  Configurar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Configurado - Mostrar contenido */}
      {isConfigured && (
        <>
          {/* KPIs */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Pendientes de Facturar
                </CardTitle>
                <Receipt className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{pendingInvoices.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  CUIT Configurado
                </CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-mono">{config.cuit}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Entorno
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <Badge variant={config.environment === "production" ? "default" : "secondary"}>
                  {config.environment === "production" ? "Producción" : "Sandbox (Pruebas)"}
                </Badge>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="pending">Pendientes de Facturar</TabsTrigger>
              <TabsTrigger value="history">Historial</TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Operaciones sin Facturar</CardTitle>
                  <CardDescription>
                    Operaciones confirmadas que aún no tienen factura emitida
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : pendingInvoices.length === 0 ? (
                    <div className="flex flex-col items-center py-8 text-muted-foreground">
                      <CheckCircle2 className="h-12 w-12 mb-4 opacity-50" />
                      <p>No hay operaciones pendientes de facturar</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Código</TableHead>
                          <TableHead>Cliente</TableHead>
                          <TableHead>Destino</TableHead>
                          <TableHead>Fecha</TableHead>
                          <TableHead className="text-right">Monto</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pendingInvoices.map((op) => (
                          <TableRow key={op.id}>
                            <TableCell className="font-mono font-medium">
                              {op.file_code}
                            </TableCell>
                            <TableCell>{op.customer_name}</TableCell>
                            <TableCell>{op.destination}</TableCell>
                            <TableCell>
                              {op.departure_date
                                ? format(new Date(op.departure_date), "dd/MM/yyyy", { locale: es })
                                : "-"}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(op.sale_amount_total, op.sale_currency)}
                            </TableCell>
                            <TableCell>
                              <Button size="sm" disabled>
                                <FileText className="h-4 w-4 mr-2" />
                                Facturar
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history">
              <Card>
                <CardHeader>
                  <CardTitle>Historial de Facturas</CardTitle>
                  <CardDescription>
                    Facturas emitidas con CAE
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mb-4 opacity-50" />
                    <p>El historial se mostrará cuando se emitan facturas</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* Dialog de Configuración */}
      <Dialog open={configOpen} onOpenChange={setConfigOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Configuración AFIP SDK</DialogTitle>
            <DialogDescription>
              Configurá tu cuenta de AFIP SDK para emitir facturas electrónicas.
              <a 
                href="https://afipsdk.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline ml-1"
              >
                Obtener credenciales →
              </a>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>CUIT</Label>
              <Input
                placeholder="20123456789"
                value={config.cuit}
                onChange={(e) => setConfig({ ...config, cuit: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Access Token (AFIP SDK)</Label>
              <Input
                type="password"
                placeholder="Tu access token de afipsdk.com"
                value={config.access_token}
                onChange={(e) => setConfig({ ...config, access_token: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Obtené tu token en{" "}
                <a href="https://afipsdk.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  afipsdk.com
                </a>
              </p>
            </div>

            <div className="space-y-2">
              <Label>Punto de Venta</Label>
              <Input
                type="number"
                placeholder="1"
                min="1"
                value={config.punto_venta}
                onChange={(e) => setConfig({ ...config, punto_venta: parseInt(e.target.value) || 1 })}
              />
            </div>

            <div className="space-y-2">
              <Label>Entorno</Label>
              <Select
                value={config.environment}
                onValueChange={(value: "sandbox" | "production") => 
                  setConfig({ ...config, environment: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sandbox">Sandbox (Pruebas)</SelectItem>
                  <SelectItem value="production">Producción</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Usá Sandbox para probar antes de ir a Producción
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={config.is_active}
                onChange={(e) => setConfig({ ...config, is_active: e.target.checked })}
                className="rounded border-gray-300"
              />
              <Label htmlFor="is_active">Activar facturación electrónica</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveConfig} disabled={savingConfig}>
              {savingConfig ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
