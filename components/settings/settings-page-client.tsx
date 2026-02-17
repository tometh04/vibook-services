"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { UsersSettings } from "@/components/settings/users-settings"
import { AgenciesSettings } from "@/components/settings/agencies-settings"
import { BrandingSettings } from "@/components/settings/branding-settings"
import { SeedMockData } from "@/components/settings/seed-mock-data"
import { MigrateHistoricalAccounting } from "@/components/settings/migrate-historical-accounting"
import { ImportSettings } from "@/components/settings/import-settings"

interface SettingsPageClientProps {
  userRole: string
  agencies: Array<{ id: string; name: string }>
  firstAgencyId: string | null
  defaultTab: string
}

export function SettingsPageClient({ userRole, agencies, firstAgencyId, defaultTab }: SettingsPageClientProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Configuración</h1>
        <p className="text-muted-foreground">Gestiona la configuración del sistema</p>
      </div>

      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="users">Usuarios</TabsTrigger>
          <TabsTrigger value="agencies">Agencias</TabsTrigger>
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="import">Importar</TabsTrigger>
          {userRole === "SUPER_ADMIN" && <TabsTrigger value="seed">Seed Data</TabsTrigger>}
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
        {userRole === "SUPER_ADMIN" && (
          <TabsContent value="seed" className="space-y-4">
            <SeedMockData />
            <MigrateHistoricalAccounting />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
