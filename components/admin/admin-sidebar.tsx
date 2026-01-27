"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { 
  Users, 
  BarChart3, 
  CreditCard, 
  Settings,
  Home,
  LogOut,
  Shield
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

const adminNavItems = [
  {
    title: "Dashboard",
    url: "/admin",
    icon: Home,
  },
  {
    title: "Usuarios",
    url: "/admin/users",
    icon: Users,
  },
  {
    title: "Suscripciones",
    url: "/admin/subscriptions",
    icon: CreditCard,
  },
  {
    title: "Estadísticas",
    url: "/admin/stats",
    icon: BarChart3,
  },
  {
    title: "Seguridad",
    url: "/admin/security",
    icon: Shield,
  },
  {
    title: "Configuración",
    url: "/admin/settings",
    icon: Settings,
  },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    try {
      await fetch("/api/admin/logout", { method: "POST" })
      window.location.href = "/admin-login"
    } catch (error) {
      console.error("Error al cerrar sesión:", error)
    }
  }

  return (
    <div className="flex h-full w-64 flex-col border-r bg-background">
      <div className="flex h-16 items-center border-b px-6">
        <h2 className="text-lg font-semibold">Panel de Admin</h2>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {adminNavItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.url || (item.url === "/admin" && pathname?.startsWith("/admin/users"))
          
          return (
            <Link key={item.url} href={item.url}>
              <Button
                variant={isActive ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start",
                  isActive && "bg-muted font-medium"
                )}
              >
                <Icon className="mr-2 h-4 w-4" />
                {item.title}
              </Button>
            </Link>
          )
        })}
      </nav>
      <div className="border-t p-4 space-y-2">
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={handleLogout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Cerrar Sesión
        </Button>
      </div>
    </div>
  )
}
