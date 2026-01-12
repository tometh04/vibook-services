import { getCurrentUser } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Settings2, Database, Key, Globe } from "lucide-react"

export default async function AdminSettingsPage() {
  const { user } = await getCurrentUser()

  if (user.role !== "SUPER_ADMIN") {
    redirect('/dashboard')
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.vibook.ai'
  const hasMercadoPagoToken = !!process.env.MERCADOPAGO_ACCESS_TOKEN
  const hasSupabaseUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Configuración del Sistema</h1>
        <p className="text-muted-foreground">Configuración general y variables de entorno</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              <CardTitle>URLs del Sistema</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <div className="text-sm font-medium">App URL</div>
              <code className="text-xs bg-muted px-2 py-1 rounded block mt-1">{appUrl}</code>
            </div>
            <div>
              <div className="text-sm font-medium">Admin URL</div>
              <code className="text-xs bg-muted px-2 py-1 rounded block mt-1">{appUrl.replace('app.', 'admin.')}</code>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              <CardTitle>Integraciones</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Mercado Pago</div>
              {hasMercadoPagoToken ? (
                <Badge className="bg-green-500">Configurado</Badge>
              ) : (
                <Badge variant="destructive">No configurado</Badge>
              )}
            </div>
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Supabase</div>
              {hasSupabaseUrl ? (
                <Badge className="bg-green-500">Configurado</Badge>
              ) : (
                <Badge variant="destructive">No configurado</Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              <CardTitle>Base de Datos</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Las migraciones se ejecutan desde Supabase Dashboard.
              Verifica el estado de las migraciones en el panel de Supabase.
            </CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              <CardTitle>Información del Sistema</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <div className="text-sm font-medium">Versión</div>
              <div className="text-sm text-muted-foreground">v1.0.0</div>
            </div>
            <div>
              <div className="text-sm font-medium">Entorno</div>
              <div className="text-sm text-muted-foreground">
                {process.env.NODE_ENV || 'production'}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
