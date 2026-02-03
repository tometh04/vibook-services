"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BarChart3,
  CreditCard,
  Home,
  LogOut,
  Settings,
  Shield,
  Users,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

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
    title: "Estadisticas",
    url: "/admin/stats",
    icon: BarChart3,
  },
  {
    title: "Seguridad",
    url: "/admin/security",
    icon: Shield,
  },
  {
    title: "Configuracion",
    url: "/admin/settings",
    icon: Settings,
  },
]

export function AdminSidebar() {
  const pathname = usePathname()

  const handleLogout = async () => {
    try {
      await fetch("/api/admin/logout", { method: "POST" })
      window.location.href = "/admin-login"
    } catch (error) {
      console.error("Error al cerrar sesion:", error)
    }
  }

  return (
    <div className="flex h-full w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="relative border-b border-sidebar-border">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/15 via-primary/5 to-transparent" />
        <div className="relative flex items-center gap-3 px-6 py-5">
          <div className="relative h-9 w-9">
            <Image
              src="/logo-black-2.png"
              alt="Vibook"
              fill
              className="object-contain dark:hidden"
              priority
              unoptimized
            />
            <Image
              src="/logo-white-2.png"
              alt="Vibook"
              fill
              className="hidden object-contain dark:block"
              priority
              unoptimized
            />
          </div>
          <div>
            <div className="text-sm font-semibold text-sidebar-foreground">Vibook Admin</div>
            <div className="text-xs text-sidebar-foreground/60">Panel interno</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {adminNavItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.url || (item.url === "/admin" && pathname?.startsWith("/admin/users"))

          return (
            <Link key={item.url} href={item.url} className="block">
              <div
                className={cn(
                  "group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary shadow-sm dark:bg-primary/20"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                )}
              >
                <Icon className={cn("h-4 w-4", isActive ? "text-primary" : "text-sidebar-foreground/60 group-hover:text-sidebar-foreground")} />
                <span>{item.title}</span>
              </div>
            </Link>
          )
        })}
      </nav>

      <div className="space-y-3 border-t border-sidebar-border p-4">
        <div className="rounded-xl border border-sidebar-border bg-sidebar-accent/60 p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-sidebar-foreground">Modo Admin</span>
            <Badge className="border border-primary/20 bg-primary/10 text-primary">Protegido</Badge>
          </div>
          <p className="mt-2 text-xs text-sidebar-foreground/70">
            Operaciones sensibles. Revisa antes de aplicar cambios.
          </p>
        </div>
        <Button
          variant="outline"
          className="w-full justify-start border-sidebar-border/70 text-sidebar-foreground hover:bg-sidebar-accent"
          onClick={handleLogout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Cerrar sesion
        </Button>
      </div>
    </div>
  )
}
