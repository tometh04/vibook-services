"use client"

import { useState } from "react"
import {
  Plus,
  Search,
  Settings,
  Trash2,
  Edit,
  Download,
  Upload,
  Mail,
  Phone,
  MapPin,
  Calendar,
  DollarSign,
  Users,
  Plane,
  Star,
  Heart,
  Bell,
  ChevronRight,
  MoreHorizontal,
  Loader2,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group"
import { toast } from "sonner"

const SECTIONS = [
  { id: "typography", label: "Tipografia" },
  { id: "colors", label: "Colores" },
  { id: "buttons", label: "Botones" },
  { id: "badges", label: "Badges" },
  { id: "inputs", label: "Inputs & Forms" },
  { id: "cards", label: "Cards" },
  { id: "tables", label: "Tablas" },
  { id: "navigation", label: "Navegacion" },
  { id: "feedback", label: "Feedback" },
  { id: "overlays", label: "Overlays" },
  { id: "others", label: "Otros" },
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

function SectionGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{label}</h3>
      {children}
    </div>
  )
}

const COLOR_SWATCHES = [
  { name: "Primary", var: "--primary", hex: "#3B82F6" },
  { name: "Primary Foreground", var: "--primary-foreground", hex: "#FFFFFF" },
  { name: "Success", var: "--success", hex: "#059669" },
  { name: "Warning", var: "--warning", hex: "#F59E0B" },
  { name: "Destructive", var: "--destructive", hex: "#EF4444" },
  { name: "Background", var: "--background", hex: "#FFFFFF" },
  { name: "Foreground", var: "--foreground", hex: "#0F172A" },
  { name: "Card", var: "--card", hex: "#FFFFFF" },
  { name: "Muted", var: "--muted", hex: "#F0F4F8" },
  { name: "Muted Foreground", var: "--muted-foreground", hex: "#64748B" },
  { name: "Border", var: "--border", hex: "#E2E8F0" },
  { name: "Ring", var: "--ring", hex: "#3B82F6" },
  { name: "Chart 1", var: "--chart-1", hex: "#4D8BF5" },
  { name: "Chart 2", var: "--chart-2", hex: "#06B6D4" },
  { name: "Chart 3", var: "--chart-3", hex: "#8B5CF6" },
  { name: "Chart 4", var: "--chart-4", hex: "#F59E0B" },
  { name: "Chart 5", var: "--chart-5", hex: "#22C55E" },
  { name: "Chart 6", var: "--chart-6", hex: "#EF4444" },
]

export default function UIKitPage() {
  const [activeSection, setActiveSection] = useState("typography")

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">UI Kit</h1>
          <p className="text-muted-foreground">
            Catalogo visual de todos los componentes del sistema de diseno
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

            {/* TYPOGRAPHY */}
            <Section id="typography" title="Tipografia" description="Escala tipografica basada en Inter (Google Fonts)">
              <div className="space-y-6">
                <SectionGroup label="Headings">
                  <div className="space-y-4">
                    <div>
                      <span className="text-xs text-muted-foreground">text-4xl font-bold</span>
                      <h1 className="text-4xl font-bold">Heading 1 — Vibook Gestion</h1>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">text-3xl font-bold</span>
                      <h2 className="text-3xl font-bold">Heading 2 — Operaciones</h2>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">text-2xl font-semibold</span>
                      <h3 className="text-2xl font-semibold">Heading 3 — Detalle</h3>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">text-xl font-semibold</span>
                      <h4 className="text-xl font-semibold">Heading 4 — Seccion</h4>
                    </div>
                  </div>
                </SectionGroup>

                <SectionGroup label="Body Text">
                  <div className="space-y-3">
                    <div>
                      <span className="text-xs text-muted-foreground">text-lg (Lead)</span>
                      <p className="text-lg text-muted-foreground">Texto introductorio para descripciones largas y resúmenes de sección.</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">text-base (Default)</span>
                      <p>Texto normal usado en la mayor parte del contenido del sistema.</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">text-sm</span>
                      <p className="text-sm">Texto secundario para labels, descripciones y metadata.</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">text-xs</span>
                      <p className="text-xs">Texto auxiliar para notas al pie y etiquetas menores.</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">text-muted-foreground</span>
                      <p className="text-muted-foreground">Texto en color muted para informacion secundaria.</p>
                    </div>
                  </div>
                </SectionGroup>
              </div>
            </Section>

            {/* COLORS */}
            <Section id="colors" title="Colores" description="Paleta de colores del sistema basada en CSS variables (HSL)">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {COLOR_SWATCHES.map((c) => (
                  <div key={c.var} className="space-y-2">
                    <div
                      className="h-16 rounded-lg border shadow-sm"
                      style={{ backgroundColor: `hsl(var(${c.var}))` }}
                    />
                    <div>
                      <p className="text-xs font-medium">{c.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{c.hex}</p>
                      <p className="text-xs text-muted-foreground font-mono">var({c.var})</p>
                    </div>
                  </div>
                ))}
              </div>
            </Section>

            {/* BUTTONS */}
            <Section id="buttons" title="Botones" description="6 variantes × 4 tamanos + estados">
              <div className="space-y-6">
                <SectionGroup label="Variantes">
                  <div className="flex flex-wrap gap-3">
                    <Button variant="default">Default</Button>
                    <Button variant="destructive">Destructive</Button>
                    <Button variant="outline">Outline</Button>
                    <Button variant="secondary">Secondary</Button>
                    <Button variant="ghost">Ghost</Button>
                    <Button variant="link">Link</Button>
                  </div>
                </SectionGroup>

                <SectionGroup label="Tamanos">
                  <div className="flex flex-wrap items-center gap-3">
                    <Button size="lg">Large</Button>
                    <Button size="default">Default</Button>
                    <Button size="sm">Small</Button>
                    <Button size="icon"><Plus className="h-4 w-4" /></Button>
                  </div>
                </SectionGroup>

                <SectionGroup label="Con iconos">
                  <div className="flex flex-wrap gap-3">
                    <Button><Plus className="h-4 w-4" /> Nuevo</Button>
                    <Button variant="outline"><Download className="h-4 w-4" /> Exportar</Button>
                    <Button variant="destructive"><Trash2 className="h-4 w-4" /> Eliminar</Button>
                    <Button variant="ghost"><Settings className="h-4 w-4" /> Configurar</Button>
                  </div>
                </SectionGroup>

                <SectionGroup label="Estados">
                  <div className="flex flex-wrap gap-3">
                    <Button disabled>Disabled</Button>
                    <Button disabled><Loader2 className="h-4 w-4 animate-spin" /> Cargando...</Button>
                  </div>
                </SectionGroup>
              </div>
            </Section>

            {/* BADGES */}
            <Section id="badges" title="Badges" description="Indicadores visuales de estado y categorias">
              <div className="space-y-6">
                <SectionGroup label="Variantes">
                  <div className="flex flex-wrap gap-3">
                    <Badge variant="default">Default</Badge>
                    <Badge variant="secondary">Secondary</Badge>
                    <Badge variant="destructive">Destructive</Badge>
                    <Badge variant="success">Success</Badge>
                    <Badge variant="outline">Outline</Badge>
                  </div>
                </SectionGroup>

                <SectionGroup label="Uso contextual">
                  <div className="flex flex-wrap gap-3">
                    <Badge variant="success">Confirmada</Badge>
                    <Badge variant="default">En proceso</Badge>
                    <Badge className="bg-yellow-100 text-yellow-800">Pendiente</Badge>
                    <Badge variant="destructive">Cancelada</Badge>
                    <Badge variant="outline">Borrador</Badge>
                    <Badge variant="secondary">Archivada</Badge>
                  </div>
                </SectionGroup>
              </div>
            </Section>

            {/* INPUTS & FORMS */}
            <Section id="inputs" title="Inputs & Forms" description="Elementos de formulario para captura de datos">
              <div className="space-y-6">
                <SectionGroup label="Text Inputs">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nombre</Label>
                      <Input id="name" placeholder="Maria Lopez" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" placeholder="maria@email.com" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="disabled">Deshabilitado</Label>
                      <Input id="disabled" disabled value="Valor fijo" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="search">Busqueda con icono</Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input id="search" className="pl-9" placeholder="Buscar..." />
                      </div>
                    </div>
                  </div>
                </SectionGroup>

                <SectionGroup label="Textarea">
                  <div className="max-w-md space-y-2">
                    <Label htmlFor="notes">Notas</Label>
                    <Textarea id="notes" placeholder="Escriba sus notas aqui..." rows={3} />
                  </div>
                </SectionGroup>

                <SectionGroup label="Select">
                  <div className="max-w-xs space-y-2">
                    <Label>Moneda</Label>
                    <Select defaultValue="USD">
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ARS">ARS - Peso Argentino</SelectItem>
                        <SelectItem value="USD">USD - Dolar</SelectItem>
                        <SelectItem value="EUR">EUR - Euro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </SectionGroup>

                <SectionGroup label="Controles">
                  <div className="space-y-4 max-w-md">
                    <div className="flex items-center gap-3">
                      <Checkbox id="terms" />
                      <Label htmlFor="terms">Acepto los terminos y condiciones</Label>
                    </div>
                    <div className="flex items-center gap-3">
                      <Switch id="notifications" />
                      <Label htmlFor="notifications">Activar notificaciones</Label>
                    </div>
                    <div className="space-y-2">
                      <Label>Metodo de pago</Label>
                      <RadioGroup defaultValue="transfer">
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="transfer" id="transfer" />
                          <Label htmlFor="transfer">Transferencia</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="cash" id="cash" />
                          <Label htmlFor="cash">Efectivo</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="card" id="card" />
                          <Label htmlFor="card">Tarjeta</Label>
                        </div>
                      </RadioGroup>
                    </div>
                  </div>
                </SectionGroup>
              </div>
            </Section>

            {/* CARDS */}
            <Section id="cards" title="Cards" description="Contenedores para agrupar informacion relacionada">
              <div className="space-y-6">
                <SectionGroup label="Card basica">
                  <div className="max-w-md">
                    <Card>
                      <CardHeader>
                        <CardTitle>Operacion Cancun</CardTitle>
                        <CardDescription>Paquete turistico all-inclusive para 2 adultos</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Destino</span>
                            <span>Cancun, Mexico</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Fecha salida</span>
                            <span>15 Mar 2026</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Venta total</span>
                            <span className="font-semibold">USD 2.500</span>
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter className="flex justify-between">
                        <Badge variant="success">Confirmada</Badge>
                        <Button variant="outline" size="sm">Ver detalle</Button>
                      </CardFooter>
                    </Card>
                  </div>
                </SectionGroup>

                <SectionGroup label="Cards de estadisticas (estilo dashboard)">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-muted-foreground">Operaciones</p>
                          <Plane className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-bold mt-1">24</p>
                        <p className="text-xs text-success mt-1">+12% vs mes anterior</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-muted-foreground">Ventas</p>
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-bold mt-1">USD 45.200</p>
                        <p className="text-xs text-muted-foreground mt-1">Margen: USD 12.800</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-muted-foreground">Clientes</p>
                          <Users className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-bold mt-1">156</p>
                        <p className="text-xs text-success mt-1">+3 nuevos esta semana</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-muted-foreground">Margen Promedio</p>
                          <Star className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-bold mt-1">28.3%</p>
                        <p className="text-xs text-destructive mt-1">-2.1% vs mes anterior</p>
                      </CardContent>
                    </Card>
                  </div>
                </SectionGroup>
              </div>
            </Section>

            {/* TABLES */}
            <Section id="tables" title="Tablas" description="Presentacion de datos tabulares">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Destino</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Fecha Salida</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">Cancun</TableCell>
                    <TableCell>Maria Lopez</TableCell>
                    <TableCell>15/03/2026</TableCell>
                    <TableCell><Badge variant="success">Confirmada</Badge></TableCell>
                    <TableCell className="text-right">USD 2.500</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Bariloche</TableCell>
                    <TableCell>Juan Perez</TableCell>
                    <TableCell>20/04/2026</TableCell>
                    <TableCell><Badge className="bg-yellow-100 text-yellow-800">Pendiente</Badge></TableCell>
                    <TableCell className="text-right">ARS 850.000</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Rio de Janeiro</TableCell>
                    <TableCell>Ana Garcia</TableCell>
                    <TableCell>01/05/2026</TableCell>
                    <TableCell><Badge variant="default">Pre-reserva</Badge></TableCell>
                    <TableCell className="text-right">USD 3.200</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Miami</TableCell>
                    <TableCell>Carlos Rodriguez</TableCell>
                    <TableCell>10/06/2026</TableCell>
                    <TableCell><Badge variant="destructive">Cancelada</Badge></TableCell>
                    <TableCell className="text-right">USD 1.800</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </Section>

            {/* NAVIGATION */}
            <Section id="navigation" title="Navegacion" description="Componentes para guiar al usuario por el sistema">
              <div className="space-y-6">
                <SectionGroup label="Tabs">
                  <Tabs defaultValue="ventas" className="max-w-md">
                    <TabsList>
                      <TabsTrigger value="ventas">Ventas</TabsTrigger>
                      <TabsTrigger value="margenes">Margenes</TabsTrigger>
                      <TabsTrigger value="cashflow">Flujo de Caja</TabsTrigger>
                    </TabsList>
                    <TabsContent value="ventas" className="p-4 border rounded-md mt-2">
                      Contenido del tab Ventas
                    </TabsContent>
                    <TabsContent value="margenes" className="p-4 border rounded-md mt-2">
                      Contenido del tab Margenes
                    </TabsContent>
                    <TabsContent value="cashflow" className="p-4 border rounded-md mt-2">
                      Contenido del tab Flujo de Caja
                    </TabsContent>
                  </Tabs>
                </SectionGroup>

                <SectionGroup label="Breadcrumb">
                  <Breadcrumb>
                    <BreadcrumbList>
                      <BreadcrumbItem>
                        <BreadcrumbLink href="#">Dashboard</BreadcrumbLink>
                      </BreadcrumbItem>
                      <BreadcrumbSeparator />
                      <BreadcrumbItem>
                        <BreadcrumbLink href="#">Operaciones</BreadcrumbLink>
                      </BreadcrumbItem>
                      <BreadcrumbSeparator />
                      <BreadcrumbItem>
                        <BreadcrumbPage>Cancun - Maria Lopez</BreadcrumbPage>
                      </BreadcrumbItem>
                    </BreadcrumbList>
                  </Breadcrumb>
                </SectionGroup>
              </div>
            </Section>

            {/* FEEDBACK */}
            <Section id="feedback" title="Feedback" description="Componentes de comunicacion con el usuario">
              <div className="space-y-6">
                <SectionGroup label="Toast (Sonner)">
                  <div className="flex flex-wrap gap-3">
                    <Button variant="outline" onClick={() => toast.success("Operacion guardada correctamente")}>
                      Toast Success
                    </Button>
                    <Button variant="outline" onClick={() => toast.error("Error al guardar la operacion")}>
                      Toast Error
                    </Button>
                    <Button variant="outline" onClick={() => toast.info("Se envio un email de confirmacion")}>
                      Toast Info
                    </Button>
                    <Button variant="outline" onClick={() => toast.warning("El pago vence manana")}>
                      Toast Warning
                    </Button>
                  </div>
                </SectionGroup>

                <SectionGroup label="Alert Dialog">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive"><Trash2 className="h-4 w-4" /> Eliminar operacion</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Eliminar operacion?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta accion no se puede deshacer. Se eliminara la operacion y todos sus datos asociados.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          Eliminar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </SectionGroup>

                <SectionGroup label="Progress">
                  <div className="max-w-md space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Progreso de carga</span>
                        <span>65%</span>
                      </div>
                      <Progress value={65} />
                    </div>
                  </div>
                </SectionGroup>

                <SectionGroup label="Skeleton Loading">
                  <div className="max-w-sm space-y-3">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                    <Skeleton className="h-20 w-full" />
                  </div>
                </SectionGroup>
              </div>
            </Section>

            {/* OVERLAYS */}
            <Section id="overlays" title="Overlays" description="Dialogs, sheets, popovers y tooltips">
              <div className="space-y-6">
                <SectionGroup label="Dialog">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline"><Plus className="h-4 w-4" /> Nueva operacion</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Nueva Operacion</DialogTitle>
                        <DialogDescription>Complete los datos para crear una nueva operacion turistica.</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>Destino</Label>
                          <Input placeholder="Ej: Cancun, Mexico" />
                        </div>
                        <div className="space-y-2">
                          <Label>Monto de venta</Label>
                          <Input type="number" placeholder="2500" />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline">Cancelar</Button>
                        <Button>Crear operacion</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </SectionGroup>

                <SectionGroup label="Sheet (Panel lateral)">
                  <Sheet>
                    <SheetTrigger asChild>
                      <Button variant="outline">Abrir panel lateral</Button>
                    </SheetTrigger>
                    <SheetContent>
                      <SheetHeader>
                        <SheetTitle>Detalle del cliente</SheetTitle>
                        <SheetDescription>Informacion completa del cliente seleccionado.</SheetDescription>
                      </SheetHeader>
                      <div className="py-6 space-y-4">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback>ML</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">Maria Lopez</p>
                            <p className="text-sm text-muted-foreground">maria@email.com</p>
                          </div>
                        </div>
                        <Separator />
                        <div className="space-y-2 text-sm">
                          <div className="flex gap-2"><Phone className="h-4 w-4 text-muted-foreground" /> +54 9 11 5555-1234</div>
                          <div className="flex gap-2"><MapPin className="h-4 w-4 text-muted-foreground" /> Buenos Aires, Argentina</div>
                          <div className="flex gap-2"><Calendar className="h-4 w-4 text-muted-foreground" /> Cliente desde Feb 2026</div>
                        </div>
                      </div>
                    </SheetContent>
                  </Sheet>
                </SectionGroup>

                <SectionGroup label="Dropdown Menu">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem><Edit className="h-4 w-4 mr-2" /> Editar</DropdownMenuItem>
                      <DropdownMenuItem><Download className="h-4 w-4 mr-2" /> Exportar</DropdownMenuItem>
                      <DropdownMenuItem><Mail className="h-4 w-4 mr-2" /> Enviar email</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive"><Trash2 className="h-4 w-4 mr-2" /> Eliminar</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </SectionGroup>

                <SectionGroup label="Tooltip & Popover">
                  <div className="flex gap-4">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="icon"><Bell className="h-4 w-4" /></Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>2 alertas pendientes</p>
                      </TooltipContent>
                    </Tooltip>

                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline">Popover Info</Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64">
                        <div className="space-y-2">
                          <h4 className="font-semibold text-sm">Informacion adicional</h4>
                          <p className="text-sm text-muted-foreground">
                            Este popover muestra informacion contextual al hacer clic.
                          </p>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </SectionGroup>
              </div>
            </Section>

            {/* OTHERS */}
            <Section id="others" title="Otros" description="Componentes adicionales del sistema">
              <div className="space-y-6">
                <SectionGroup label="Avatar">
                  <div className="flex gap-3 items-center">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">ML</AvatarFallback>
                    </Avatar>
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>JP</AvatarFallback>
                    </Avatar>
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="text-lg">AG</AvatarFallback>
                    </Avatar>
                  </div>
                </SectionGroup>

                <SectionGroup label="Separator">
                  <div className="max-w-md">
                    <p className="text-sm">Contenido superior</p>
                    <Separator className="my-3" />
                    <p className="text-sm">Contenido inferior</p>
                  </div>
                </SectionGroup>

                <SectionGroup label="Accordion">
                  <Accordion type="single" collapsible className="max-w-md">
                    <AccordionItem value="item-1">
                      <AccordionTrigger>Como crear una operacion?</AccordionTrigger>
                      <AccordionContent>
                        Ve a Operaciones, haz clic en &quot;Nueva operacion&quot; y completa los datos del destino, cliente y montos.
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="item-2">
                      <AccordionTrigger>Como registrar un pago?</AccordionTrigger>
                      <AccordionContent>
                        Dentro de una operacion, ve a la seccion de pagos y haz clic en &quot;Agregar pago&quot; para registrar un cobro o egreso.
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="item-3">
                      <AccordionTrigger>Que monedas soporta el sistema?</AccordionTrigger>
                      <AccordionContent>
                        El sistema soporta ARS (Peso Argentino) y USD (Dolar Estadounidense) con tipo de cambio automatico.
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </SectionGroup>

                <SectionGroup label="Slider">
                  <div className="max-w-sm space-y-2">
                    <Label>Comision (%)</Label>
                    <Slider defaultValue={[15]} max={100} step={1} />
                  </div>
                </SectionGroup>
              </div>
            </Section>

          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
