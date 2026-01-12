import { getCurrentUser } from "@/lib/auth"
import { redirect } from "next/navigation"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AdminSidebar } from "@/components/admin/admin-sidebar"
import { SiteHeader } from "@/components/site-header"
import { headers } from "next/headers"

// Credenciales de Basic Auth para el panel de admin
const ADMIN_USERNAME = "admin@vibook.ai"
const ADMIN_PASSWORD = "_Vibook042308"

function verifyBasicAuth(authHeader: string | null): boolean {
  if (!authHeader || !authHeader.startsWith("Basic ")) {
    return false
  }

  try {
    const base64Credentials = authHeader.split(" ")[1]
    const credentials = Buffer.from(base64Credentials, "base64").toString("utf-8")
    const [username, password] = credentials.split(":")

    return username === ADMIN_USERNAME && password === ADMIN_PASSWORD
  } catch {
    return false
  }
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Verificar Basic Auth primero
  const headersList = await headers()
  const authHeader = headersList.get("authorization")

  if (!verifyBasicAuth(authHeader)) {
    return new Response(null, {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Basic realm="Admin Panel - Vibook"',
      },
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
