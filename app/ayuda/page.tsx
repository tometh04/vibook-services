import Link from "next/link"
import Image from "next/image"
import fs from "fs"
import path from "path"
import {
  ArrowLeft,
  BookOpen,
  LayoutList,
  LifeBuoy,
  MessageCircle,
  CheckCircle2,
  Target,
  Compass,
  Rocket,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

interface ScreenshotPin {
  x: number
  y: number
  label: string
}

interface ScreenshotBlock {
  title: string
  src?: string
  pins?: ScreenshotPin[]
}

interface HelpSection {
  id: string
  title: string
  summary: string
  goal: string[]
  usage: string[]
  expected: string[]
  links?: Array<{ label: string; href: string }>
  plan?: string
  screenshot?: ScreenshotBlock
}

const sections: HelpSection[] = [
  {
    id: "vision",
    title: "Cómo leer esta guía",
    summary: "Esta ayuda explica cada vertical del sistema con foco en el resultado esperado y el valor para tu agencia.",
    goal: [
      "Entender qué resuelve cada módulo sin tecnicismos.",
      "Saber qué debería pasar cuando lo usás bien.",
      "Tener un mapa claro de la operación completa.",
    ],
    usage: [
      "Seguí el flujo recomendado desde CRM hasta Finanzas.",
      "Si tu equipo tiene roles distintos, compartí la sección específica.",
    ],
    expected: [
      "Que cualquier persona nueva pueda entender el sistema en minutos.",
      "Que el equipo trabaje con un flujo único y consistente.",
    ],
  },
  {
    id: "dashboard",
    title: "Dashboard",
    summary: "Es el panel principal. Te muestra el estado real de la agencia en segundos.",
    goal: [
      "Ver el pulso de ventas y cobros sin entrar en cada módulo.",
      "Detectar desvíos rápido y tomar decisiones antes de que se conviertan en problemas.",
    ],
    usage: [
      "Usalo como punto de arranque de cada día.",
      "Si algo baja o sube de golpe, el dashboard lo muestra primero.",
    ],
    expected: [
      "Una vista clara de lo que está pasando ahora.",
      "Entrar al módulo exacto desde un dato que te preocupa.",
    ],
    links: [{ label: "Ir al Dashboard", href: "/dashboard" }],
  },
  {
    id: "crm",
    title: "CRM (Leads y ventas)",
    summary: "Centraliza las consultas y transforma oportunidades en ventas reales.",
    goal: [
      "Que ninguna consulta se pierda.",
      "Que cada lead tenga responsable, estado y próximos pasos.",
      "Medir la conversión del equipo con datos reales.",
    ],
    usage: [
      "Creá el lead, asignalo a un vendedor y definí el estado.",
      "Usá notas y documentos para que todos tengan el contexto.",
    ],
    expected: [
      "Un pipeline claro con prioridad y seguimiento.",
      "Más ventas con menos consultas perdidas.",
    ],
    links: [{ label: "Ir al CRM", href: "/sales/leads" }],
    screenshot: {
      title: "CRM en acción",
      src: "/help/crm-leads.png",
      pins: [
        { x: 18, y: 26, label: "Estados del pipeline" },
        { x: 72, y: 22, label: "Acciones rápidas" },
        { x: 60, y: 68, label: "Detalle del lead" },
      ],
    },
  },
  {
    id: "clientes",
    title: "Clientes",
    summary: "Todo el historial del cliente en un solo lugar.",
    goal: [
      "Conocer el historial completo antes de vender.",
      "Tener contexto para resolver problemas rápido.",
    ],
    usage: [
      "Guardá datos clave, preferencias y contactos.",
      "Revisá pagos y operaciones desde el perfil.",
    ],
    expected: [
      "Atención más rápida y personalizada.",
      "Más ventas repetidas por una mejor experiencia.",
    ],
    links: [{ label: "Ir a Clientes", href: "/customers" }],
  },
  {
    id: "operaciones",
    title: "Operaciones",
    summary: "Es el corazón operativo: viajes, pasajeros, servicios, pagos y estados.",
    goal: [
      "Organizar cada venta en una operación clara.",
      "Evitar errores entre ventas, pagos y proveedores.",
    ],
    usage: [
      "Creá la operación desde un lead o desde cero.",
      "Cargá pasajeros, servicios, fechas y operadores.",
    ],
    expected: [
      "Información confiable para todo el equipo.",
      "Menos retrabajo, menos errores y mejor servicio.",
    ],
    links: [{ label: "Ir a Operaciones", href: "/operations" }],
    screenshot: {
      title: "Vista de operaciones",
      src: "/help/operations.png",
      pins: [
        { x: 12, y: 20, label: "Filtros operativos" },
        { x: 86, y: 18, label: "Nueva operación" },
        { x: 50, y: 62, label: "Listado de operaciones" },
      ],
    },
  },
  {
    id: "operadores",
    title: "Operadores",
    summary: "Gestiona proveedores, tarifas y condiciones para operar sin sorpresas.",
    goal: [
      "Tener un registro confiable de cada operador.",
      "Evitar costos ocultos o condiciones vencidas.",
    ],
    usage: [
      "Guardá datos de contacto y acuerdos clave.",
      "Asocialos a las operaciones para trazabilidad.",
    ],
    expected: [
      "Negociaciones más ordenadas.",
      "Menos riesgos en operaciones complejas.",
    ],
    links: [{ label: "Ir a Operadores", href: "/operators" }],
  },
  {
    id: "finanzas",
    title: "Finanzas (Caja)",
    summary: "Muestra el dinero real disponible y el flujo de ingresos y egresos.",
    goal: [
      "Saber cuánto hay realmente en caja.",
      "Evitar desfasajes entre ventas y pagos.",
    ],
    usage: [
      "Registrá ingresos y egresos vinculados a operaciones.",
      "Controlá pagos pendientes y vencimientos.",
    ],
    expected: [
      "Caja actualizada y decisiones financieras más seguras.",
      "Menos sorpresas al fin de mes.",
    ],
    links: [
      { label: "Ir a Caja", href: "/cash/summary" },
      { label: "Ingresos", href: "/cash/income" },
      { label: "Egresos", href: "/cash/expenses" },
    ],
    screenshot: {
      title: "Resumen financiero",
      src: "/help/cash-summary.png",
      pins: [
        { x: 18, y: 24, label: "Indicadores clave" },
        { x: 74, y: 24, label: "Saldo total" },
        { x: 50, y: 68, label: "Movimientos recientes" },
      ],
    },
  },
  {
    id: "contabilidad",
    title: "Contabilidad",
    summary: "Ordena el registro contable y la posición real de la agencia.",
    goal: [
      "Mantener el libro mayor actualizado.",
      "Tener IVA, deudas y pagos recurrentes bajo control.",
    ],
    usage: [
      "Usá el libro mayor y la posición mensual para revisar el estado real.",
      "Analizá deudores y pagos pendientes para planificar.",
    ],
    expected: [
      "Visión clara de la salud financiera.",
      "Menos trabajo manual y cierres más rápidos.",
    ],
    links: [
      { label: "Libro Mayor", href: "/accounting/ledger" },
      { label: "Posición Mensual", href: "/accounting/monthly-position" },
      { label: "Deudores", href: "/accounting/debts-sales" },
    ],
  },
  {
    id: "facturacion",
    title: "Facturación AFIP",
    summary: "Emite comprobantes para operaciones reales sin salir del sistema.",
    goal: [
      "Cumplir con AFIP desde un solo lugar.",
      "Tener trazabilidad entre venta, cobro y factura.",
    ],
    usage: [
      "Generá comprobantes desde operaciones o desde contabilidad.",
      "Verificá que los datos fiscales estén completos.",
    ],
    expected: [
      "Facturas emitidas sin errores.",
      "Menos trabajo manual y mejor control fiscal.",
    ],
    links: [{ label: "Ir a Facturación", href: "/accounting/invoicing" }],
  },
  {
    id: "reportes",
    title: "Reportes",
    summary: "Convierte datos en decisiones: ventas, cobros, performance y tendencias.",
    goal: [
      "Medir el negocio con datos reales.",
      "Detectar qué funciona y qué no en ventas y operaciones.",
    ],
    usage: [
      "Filtrá por fechas, vendedores o estado.",
      "Compará períodos para medir evolución.",
    ],
    expected: [
      "Indicadores claros y accionables.",
      "Decisiones más rápidas y menos intuición.",
    ],
    links: [{ label: "Abrir Reportes", href: "/reports" }],
    screenshot: {
      title: "Reportes clave",
      src: "/help/reports.png",
      pins: [
        { x: 20, y: 24, label: "Filtros y períodos" },
        { x: 50, y: 40, label: "KPIs principales" },
        { x: 60, y: 72, label: "Detalle por equipo" },
      ],
    },
  },
  {
    id: "mensajes",
    title: "Mensajes y alertas",
    summary: "Centraliza la comunicación operativa y evita que algo quede sin responder.",
    goal: [
      "Unificar mensajes internos y con clientes.",
      "Registrar cada conversación asociada a cliente u operación.",
    ],
    usage: [
      "Usá Mensajes para WhatsApp y Alertas para comunicación interna.",
      "Verificá siempre el estado del mensaje antes de cerrar.",
    ],
    expected: [
      "Menos pérdidas de información.",
      "Mejor seguimiento de clientes y tareas internas.",
    ],
    links: [
      { label: "Ir a Mensajes", href: "/messages" },
      { label: "Ir a Alertas", href: "/alerts" },
    ],
  },
  {
    id: "calendario",
    title: "Calendario",
    summary: "Ordena salidas, vencimientos y recordatorios en una sola vista.",
    goal: [
      "No perder fechas críticas de viajes o pagos.",
      "Tener visibilidad del mes completo.",
    ],
    usage: [
      "Usalo para planificar semanas con anticipación.",
      "Combiná con operaciones para tener el contexto completo.",
    ],
    expected: [
      "Menos urgencias de último minuto.",
      "Mejor organización del equipo.",
    ],
    links: [{ label: "Ir al Calendario", href: "/calendar" }],
    screenshot: {
      title: "Calendario operativo",
      src: "/help/calendar.png",
      pins: [
        { x: 20, y: 20, label: "Vista mensual" },
        { x: 72, y: 22, label: "Filtros rápidos" },
        { x: 45, y: 64, label: "Eventos del día" },
      ],
    },
  },
  {
    id: "templates",
    title: "Documentos y plantillas",
    summary: "Crea documentos con formato profesional y consistencia de marca.",
    goal: [
      "Estandarizar documentos para el equipo.",
      "Reducir tiempo en armado y envío.",
    ],
    usage: [
      "Elegí una plantilla y personalizala para cada operación.",
      "Actualizá los textos una vez y usalos siempre.",
    ],
    expected: [
      "Documentos limpios y coherentes.",
      "Menos errores en la comunicación con el cliente.",
    ],
    links: [{ label: "Ir a Plantillas", href: "/resources/templates" }],
  },
  {
    id: "cerebro",
    title: "Cerebro (Asistente IA)",
    summary: "Responde preguntas sobre ventas, pagos y operaciones sin que tengas que buscar datos.",
    goal: [
      "Ahorrar tiempo en análisis y seguimiento.",
      "Obtener respuestas rápidas con datos reales.",
    ],
    usage: [
      "Pedile resúmenes de ventas, cobros o estados.",
      "Usalo para decidir acciones diarias.",
    ],
    expected: [
      "Respuestas claras en segundos.",
      "Decisiones más rápidas y seguras.",
    ],
    links: [{ label: "Abrir Cerebro", href: "/tools/cerebro" }],
    plan: "Pro",
    screenshot: {
      title: "Cerebro en acción",
      src: "/help/cerebro.png",
      pins: [
        { x: 24, y: 26, label: "Acciones sugeridas" },
        { x: 52, y: 80, label: "Entrada de consulta" },
      ],
    },
  },
  {
    id: "emilia",
    title: "Emilia (Asistente de viajes)",
    summary: "Busca vuelos y hoteles sin salir de Vibook.",
    goal: [
      "Acelerar la cotización.",
      "Reducir tiempos de búsqueda para el equipo.",
    ],
    usage: [
      "Pedile vuelos u hoteles y usá los resultados para la propuesta.",
      "Guardá lo que sirve y continuá en Operaciones.",
    ],
    expected: [
      "Respuestas rápidas con opciones claras.",
      "Menos tiempo perdido en búsquedas externas.",
    ],
    links: [{ label: "Abrir Emilia", href: "/emilia" }],
    plan: "Pro",
    screenshot: {
      title: "Búsqueda con Emilia",
      src: "/help/emilia.png",
      pins: [
        { x: 30, y: 30, label: "Conversación" },
        { x: 65, y: 68, label: "Resultados" },
      ],
    },
  },
  {
    id: "configuracion",
    title: "Agencia y configuración",
    summary: "Define cómo se presenta tu marca y cómo trabaja tu equipo.",
    goal: [
      "Mantener branding y permisos claros.",
      "Evitar errores por roles mal asignados.",
    ],
    usage: [
      "Actualizá datos de agencia, branding y usuarios desde Configuración.",
      "Revisá permisos al incorporar nuevas personas.",
    ],
    expected: [
      "Equipo alineado y sin confusiones.",
      "Mayor consistencia en la experiencia del cliente.",
    ],
    links: [
      { label: "Configuración de Agencia", href: "/settings" },
      { label: "Usuarios", href: "/settings/users" },
    ],
  },
  {
    id: "suscripcion",
    title: "Suscripción y planes",
    summary: "Controla tu plan y el acceso a funcionalidades claves.",
    goal: [
      "Asegurar que el plan acompaña el crecimiento.",
      "Evitar bloqueos por falta de capacidad.",
    ],
    usage: [
      "Gestioná tu plan desde Suscripción.",
      "Si necesitás Enterprise, pedí una propuesta a medida.",
    ],
    expected: [
      "Acceso continuo a las funcionalidades necesarias.",
      "Evolución del plan alineada al negocio.",
    ],
    links: [
      { label: "Ver Suscripción", href: "/settings/billing" },
      { label: "Ver planes", href: "/pricing" },
    ],
  },
  {
    id: "soporte",
    title: "Soporte",
    summary: "Estamos para ayudarte cuando algo no sale como esperás.",
    goal: [
      "Resolver dudas rápido.",
      "Destrabar problemas sin cortar la operación.",
    ],
    usage: [
      "Escribinos con contexto y capturas si es posible.",
    ],
    expected: [
      "Respuestas claras y seguimiento hasta resolver.",
    ],
  },
]

function hasPublicImage(src?: string) {
  if (!src) return false
  const clean = src.startsWith("/") ? src.slice(1) : src
  return fs.existsSync(path.join(process.cwd(), "public", clean))
}

function AnnotatedScreenshot({ screenshot }: { screenshot: ScreenshotBlock }) {
  if (!screenshot.src || !hasPublicImage(screenshot.src)) {
    return null
  }

  return (
    <div className="rounded-xl border border-border/60 bg-card p-4">
      <p className="text-sm font-semibold mb-3">{screenshot.title}</p>
      <div className="relative overflow-hidden rounded-lg border border-border/60 bg-background">
        <Image
          src={screenshot.src}
          alt={screenshot.title}
          width={1200}
          height={750}
          className="h-auto w-full"
        />
        {screenshot.pins?.map((pin, index) => (
          <div
            key={`${pin.label}-${index}`}
            className="absolute flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground shadow-lg"
            style={{ left: `${pin.x}%`, top: `${pin.y}%`, transform: "translate(-50%, -50%)" }}
            title={pin.label}
          >
            {index + 1}
          </div>
        ))}
      </div>
      {screenshot.pins && screenshot.pins.length > 0 && (
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-xs text-muted-foreground">
          {screenshot.pins.map((pin) => (
            <li key={pin.label}>{pin.label}</li>
          ))}
        </ol>
      )}
    </div>
  )
}

export default function AyudaPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border/60 bg-muted/40">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard" className="inline-flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Volver al sistema
              </Link>
            </Button>
            <div className="h-6 w-px bg-border/60" />
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-primary/10 p-2 text-primary">
                <BookOpen className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold">Centro de ayuda</h1>
                <p className="text-sm text-muted-foreground">
                  Una guía clara, completa y orientada a resultados.
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <LayoutList className="h-4 w-4" />
            Documentación estilo GitBook, sin tecnicismos.
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-6 py-8 lg:grid-cols-[260px_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-6 space-y-4">
            <div className="rounded-xl border border-border/60 bg-card p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Secciones
              </p>
              <nav className="mt-3 space-y-2 text-sm">
                {sections.map((section) => (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    className="block rounded-lg px-2 py-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    {section.title}
                  </a>
                ))}
              </nav>
            </div>
            <div className="rounded-xl border border-border/60 bg-card p-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <LifeBuoy className="h-4 w-4 text-primary" />
                ¿Necesitás ayuda?
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Nuestro equipo responde en minutos.
              </p>
              <a
                href="https://wa.me/5493417417442?text=Hola%20Vibook,%20necesito%20ayuda"
                className="mt-3 inline-flex w-full items-center justify-center rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-xs font-medium text-primary hover:bg-primary/20"
              >
                <MessageCircle className="mr-2 h-4 w-4" />
                Escribir por WhatsApp
              </a>
            </div>
          </div>
        </aside>

        <main className="space-y-10">
          {sections.map((section) => (
            <section key={section.id} id={section.id} className="scroll-mt-24">
              <Card className="border-border/60 bg-card/70">
                <CardContent className="p-6 space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-xl font-semibold">{section.title}</h2>
                    {section.plan && (
                      <Badge variant="outline">Plan {section.plan}</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{section.summary}</p>

                  <Tabs defaultValue="goal" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="goal">
                        <Target className="mr-2 h-4 w-4" />
                        Qué resuelve
                      </TabsTrigger>
                      <TabsTrigger value="usage">
                        <Compass className="mr-2 h-4 w-4" />
                        Cómo se usa
                      </TabsTrigger>
                      <TabsTrigger value="expected">
                        <Rocket className="mr-2 h-4 w-4" />
                        Resultado esperado
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="goal">
                      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
                        {section.goal.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </TabsContent>
                    <TabsContent value="usage">
                      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
                        {section.usage.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </TabsContent>
                    <TabsContent value="expected">
                      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
                        {section.expected.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </TabsContent>
                  </Tabs>

                  {section.links && (
                    <div className="flex flex-wrap gap-2">
                      {section.links.map((link) => (
                        <Link
                          key={link.href}
                          href={link.href}
                          className="inline-flex items-center rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-foreground hover:bg-muted"
                        >
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          {link.label}
                        </Link>
                      ))}
                    </div>
                  )}

                  {section.screenshot && <AnnotatedScreenshot screenshot={section.screenshot} />}
                </CardContent>
              </Card>
            </section>
          ))}

        </main>
      </div>
    </div>
  )
}
