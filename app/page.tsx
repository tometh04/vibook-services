import { headers } from "next/headers"
import { redirect } from "next/navigation"

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
  
  // Para app.vibook.ai, redirigir a /login
  if (host === "app.vibook.ai" || host.includes("app.vibook.ai")) {
    redirect("/login")
  }
  
  // Para la app principal, mostrar home normal
  return <div>Home</div>
}
