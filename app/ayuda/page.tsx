import Link from "next/link"
import { BookOpen, LifeBuoy, Sparkles, MessageCircle, LayoutList } from "lucide-react"

const sections = [
  {
    id: "bienvenida",
    title: "Bienvenida",
    content: [
      "Vibook Gestión está pensado para agencias que quieren ordenar ventas, operaciones y finanzas en un solo lugar.",
      "Esta guía te muestra el flujo recomendado para empezar rápido y aprovechar cada módulo según tu plan."
    ],
  },
  {
    id: "primeros-pasos",
    title: "Primeros pasos",
    content: [
      "Creá tu primer lead en el CRM.",
      "Convertí ese lead en una operación.",
      "Registrá un cobro para activar caja y reportes."
    ],
    links: [
      { label: "Ir al CRM", href: "/sales/leads" },
      { label: "Ir a Operaciones", href: "/operations" },
      { label: "Ver Reportes", href: "/reports" },
    ],
  },
  {
    id: "crm",
    title: "CRM y ventas",
    content: [
      "Usá el CRM para centralizar consultas, asignarlas a vendedores y medir conversiones.",
      "Podés adjuntar documentos y hacer seguimiento con estados personalizados."
    ],
  },
  {
    id: "operaciones",
    title: "Operaciones",
    content: [
      "Cada operación agrupa pasajeros, pagos y servicios.",
      "Recomendamos cargar operadores, fechas y estado para un control total."
    ],
  },
  {
    id: "finanzas",
    title: "Caja y contabilidad",
    content: [
      "Registrá ingresos y egresos para mantener el balance actualizado.",
      "Los pagos impactan automáticamente en los reportes y en la posición mensual."
    ],
    links: [
      { label: "Ir a Caja", href: "/cash/summary" },
      { label: "Libro Mayor", href: "/accounting/ledger" },
    ],
  },
  {
    id: "reportes",
    title: "Reportes",
    content: [
      "Obtené indicadores de ventas, cobranza y performance del equipo.",
      "Filtrá por fechas, vendedores o estado de operaciones."
    ],
    links: [
      { label: "Abrir Reportes", href: "/reports" },
    ],
  },
  {
    id: "whatsapp",
    title: "WhatsApp",
    content: [
      "Centralizá mensajes y enviá recordatorios desde operaciones o clientes.",
      "El historial queda asociado al cliente para un seguimiento completo."
    ],
    links: [
      { label: "Ir a Mensajes", href: "/messages" },
    ],
  },
  {
    id: "ia",
    title: "Asistentes IA",
    content: [
      "Cerebro responde preguntas sobre ventas, pagos y operaciones en segundos.",
      "Emilia te ayuda a buscar vuelos y hoteles dentro de la misma plataforma."
    ],
    links: [
      { label: "Abrir Cerebro", href: "/tools/cerebro" },
      { label: "Abrir Emilia", href: "/emilia" },
    ],
  },
  {
    id: "planes",
    title: "Planes y suscripción",
    content: [
      "Podés cambiar de plan cuando quieras desde Configuración → Suscripción.",
      "Si necesitás un plan Enterprise, escribinos y armamos una propuesta a medida."
    ],
    links: [
      { label: "Gestionar suscripción", href: "/settings/billing" },
      { label: "Ver planes", href: "/pricing" },
    ],
  },
  {
    id: "soporte",
    title: "Soporte",
    content: [
      "Si algo no funciona como esperás, escribinos y lo resolvemos juntos.",
    ],
    external: [
      { label: "Hablar por WhatsApp", href: "https://wa.me/5493417417442?text=Hola%20Vibook,%20necesito%20ayuda" },
    ],
  },
]

export default function AyudaPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border/60 bg-muted/40">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-2 text-primary">
              <BookOpen className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold">Centro de ayuda</h1>
              <p className="text-sm text-muted-foreground">
                Guía rápida para empezar y aprovechar cada módulo.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <LayoutList className="h-4 w-4" />
            Documentación estilo Gitbook, siempre actualizada.
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
              <div className="rounded-2xl border border-border/60 bg-card/70 p-6 shadow-sm">
                <h2 className="text-xl font-semibold">{section.title}</h2>
                <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                  {section.content.map((line, index) => (
                    <p key={index}>{line}</p>
                  ))}
                </div>
                {section.links && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {section.links.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        className="inline-flex items-center rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-foreground hover:bg-muted"
                      >
                        {link.label}
                      </Link>
                    ))}
                  </div>
                )}
                {section.external && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {section.external.map((link) => (
                      <a
                        key={link.href}
                        href={link.href}
                        className="inline-flex items-center rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/20"
                        target="_blank"
                        rel="noreferrer"
                      >
                        <Sparkles className="mr-1 h-3 w-3" />
                        {link.label}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </section>
          ))}
        </main>
      </div>
    </div>
  )
}
