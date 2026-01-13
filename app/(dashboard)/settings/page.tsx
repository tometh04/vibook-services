import { getCurrentUser, getUserAgencies } from "@/lib/auth"
import { createServerClient } from "@/lib/supabase/server"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { UsersSettings } from "@/components/settings/users-settings"
import { AgenciesSettings } from "@/components/settings/agencies-settings"
import { BrandingSettings } from "@/components/settings/branding-settings"
import { CommissionsSettings } from "@/components/settings/commissions-settings"
import { AISettings } from "@/components/settings/ai-settings"
import { SeedMockData } from "@/components/settings/seed-mock-data"
import { MigrateHistoricalAccounting } from "@/components/settings/migrate-historical-accounting"
import { ImportSettings } from "@/components/settings/import-settings"
import { DestinationRequirementsClient } from "@/components/settings/destination-requirements-client"

export default async function SettingsPage() {
  const { user } = await getCurrentUser()
  const supabase = await createServerClient()
  
  // Cargar agencias del usuario (SUPER_ADMIN solo ve SU agencia, no todas)
  // En un SaaS, cada signup crea una agencia independiente
  const userAgencies = await getUserAgencies(user.id)
  const agencies = userAgencies
    .filter((ua) => ua.agencies)
    .map((ua) => ({
      id: ua.agency_id,
      name: ua.agencies!.name,
    }))
  
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
          <TabsTrigger value="commissions">Comisiones</TabsTrigger>
          <TabsTrigger value="ai">AI</TabsTrigger>
          <TabsTrigger value="requirements">Requisitos</TabsTrigger>
          <TabsTrigger value="import">Importar</TabsTrigger>
          {user.role === "SUPER_ADMIN" && <TabsTrigger value="seed">Seed Data</TabsTrigger>}
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
        <TabsContent value="commissions">
          <CommissionsSettings />
        </TabsContent>
        <TabsContent value="ai">
          <AISettings />
        </TabsContent>
        <TabsContent value="requirements">
          <DestinationRequirementsClient />
        </TabsContent>
        <TabsContent value="import">
          <ImportSettings />
        </TabsContent>
        {user.role === "SUPER_ADMIN" && (
          <TabsContent value="seed" className="space-y-4">
            <SeedMockData />
            <MigrateHistoricalAccounting />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}

