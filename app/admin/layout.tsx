import { redirect } from "next/navigation"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AdminSidebar } from "@/components/admin/admin-sidebar"
import { SiteHeader } from "@/components/site-header"
import { headers, cookies } from "next/headers"
import { jwtVerify } from "jose"

// Secret para verificar el JWT del admin
const JWT_SECRET = new TextEncoder().encode(
  process.env.ADMIN_JWT_SECRET || "vibook-admin-secret-key-change-in-production"
)

async function verifyAdminSession(): Promise<boolean> {
  try {
    const cookieStore = await cookies()
    const adminSession = cookieStore.get("admin_session")

    if (!adminSession?.value) {
      return false
    }

    await jwtVerify(adminSession.value, JWT_SECRET)
    return true
  } catch {
    return false
  }
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Verificar que viene del subdominio admin
  const headersList = await headers()
  const host = headersList.get("host") || ""
  
  // Si no viene del subdominio admin, bloquear acceso
  if (!host.startsWith("admin.") && host !== "admin.vibook.ai") {
    return new Response("Acceso denegado. Este panel solo está disponible en admin.vibook.ai", {
      status: 403,
    })
  }

  // Verificar sesión del admin
  // NOTA: El layout de /admin/login tiene su propio layout que no requiere autenticación
  // Si este layout se ejecuta para /admin/login, el middleware ya debería haberlo manejado
  const hasValidSession = await verifyAdminSession()

  if (!hasValidSession) {
    // Redirigir a login usando URL absoluta
    const loginUrl = new URL('/admin/login', `https://${host}`)
    redirect(loginUrl.toString())
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "16rem",
          "--header-height": "3rem",
        } as React.CSSProperties
      }
    >
      <AdminSidebar />
      <SidebarInset className="min-w-0">
        <SiteHeader />
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 md:p-8">
            {children}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
