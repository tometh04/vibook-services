import { getCurrentUser } from "@/lib/auth"
import { canAccessModule } from "@/lib/permissions"
import { LeadsStatisticsPageClient } from "@/components/sales/leads-statistics-page-client"

export const dynamic = 'force-dynamic'

export default async function SalesStatisticsPage() {
  const { user } = await getCurrentUser()
  
  if (!canAccessModule(user.role as any, "leads")) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Estadísticas de Leads</h1>
          <p className="text-muted-foreground">No tiene permiso para acceder a esta sección</p>
        </div>
      </div>
    )
  }

  return <LeadsStatisticsPageClient />
}

