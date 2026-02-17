import { getCurrentUser, getUserAgencies } from "@/lib/auth"
import { createServerClient } from "@/lib/supabase/server"
import { SettingsPageClient } from "@/components/settings/settings-page-client"

export const dynamic = 'force-dynamic'

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { user } = await getCurrentUser()
  const supabase = await createServerClient()
  const params = await searchParams
  const defaultTab = params.tab || "users"

  // Cargar agencias disponibles
  let agencies: Array<{ id: string; name: string }> = []

  if (user.role === "SUPER_ADMIN") {
    const { data } = await supabase.from("agencies").select("id, name").order("name")
    agencies = (data || []) as Array<{ id: string; name: string }>
  } else {
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
    <SettingsPageClient
      userRole={user.role}
      agencies={agencies}
      firstAgencyId={firstAgencyId}
      defaultTab={defaultTab}
    />
  )
}
