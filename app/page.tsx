import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { createServerClient } from "@/lib/supabase/server"

export const dynamic = 'force-dynamic'

export default async function Home() {
  // Si viene del subdominio admin, el middleware debería redirigir
  // Pero por si acaso, verificamos aquí también
  const headersList = await headers()
  const host = headersList.get("host") || ""
  
  if (host.startsWith("admin.") || host === "admin.vibook.ai" || host.includes("admin.vibook.ai")) {
    // El middleware debería haber manejado esto, pero por si acaso redirigimos
    redirect("/admin-login")
  }
  
  // Para app.vibook.ai, mantener sesión y enviar a paywall
  if (host === "app.vibook.ai" || host.includes("app.vibook.ai")) {
    const supabase = await createServerClient()
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

    if (authError || !authUser) {
      redirect("/login")
    }

    const { data: user } = await supabase
      .from("users")
      .select("id, is_active")
      .eq("auth_id", authUser.id)
      .maybeSingle()

    if (!user || user.is_active === false) {
      redirect("/login")
    }

    redirect("/paywall")
  }
  
  // Para la app principal, mostrar home normal
  return <div>Home</div>
}
