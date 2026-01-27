import { getCurrentUser } from "@/lib/auth"
import { canAccessModule } from "@/lib/permissions"
import { SalesStatisticsPageClient } from "@/components/sales/sales-statistics-page-client"

export const dynamic = 'force-dynamic'

export default async function SalesStatisticsPage() {
  const { user } = await getCurrentUser()
  
  // Usar "leads" ya que es el módulo que contiene las estadísticas de ventas/leads
  if (!canAccessModule(user.role as any, "leads")) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Estadísticas de Ventas</h1>
          <p className="text-muted-foreground">No tiene permiso para acceder a esta sección</p>
        </div>
      </div>
    )
  }

  return <SalesStatisticsPageClient />
}

