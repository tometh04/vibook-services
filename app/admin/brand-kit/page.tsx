"use client"

import { useState } from "react"
import Image from "next/image"
import {
  Plane,
  Users,
  DollarSign,
  Calendar,
  Search,
  Settings,
  Bell,
  Mail,
  Phone,
  MapPin,
  FileText,
  BarChart3,
  CreditCard,
  Star,
  Heart,
  Download,
  Upload,
  Trash2,
  Edit,
  Plus,
  Check,
  X,
  AlertTriangle,
  Info,
} from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

const SECTIONS = [
  { id: "logo", label: "Logo" },
  { id: "colors", label: "Colores" },
  { id: "typography", label: "Tipografia" },
  { id: "icons", label: "Iconografia" },
  { id: "spacing", label: "Espaciado & Radius" },
  { id: "darkmode", label: "Dark Mode" },
  { id: "palettes", label: "Paletas Tenant" },
]

function Section({ id, title, description, children }: {
  id: string
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-8">
      <div className="mb-4">
        <h2 className="text-2xl font-bold">{title}</h2>
        <p className="text-muted-foreground">{description}</p>
      </div>
      <Card>
        <CardContent className="p-6">
          {children}
        </CardContent>
      </Card>
    </section>
  )
}

const BRAND_COLORS = [
  {
    name: "Primary",
    semantic: "Acciones principales, CTAs, links activos",
    hex: "#3B82F6",
    hsl: "217 91% 50%",
    var: "--primary",
    bg: "bg-primary",
  },
  {
    name: "Success",
    semantic: "Confirmaciones, estados exitosos, ingresos",
    hex: "#059669",
    hsl: "142 71% 45%",
    var: "--success",
    bg: "bg-success",
  },
  {
    name: "Warning",
    semantic: "Alertas, estados pendientes, precauciones",
    hex: "#F59E0B",
    hsl: "38 92% 50%",
    var: "--warning",
    bg: "bg-warning",
  },
  {
    name: "Destructive",
    semantic: "Errores, eliminaciones, egresos",
    hex: "#EF4444",
    hsl: "0 84% 60%",
    var: "--destructive",
    bg: "bg-destructive",
  },
  {
    name: "Background",
    semantic: "Fondo principal de la aplicacion",
    hex: "#FFFFFF",
    hsl: "0 0% 100%",
    var: "--background",
    bg: "bg-background",
  },
  {
    name: "Foreground",
    semantic: "Texto principal, headings",
    hex: "#0F172A",
    hsl: "222 84% 5%",
    var: "--foreground",
    bg: "bg-foreground",
  },
  {
    name: "Muted",
    semantic: "Fondos secundarios, areas inactivas",
    hex: "#F0F4F8",
    hsl: "210 20% 96%",
    var: "--muted",
    bg: "bg-muted",
  },
  {
    name: "Muted Foreground",
    semantic: "Texto secundario, labels, placeholders",
    hex: "#64748B",
    hsl: "215 16% 47%",
    var: "--muted-foreground",
    bg: "bg-muted-foreground",
  },
  {
    name: "Border",
    semantic: "Bordes de cards, inputs, separadores",
    hex: "#E2E8F0",
    hsl: "214 32% 91%",
    var: "--border",
    bg: "bg-border",
  },
]

const CHART_COLORS = [
  { name: "Chart 1 (Blue)", hex: "#4D8BF5", var: "--chart-1" },
  { name: "Chart 2 (Cyan)", hex: "#06B6D4", var: "--chart-2" },
  { name: "Chart 3 (Purple)", hex: "#8B5CF6", var: "--chart-3" },
  { name: "Chart 4 (Yellow)", hex: "#F59E0B", var: "--chart-4" },
  { name: "Chart 5 (Green)", hex: "#22C55E", var: "--chart-5" },
  { name: "Chart 6 (Red)", hex: "#EF4444", var: "--chart-6" },
]

const ICONS_USED = [
  { name: "Plane", icon: Plane, usage: "Operaciones, viajes" },
  { name: "Users", icon: Users, usage: "Clientes, pasajeros" },
  { name: "DollarSign", icon: DollarSign, usage: "Ventas, montos, finanzas" },
  { name: "Calendar", icon: Calendar, usage: "Fechas, calendario" },
  { name: "Search", icon: Search, usage: "Busqueda global" },
  { name: "Settings", icon: Settings, usage: "Configuracion" },
  { name: "Bell", icon: Bell, usage: "Notificaciones, alertas" },
  { name: "Mail", icon: Mail, usage: "Email, mensajes" },
  { name: "Phone", icon: Phone, usage: "Telefono, WhatsApp" },
  { name: "MapPin", icon: MapPin, usage: "Ubicacion, destinos" },
  { name: "FileText", icon: FileText, usage: "Documentos, reportes" },
  { name: "BarChart3", icon: BarChart3, usage: "Estadisticas, graficos" },
  { name: "CreditCard", icon: CreditCard, usage: "Pagos, suscripciones" },
  { name: "Star", icon: Star, usage: "Favoritos, ranking" },
  { name: "Download", icon: Download, usage: "Exportar, descargar" },
  { name: "Upload", icon: Upload, usage: "Subir archivos" },
  { name: "Trash2", icon: Trash2, usage: "Eliminar" },
  { name: "Edit", icon: Edit, usage: "Editar" },
  { name: "Plus", icon: Plus, usage: "Crear, agregar" },
  { name: "Check", icon: Check, usage: "Confirmar, exito" },
  { name: "X", icon: X, usage: "Cerrar, cancelar" },
  { name: "AlertTriangle", icon: AlertTriangle, usage: "Advertencia" },
  { name: "Info", icon: Info, usage: "Informacion" },
  { name: "Heart", icon: Heart, usage: "Favoritos, likes" },
]

const TENANT_PALETTES = [
  { name: "Vibook (Default)", id: "vibook", primary: "#4A154B", secondary: "#36C5F0", accent: "#2EB67D" },
  { name: "Trello", id: "trello", primary: "#0079BF", secondary: "#026AA7", accent: "#5AAC44" },
  { name: "Linear", id: "linear", primary: "#5E6AD2", secondary: "#7B61FF", accent: "#00C4CC" },
  { name: "GitHub", id: "github", primary: "#24292F", secondary: "#0969DA", accent: "#2DA44E" },
  { name: "Asana", id: "asana", primary: "#F06A6A", secondary: "#FF9A7B", accent: "#FFC857" },
]

const SPACING_SCALE = [
  { value: "1", px: "4px", class: "p-1" },
  { value: "2", px: "8px", class: "p-2" },
  { value: "3", px: "12px", class: "p-3" },
  { value: "4", px: "16px", class: "p-4" },
  { value: "6", px: "24px", class: "p-6" },
  { value: "8", px: "32px", class: "p-8" },
  { value: "12", px: "48px", class: "p-12" },
]

const TYPE_SCALE = [
  { class: "text-xs", size: "12px", weight: "Regular" },
  { class: "text-sm", size: "14px", weight: "Regular" },
  { class: "text-base", size: "16px", weight: "Regular" },
  { class: "text-lg", size: "18px", weight: "Regular" },
  { class: "text-xl", size: "20px", weight: "Semibold" },
  { class: "text-2xl", size: "24px", weight: "Semibold" },
  { class: "text-3xl", size: "30px", weight: "Bold" },
  { class: "text-4xl", size: "36px", weight: "Bold" },
]

export default function BrandKitPage() {
  const [activeSection, setActiveSection] = useState("logo")

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Brand Kit</h1>
        <p className="text-muted-foreground">
          Guia de identidad visual y directrices de marca de Vibook
        </p>
      </div>

      <div className="flex gap-8">
        {/* Sidebar sticky */}
        <nav className="hidden lg:block w-48 shrink-0">
          <div className="sticky top-4 space-y-1">
            {SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                onClick={() => setActiveSection(s.id)}
                className={`block rounded-md px-3 py-1.5 text-sm transition-colors ${
                  activeSection === s.id
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {s.label}
              </a>
            ))}
          </div>
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-10">

          {/* LOGO */}
          <Section id="logo" title="Logo" description="Logotipo oficial de Vibook y sus variantes">
            <div className="space-y-8">
              {/* Logo principal */}
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Logo principal</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="border rounded-xl p-8 flex items-center justify-center bg-white">
                    <Image
                      src="/logo-black-2.png"
                      alt="Vibook Logo (Light)"
                      width={200}
                      height={67}
                      unoptimized
                    />
                  </div>
                  <div className="border rounded-xl p-8 flex items-center justify-center bg-[#0b1220]">
                    <Image
                      src="/logo-white-2.png"
                      alt="Vibook Logo (Dark)"
                      width={200}
                      height={67}
                      unoptimized
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6 mt-2">
                  <p className="text-xs text-center text-muted-foreground">Fondo claro — logo-black-2.png</p>
                  <p className="text-xs text-center text-muted-foreground">Fondo oscuro — logo-white-2.png</p>
                </div>
              </div>

              {/* Zona de respeto */}
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Zona de respeto</h3>
                <div className="border rounded-xl p-8 flex items-center justify-center bg-white max-w-md mx-auto">
                  <div className="border-2 border-dashed border-blue-300 p-8 rounded-lg">
                    <Image
                      src="/logo-black-2.png"
                      alt="Vibook Logo con zona de respeto"
                      width={160}
                      height={53}
                      unoptimized
                    />
                  </div>
                </div>
                <p className="text-xs text-center text-muted-foreground mt-2">
                  Mantener un espacio minimo equivalente a la altura del simbolo alrededor del logo
                </p>
              </div>

              {/* Tamaños */}
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Tamanos</h3>
                <div className="flex items-end gap-8">
                  <div className="text-center">
                    <div className="border rounded-lg p-3 bg-white inline-block">
                      <Image src="/logo-black-2.png" alt="Logo XL" width={200} height={67} unoptimized />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">200px (Header)</p>
                  </div>
                  <div className="text-center">
                    <div className="border rounded-lg p-3 bg-white inline-block">
                      <Image src="/logo-black-2.png" alt="Logo M" width={120} height={40} unoptimized />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">120px (Login)</p>
                  </div>
                  <div className="text-center">
                    <div className="border rounded-lg p-3 bg-white inline-block">
                      <Image src="/logo-black-2.png" alt="Logo S" width={80} height={27} unoptimized />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">80px (Sidebar)</p>
                  </div>
                </div>
              </div>
            </div>
          </Section>

          {/* COLORS */}
          <Section id="colors" title="Paleta de Colores" description="Sistema de colores semanticos con CSS variables HSL">
            <div className="space-y-8">
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Colores principales</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {BRAND_COLORS.map((c) => (
                    <div key={c.var} className="border rounded-xl overflow-hidden">
                      <div
                        className="h-20"
                        style={{ backgroundColor: `hsl(var(${c.var}))` }}
                      />
                      <div className="p-3 space-y-1">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-sm">{c.name}</p>
                          <Badge variant="outline" className="text-xs font-mono">{c.hex}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{c.semantic}</p>
                        <p className="text-xs text-muted-foreground font-mono">HSL: {c.hsl}</p>
                        <p className="text-xs text-muted-foreground font-mono">var({c.var})</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Colores de graficos</h3>
                <div className="flex gap-3">
                  {CHART_COLORS.map((c) => (
                    <div key={c.var} className="flex-1 text-center">
                      <div
                        className="h-12 rounded-lg border"
                        style={{ backgroundColor: `hsl(var(${c.var}))` }}
                      />
                      <p className="text-xs font-medium mt-2">{c.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{c.hex}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Section>

          {/* TYPOGRAPHY */}
          <Section id="typography" title="Tipografia" description="Inter (Google Fonts) — La tipografia oficial del sistema">
            <div className="space-y-8">
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Font Family</h3>
                <div className="border rounded-xl p-6 bg-muted/30">
                  <p className="text-4xl font-bold mb-2">Inter</p>
                  <p className="text-muted-foreground">
                    ABCDEFGHIJKLMNOPQRSTUVWXYZ<br />
                    abcdefghijklmnopqrstuvwxyz<br />
                    0123456789 !@#$%^&*()
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Pesos</h3>
                <div className="space-y-3">
                  <div className="flex items-baseline gap-4">
                    <span className="w-24 text-xs text-muted-foreground text-right shrink-0">Regular (400)</span>
                    <p className="font-normal text-xl">Vibook Gestion — Sistema de gestion para agencias de viajes</p>
                  </div>
                  <div className="flex items-baseline gap-4">
                    <span className="w-24 text-xs text-muted-foreground text-right shrink-0">Medium (500)</span>
                    <p className="font-medium text-xl">Vibook Gestion — Sistema de gestion para agencias de viajes</p>
                  </div>
                  <div className="flex items-baseline gap-4">
                    <span className="w-24 text-xs text-muted-foreground text-right shrink-0">Semibold (600)</span>
                    <p className="font-semibold text-xl">Vibook Gestion — Sistema de gestion para agencias de viajes</p>
                  </div>
                  <div className="flex items-baseline gap-4">
                    <span className="w-24 text-xs text-muted-foreground text-right shrink-0">Bold (700)</span>
                    <p className="font-bold text-xl">Vibook Gestion — Sistema de gestion para agencias de viajes</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Escala tipografica</h3>
                <div className="space-y-4">
                  {TYPE_SCALE.map((t) => (
                    <div key={t.class} className="flex items-baseline gap-4 border-b pb-3">
                      <div className="w-32 shrink-0">
                        <p className="text-xs font-mono text-muted-foreground">{t.class}</p>
                        <p className="text-xs text-muted-foreground">{t.size} / {t.weight}</p>
                      </div>
                      <p className={`${t.class} ${t.weight === "Bold" ? "font-bold" : t.weight === "Semibold" ? "font-semibold" : ""}`}>
                        Operaciones del mes
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Section>

          {/* ICONS */}
          <Section id="icons" title="Iconografia" description="Lucide React — Libreria de iconos oficial del sistema">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline">lucide-react</Badge>
                <span className="text-sm text-muted-foreground">Tamano estandar: 16px (h-4 w-4) dentro de botones, 20px (h-5 w-5) standalone</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {ICONS_USED.map((item) => {
                  const Icon = item.icon
                  return (
                    <div key={item.name} className="border rounded-lg p-3 text-center hover:bg-muted/50 transition-colors">
                      <Icon className="h-6 w-6 mx-auto mb-2 text-foreground" />
                      <p className="text-xs font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.usage}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          </Section>

          {/* SPACING & RADIUS */}
          <Section id="spacing" title="Espaciado & Radius" description="Sistema de espaciado y bordes redondeados">
            <div className="space-y-8">
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Escala de espaciado (Tailwind)</h3>
                <div className="space-y-3">
                  {SPACING_SCALE.map((s) => (
                    <div key={s.value} className="flex items-center gap-4">
                      <span className="w-16 text-xs text-muted-foreground text-right font-mono shrink-0">{s.class}</span>
                      <span className="w-12 text-xs text-muted-foreground shrink-0">{s.px}</span>
                      <div className="flex-1">
                        <div
                          className="bg-primary/20 border border-primary/40 rounded"
                          style={{ height: "24px", width: s.px }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Border Radius</h3>
                <div className="flex gap-6">
                  <div className="text-center">
                    <div className="w-20 h-20 border-2 border-primary bg-primary/10 rounded-sm" />
                    <p className="text-xs font-medium mt-2">SM</p>
                    <p className="text-xs text-muted-foreground">calc(var(--radius) - 4px)</p>
                    <p className="text-xs text-muted-foreground">4px</p>
                  </div>
                  <div className="text-center">
                    <div className="w-20 h-20 border-2 border-primary bg-primary/10 rounded-md" />
                    <p className="text-xs font-medium mt-2">MD</p>
                    <p className="text-xs text-muted-foreground">calc(var(--radius) - 2px)</p>
                    <p className="text-xs text-muted-foreground">6px</p>
                  </div>
                  <div className="text-center">
                    <div className="w-20 h-20 border-2 border-primary bg-primary/10 rounded-lg" />
                    <p className="text-xs font-medium mt-2">LG</p>
                    <p className="text-xs text-muted-foreground">var(--radius)</p>
                    <p className="text-xs text-muted-foreground">8px</p>
                  </div>
                  <div className="text-center">
                    <div className="w-20 h-20 border-2 border-primary bg-primary/10 rounded-xl" />
                    <p className="text-xs font-medium mt-2">XL</p>
                    <p className="text-xs text-muted-foreground">12px</p>
                  </div>
                  <div className="text-center">
                    <div className="w-20 h-20 border-2 border-primary bg-primary/10 rounded-full" />
                    <p className="text-xs font-medium mt-2">Full</p>
                    <p className="text-xs text-muted-foreground">9999px</p>
                  </div>
                </div>
              </div>
            </div>
          </Section>

          {/* DARK MODE */}
          <Section id="darkmode" title="Dark Mode" description="Comparacion del sistema visual en modo claro y oscuro">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Light */}
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Light Mode</h3>
                <div className="rounded-xl border overflow-hidden">
                  <div className="bg-white p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-[#0F172A]">Operacion Cancun</p>
                      <span className="bg-[#059669] text-white text-xs px-2 py-0.5 rounded-full">Confirmada</span>
                    </div>
                    <p className="text-sm text-[#64748B]">Paquete all-inclusive para 2 adultos</p>
                    <div className="border-t border-[#E2E8F0] pt-3 flex justify-between items-center">
                      <span className="text-[#64748B] text-sm">Total</span>
                      <span className="font-bold text-[#0F172A]">USD 2.500</span>
                    </div>
                    <button className="w-full bg-[#3B82F6] text-white rounded-md py-2 text-sm font-medium">
                      Ver detalle
                    </button>
                  </div>
                </div>
                <div className="mt-3 space-y-1">
                  <div className="flex gap-2 text-xs">
                    <span className="w-3 h-3 rounded bg-white border shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">Background: #FFFFFF</span>
                  </div>
                  <div className="flex gap-2 text-xs">
                    <span className="w-3 h-3 rounded bg-[#0F172A] shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">Foreground: #0F172A</span>
                  </div>
                  <div className="flex gap-2 text-xs">
                    <span className="w-3 h-3 rounded bg-[#3B82F6] shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">Primary: #3B82F6</span>
                  </div>
                </div>
              </div>

              {/* Dark */}
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Dark Mode</h3>
                <div className="rounded-xl border overflow-hidden">
                  <div className="bg-[#111827] p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-[#F8FAFC]">Operacion Cancun</p>
                      <span className="bg-[#10B981] text-white text-xs px-2 py-0.5 rounded-full">Confirmada</span>
                    </div>
                    <p className="text-sm text-[#94A3B8]">Paquete all-inclusive para 2 adultos</p>
                    <div className="border-t border-[#374151] pt-3 flex justify-between items-center">
                      <span className="text-[#94A3B8] text-sm">Total</span>
                      <span className="font-bold text-[#F8FAFC]">USD 2.500</span>
                    </div>
                    <button className="w-full bg-[#60A5FA] text-[#111827] rounded-md py-2 text-sm font-medium">
                      Ver detalle
                    </button>
                  </div>
                </div>
                <div className="mt-3 space-y-1">
                  <div className="flex gap-2 text-xs">
                    <span className="w-3 h-3 rounded bg-[#111827] border shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">Background: #111827</span>
                  </div>
                  <div className="flex gap-2 text-xs">
                    <span className="w-3 h-3 rounded bg-[#F8FAFC] shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">Foreground: #F8FAFC</span>
                  </div>
                  <div className="flex gap-2 text-xs">
                    <span className="w-3 h-3 rounded bg-[#60A5FA] shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">Primary: #60A5FA</span>
                  </div>
                </div>
              </div>
            </div>
          </Section>

          {/* TENANT PALETTES */}
          <Section id="palettes" title="Paletas Tenant" description="5 paletas predefinidas disponibles para personalizacion por agencia">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {TENANT_PALETTES.map((p) => (
                <div key={p.id} className="border rounded-xl overflow-hidden">
                  <div className="flex h-12">
                    <div className="flex-1" style={{ backgroundColor: p.primary }} />
                    <div className="flex-1" style={{ backgroundColor: p.secondary }} />
                    <div className="flex-1" style={{ backgroundColor: p.accent }} />
                  </div>
                  <div className="p-3">
                    <p className="font-semibold text-sm">{p.name}</p>
                    <div className="flex gap-3 mt-2">
                      <div className="text-xs">
                        <span className="text-muted-foreground">Primary</span>
                        <p className="font-mono">{p.primary}</p>
                      </div>
                      <div className="text-xs">
                        <span className="text-muted-foreground">Secondary</span>
                        <p className="font-mono">{p.secondary}</p>
                      </div>
                      <div className="text-xs">
                        <span className="text-muted-foreground">Accent</span>
                        <p className="font-mono">{p.accent}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Section>

        </div>
      </div>
    </div>
  )
}
