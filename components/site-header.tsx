"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { ThemeToggle } from "@/components/theme-toggle"
import { NotificationBell } from "@/components/notifications/notification-bell"
import { Button } from "@/components/ui/button"
import { Search } from "lucide-react"
import { CommandMenu } from "@/components/command-menu"

const getPageTitle = (pathname: string): string => {
  const routes: Record<string, string> = {
    "/dashboard": "Dashboard",
    "/sales/leads": "Leads",
    "/operations": "Operaciones",
    "/customers": "Clientes",
    "/operators": "Operadores",
    "/cash/summary": "Caja",
    "/cash/income": "Ingresos",
    "/cash/expenses": "Egresos",
    "/cash/movements": "Movimientos",
    "/cash/payments": "Pagos",
    "/accounting/ledger": "Libro Mayor",
    "/accounting/iva": "IVA",
    "/accounting/financial-accounts": "Cuentas Financieras",
    "/accounting/operator-payments": "Pagos a Operadores",
    "/accounting/recurring-payments": "Pagos Recurrentes",
    "/alerts": "Alertas",
    "/calendar": "Calendario",
    "/reports": "Reportes",
    "/my/balance": "Mi Balance",
    "/settings": "Configuración",
    "/settings/billing": "Suscripción",
    "/tools/cerebro": "Cerebro",
    "/emilia": "Emilia",
    "/admin": "Admin",
    "/admin/users": "Admin · Usuarios",
    "/admin/subscriptions": "Admin · Suscripciones",
    "/admin/stats": "Admin · Estadísticas",
    "/admin/security": "Admin · Seguridad",
    "/admin/settings": "Admin · Configuración",
    "/admin/billing-history": "Admin · Facturación",
  }

  // Buscar coincidencia exacta o parcial
  for (const [route, title] of Object.entries(routes)) {
    if (pathname === route || pathname.startsWith(route + "/")) {
      return title
    }
  }

  return "Vibook Gestión"
}

export function SiteHeader() {
  const pathname = usePathname()
  const title = getPageTitle(pathname)
  const [commandMenuOpen, setCommandMenuOpen] = useState(false)

  return (
    <>
      <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b border-[hsl(var(--header-border))] bg-[hsl(var(--header-background))] text-[hsl(var(--header-foreground))] transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
        <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
          <SidebarTrigger className="-ml-1 text-[hsl(var(--header-foreground))]" />
          <Separator
            orientation="vertical"
            className="mx-2 data-[orientation=vertical]:h-4 bg-[hsl(var(--header-border))]"
          />
          <h1 className="text-base font-medium text-[hsl(var(--header-foreground))]">{title}</h1>
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-[hsl(var(--header-foreground))]"
              onClick={() => setCommandMenuOpen(true)}
              title="Buscar (⌘K o Ctrl+K)"
            >
              <Search className="h-4 w-4" />
            </Button>
            <NotificationBell />
            <ThemeToggle />
          </div>
        </div>
      </header>
      <CommandMenu open={commandMenuOpen} onOpenChange={setCommandMenuOpen} />
    </>
  )
}
