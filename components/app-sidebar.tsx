"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import Image from "next/image"
import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  Building2,
  DollarSign,
  FileText,
  Settings,
  AlertCircle,
  Plane,
  Calculator,
  GalleryVerticalEnd,
  Calendar as CalendarIcon,
  MessageSquare,
  Bot,
  MessageCircle,
  Wallet,
  Coins,
  BookOpen,
} from "lucide-react"
import { shouldShowInSidebar, type UserRole } from "@/lib/permissions"
import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { ThemeToggleSidebar } from "@/components/theme-toggle-sidebar"
import { OnboardingGuard } from "@/components/onboarding/onboarding-guard"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { Skeleton } from "@/components/ui/skeleton"
import { useTenantBranding } from "@/hooks/use-tenant-branding"

interface NavSubSubItem {
  title: string
  url: string
}

interface NavSubItem {
  title: string
  url: string
  items?: NavSubSubItem[]
  module?: "dashboard" | "leads" | "operations" | "customers" | "operators" | "cash" | "accounting" | "alerts" | "reports" | "settings"
}

interface NavItem {
  title: string
  url: string
  icon?: React.ComponentType<{ className?: string }>
  items?: NavSubItem[]
  module?: "dashboard" | "leads" | "operations" | "customers" | "operators" | "cash" | "accounting" | "alerts" | "reports" | "settings"
  collapsible?: boolean
}

const allNavigation: NavItem[] = [
  // Dashboard - NO colapsable
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
    module: "dashboard",
    collapsible: false,
  },
  // Clientes - Colapsable
  {
    title: "Clientes",
    url: "/customers",
    icon: Users,
    module: "customers",
    items: [
      { title: "Clientes", url: "/customers" },
      { title: "Estadísticas", url: "/customers/statistics" },
    ],
  },
  // Operaciones - Colapsable
  {
    title: "Operaciones",
    url: "/operations",
    icon: Plane,
    module: "operations",
    items: [
      { title: "Operaciones", url: "/operations" },
      { title: "Estadísticas", url: "/operations/statistics" },
      { title: "Configuración", url: "/operations/settings" },
    ],
  },
  // CRM - NO colapsable (link directo)
  {
    title: "CRM",
    url: "/sales/leads",
    icon: ShoppingCart,
    module: "leads",
    collapsible: false,
  },
  // Finanzas - Colapsable (con submenús anidados)
  {
    title: "Finanzas",
    url: "/cash/summary",
    icon: DollarSign,
    module: "cash",
    items: [
      // Caja - Submenú con nivel 3
      {
        title: "Caja",
        url: "/cash/summary",
        items: [
          { title: "Resumen", url: "/cash/summary" },
          { title: "Ingresos", url: "/cash/income" },
          { title: "Egresos", url: "/cash/expenses" },
        ],
      },
      // Contabilidad - Submenú con nivel 3
      {
        title: "Contabilidad",
        url: "/accounting/ledger",
        items: [
          { title: "Libro Mayor", url: "/accounting/ledger" },
          { title: "IVA", url: "/accounting/iva" },
          { title: "Cuentas Financieras", url: "/accounting/financial-accounts" },
          { title: "Posición Mensual", url: "/accounting/monthly-position" },
          { title: "Deudores por Ventas", url: "/accounting/debts-sales" },
          { title: "Pagos a Operadores", url: "/accounting/operator-payments" },
          { title: "Pagos Recurrentes", url: "/accounting/recurring-payments" },
          { title: "Cuentas de Socios", url: "/accounting/partner-accounts" },
        ],
      },
      // Items directos sin submenú
      { title: "Mi Balance", url: "/my/balance" },
      { title: "Configuración", url: "/finances/settings" },
    ],
  },
  // Recursos - Colapsable
  {
    title: "Recursos",
    url: "/calendar",
    icon: BookOpen,
    items: [
      { title: "Calendario", url: "/calendar" },
      { title: "Plantillas", url: "/resources/templates" },
      { title: "Ayuda", url: "/ayuda" },
    ],
  },
  // Documentos - Colapsable
  {
    title: "Documentos",
    url: "/reports",
    icon: FileText,
    items: [
      { title: "Reportes", url: "/reports", module: "reports" as const },
      { title: "Mensajes", url: "/messages" },
      { title: "Alertas", url: "/alerts", module: "alerts" as const },
    ],
  },
  // Agencia - Colapsable
  {
    title: "Agencia",
    url: "/settings",
    icon: Building2,
    module: "settings",
    items: [
      { title: "Configuración", url: "/settings" },
      { title: "Suscripción", url: "/settings/billing" },
      { title: "Operadores", url: "/operators", module: "operators" as const },
      { title: "Usuarios", url: "/settings/users" },
    ],
  },
  // Herramientas - Colapsable
  {
    title: "Herramientas",
    url: "/tools/cerebro",
    icon: Bot,
    items: [
      { title: "Cerebro", url: "/tools/cerebro" },
      { title: "Emilia", url: "/emilia" },
    ],
  },
]

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  userRole: UserRole
  user: {
    name: string
    email: string
    avatar?: string
  }
  agencyId?: string
}

export function AppSidebar({ userRole, user, agencyId, ...props }: AppSidebarProps) {
  const pathname = usePathname()
  const { branding, isLoading: brandingLoading } = useTenantBranding(agencyId)

  // Filtrar navegación según permisos
  const navigation = allNavigation
    .map((item) => {
      // Filtrar items principales
      if (item.module) {
        if (!shouldShowInSidebar(userRole, item.module)) {
          return null
        }
      }

      // Filtrar subitems según permisos
      if (item.items) {
        const filteredItems = item.items
          .map((subItem) => {
            // Si el subitem tiene un módulo, verificar permisos
            if (subItem.module) {
              if (!shouldShowInSidebar(userRole, subItem.module)) {
                return null
              }
            }

            // Si el subitem tiene items (nivel 3), mantenerlos todos
            if (subItem.items) {
              return subItem
            }

            return subItem
          })
          .filter((subItem): subItem is NavSubItem => subItem !== null)

        // Si no quedan items, no mostrar el item principal
        if (filteredItems.length === 0) {
          return null
        }

        return { ...item, items: filteredItems }
      }

      // Items sin módulo (como Dashboard) siempre visibles
      return item
    })
    .filter((item): item is NavItem => {
      if (!item) return false
      // Items sin módulo (como "Mi Balance") solo para vendedores
      if (item.url === "/my/balance") {
        return userRole === "SELLER"
      }
      return true
    })

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-2 data-[slot=sidebar-menu-button]:hover:bg-transparent"
            >
              <a href="/dashboard" className="flex items-center gap-2">
                {brandingLoading ? (
                  <>
                    <Skeleton className="size-5 rounded" />
                    <Skeleton className="h-4 w-24" />
                  </>
                ) : branding.logo_url ? (
                  <>
                    <Image 
                      src={branding.logo_url} 
                      alt={branding.app_name} 
                      width={20} 
                      height={20}
                      className="size-5 object-contain"
                    />
                    <span className="text-sm font-medium text-foreground">{branding.app_name}</span>
                  </>
                ) : (
                  <div className="flex w-full justify-center">
                    <Image 
                      src="/logo-black-2.png" 
                      alt="Vibook" 
                      width={120} 
                      height={34}
                      className="h-8 w-auto dark:hidden"
                    />
                    <Image 
                      src="/logo-white-2.png" 
                      alt="Vibook" 
                      width={120} 
                      height={34}
                      className="h-8 w-auto hidden dark:block"
                    />
                  </div>
                )}
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navigation} pathname={pathname} />
        <OnboardingGuard variant="sidebar" />
      </SidebarContent>
      <SidebarFooter>
        <ThemeToggleSidebar />
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
