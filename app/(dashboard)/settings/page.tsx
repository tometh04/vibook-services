import { getCurrentUser, getUserAgencies } from "@/lib/auth"
import { createServerClient } from "@/lib/supabase/server"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { UsersSettings } from "@/components/settings/users-settings"
import { AgenciesSettings } from "@/components/settings/agencies-settings"
import { BrandingSettings } from "@/components/settings/branding-settings"
import { SeedMockData } from "@/components/settings/seed-mock-data"
import { MigrateHistoricalAccounting } from "@/components/settings/migrate-historical-accounting"
import { ImportSettings } from "@/components/settings/import-settings"
import { AfipSettings } from "@/components/settings/afip-settings"

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const { user } = await getCurrentUser()
  const supabase = await createServerClient()
  const adminToolsEnabled = process.env.ADMIN_TOOLS_ENABLED === "true"
  
  // Cargar agencias disponibles
  let agencies: Array<{ id: string; name: string }> = []
  
  if (user.role === "SUPER_ADMIN") {
    // SUPER_ADMIN (admin@vibook.ai) ve TODAS las agencias (administrador del sistema)
    const { data } = await supabase.from("agencies").select("id, name").order("name")
    agencies = (data || []) as Array<{ id: string; name: string }>
  } else {
    // ADMIN y otros roles solo ven sus agencias (SaaS multi-tenant)
    const userAgencies = await getUserAgencies(user.id)
    agencies = userAgencies
      .filter((ua) => ua.agencies)
      .map((ua) => ({
        id: ua.agency_id,
        name: ua.agencies!.name,
      }))
  }
  
  const firstAgencyId = agencies[0]?.id || null

  if (user.role !== "SUPER_ADMIN" && user.role !== "ADMIN") {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Configuración</h1>
          <p className="text-muted-foreground">No tienes permisos para acceder a esta sección</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Configuración</h1>
        <p className="text-muted-foreground">Gestiona la configuración del sistema</p>
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="users">Usuarios</TabsTrigger>
          <TabsTrigger value="agencies">Agencias</TabsTrigger>
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="import">Importar</TabsTrigger>
          <TabsTrigger value="afip">AFIP</TabsTrigger>
          {user.role === "SUPER_ADMIN" && adminToolsEnabled && <TabsTrigger value="seed">Seed Data</TabsTrigger>}
        </TabsList>
        <TabsContent value="users">
          <UsersSettings />
        </TabsContent>
        <TabsContent value="agencies">
          <AgenciesSettings />
        </TabsContent>
        <TabsContent value="branding">
          <BrandingSettings agencies={agencies} defaultAgencyId={firstAgencyId} />
        </TabsContent>
        <TabsContent value="import">
          <ImportSettings />
        </TabsContent>
        <TabsContent value="afip">
          <AfipSettings agencies={agencies} defaultAgencyId={firstAgencyId} />
        </TabsContent>
        {user.role === "SUPER_ADMIN" && adminToolsEnabled && (
          <TabsContent value="seed" className="space-y-4">
            <SeedMockData />
            <MigrateHistoricalAccounting />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
