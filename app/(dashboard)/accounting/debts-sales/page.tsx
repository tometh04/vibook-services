import { DebtsSalesPageClient } from "@/components/accounting/debts-sales-page-client"
import { getCurrentUser } from "@/lib/auth"
import { createServerClient } from "@/lib/supabase/server"
import { canAccessModule } from "@/lib/permissions"

export default async function DebtsSalesPage() {
  const { user } = await getCurrentUser()
  
  if (!canAccessModule(user.role as any, "accounting")) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Deudores por Ventas</h1>
          <p className="text-muted-foreground">No tiene permiso para acceder a esta sección</p>
        </div>
      </div>
    )
  }

  const supabase = await createServerClient()

  // Obtener lista de vendedores
  const { data: sellers } = await supabase
    .from("users")
    .select("id, name")
    .in("role", ["SELLER", "ADMIN", "SUPER_ADMIN"])
    .order("name")

  return <DebtsSalesPageClient sellers={sellers || []} />
}
