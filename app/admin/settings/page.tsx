import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Settings2, Database, Key, Globe } from "lucide-react"

export default async function AdminSettingsPage() {
  // El middleware ya verifica la autenticación del admin con JWT
  // No necesitamos verificar Supabase auth aquí

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.vibook.ai'
  const hasMercadoPagoToken = !!process.env.MERCADOPAGO_ACCESS_TOKEN
  const hasSupabaseUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            Configuracion
          </div>
          <h1 className="mt-3 text-3xl font-semibold text-foreground">Configuracion del sistema</h1>
          <p className="mt-1 text-muted-foreground">
            Variables clave y estado de integraciones.
          </p>
        </div>
        <Badge className="border border-border bg-muted/60 text-muted-foreground">
          Entorno {process.env.NODE_ENV || "production"}
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card className="border-border/60 bg-card/80">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              <CardTitle>URLs del sistema</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="text-sm font-medium">App URL</div>
              <code className="mt-1 block rounded bg-muted px-2 py-1 text-xs">{appUrl}</code>
            </div>
            <div>
              <div className="text-sm font-medium">Admin URL</div>
              <code className="mt-1 block rounded bg-muted px-2 py-1 text-xs">{appUrl.replace('app.', 'admin.')}</code>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/80">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Key className="h-5 w-5 text-primary" />
              <CardTitle>Integraciones</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Mercado Pago</div>
              {hasMercadoPagoToken ? (
                <Badge className="border border-emerald-500/30 bg-emerald-500/15 text-emerald-600 dark:text-emerald-300">
                  Configurado
                </Badge>
              ) : (
                <Badge className="border border-rose-500/30 bg-rose-500/15 text-rose-600 dark:text-rose-300">
                  No configurado
                </Badge>
              )}
            </div>
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Supabase</div>
              {hasSupabaseUrl ? (
                <Badge className="border border-emerald-500/30 bg-emerald-500/15 text-emerald-600 dark:text-emerald-300">
                  Configurado
                </Badge>
              ) : (
                <Badge className="border border-rose-500/30 bg-rose-500/15 text-rose-600 dark:text-rose-300">
                  No configurado
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/80">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              <CardTitle>Base de datos</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Las migraciones se ejecutan desde Supabase Dashboard.
              Verifica el estado de las migraciones en el panel de Supabase.
            </CardDescription>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/80">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-primary" />
              <CardTitle>Informacion del sistema</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <div className="text-sm font-medium">Version</div>
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
