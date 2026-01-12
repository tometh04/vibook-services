import { getCurrentUser } from "@/lib/auth"
import { redirect } from "next/navigation"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AdminSidebar } from "@/components/admin/admin-sidebar"
import { SiteHeader } from "@/components/site-header"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user } = await getCurrentUser()

  // Solo SUPER_ADMIN puede acceder al panel de admin
  // La autenticación Basic Auth se maneja en el middleware
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
