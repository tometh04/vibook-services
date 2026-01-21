"use client"

import { usePathname } from "next/navigation"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { ThemeToggle } from "@/components/theme-toggle"
import { NotificationBell } from "@/components/notifications/notification-bell"
import { Button } from "@/components/ui/button"
import { Search } from "lucide-react"

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
    "/my/commissions": "Mis Comisiones",
    "/settings": "Configuración",
    "/tools/cerebro": "Cerebro",
    "/emilia": "Emilia",
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

  // Función para abrir el Command Menu (⌘K)
  const openCommandMenu = () => {
    const event = new KeyboardEvent("keydown", {
      key: "k",
      metaKey: true,
      ctrlKey: true,
      bubbles: true,
    })
    document.dispatchEvent(event)
  }

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b border-border bg-background transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1 text-foreground" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4 bg-border"
        />
        <h1 className="text-base font-medium text-foreground">{title}</h1>
        <div className="ml-auto flex items-center gap-2">
          {/* Botón de búsqueda global */}
          <Button
            variant="outline"
            size="sm"
            className="hidden md:flex items-center gap-2 text-muted-foreground hover:text-foreground"
            onClick={openCommandMenu}
          >
            <Search className="h-4 w-4" />
            <span className="text-sm">Buscar...</span>
            <kbd className="pointer-events-none ml-2 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
              <span className="text-xs">⌘</span>K
            </kbd>
          </Button>
          {/* Botón compacto en móvil */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={openCommandMenu}
          >
            <Search className="h-4 w-4" />
          </Button>
          <NotificationBell />
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
