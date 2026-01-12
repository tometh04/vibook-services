import { getCurrentUser } from "@/lib/auth"
import { redirect } from "next/navigation"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AdminSidebar } from "@/components/admin/admin-sidebar"
import { SiteHeader } from "@/components/site-header"
import { headers } from "next/headers"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Verificar que viene del subdominio admin (el middleware ya verificó Basic Auth)
  const headersList = await headers()
  const host = headersList.get("host") || ""
  
  // Si no viene del subdominio admin, bloquear acceso
  if (!host.startsWith("admin.") && host !== "admin.vibook.ai") {
    return new Response("Acceso denegado. Este panel solo está disponible en admin.vibook.ai", {
      status: 403,
    })
  }

  const { user } = await getCurrentUser()

  // Solo SUPER_ADMIN puede acceder al panel de admin
  if (user.role !== "SUPER_ADMIN") {
    redirect('/dashboard')
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
