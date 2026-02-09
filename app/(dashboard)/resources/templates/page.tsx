import { getCurrentUser } from "@/lib/auth"
import { TemplatesPageClient } from "@/components/templates/templates-page-client"

export const dynamic = 'force-dynamic'

export default async function ResourcesTemplatesPage() {
  const { user } = await getCurrentUser()
  
  // Solo admins pueden gestionar plantillas
  if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Plantillas PDF</h1>
          <p className="text-muted-foreground">
            No tiene permiso para acceder a esta sección
          </p>
        </div>
      </div>
    )
  }

  return <TemplatesPageClient />
}
