import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { createServerClient } from "@/lib/supabase/server"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export const dynamic = 'force-dynamic'

export default async function Home() {
  // Si viene del subdominio admin, el middleware debería redirigir
  // Pero por si acaso, verificamos aquí también
  const headersList = await headers()
  const host = headersList.get("host") || ""
  
  if (host.startsWith("admin.") || host === "admin.vibook.ai" || host.includes("admin.vibook.ai")) {
    // El middleware debería haber manejado esto, pero por si acaso redirigimos
    redirect("/admin-login")
  }
  
  // Para app.vibook.ai, mantener sesión y enviar a paywall
  if (host === "app.vibook.ai" || host.includes("app.vibook.ai")) {
    const supabase = await createServerClient()
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

    if (authError || !authUser) {
      redirect("/login")
    }

    const { data: user } = await supabase
      .from("users")
      .select("id, is_active")
      .eq("auth_id", authUser.id)
      .maybeSingle()

    if (!user || user.is_active === false) {
      redirect("/login")
    }

    redirect("/paywall")
  }
  
  // Para la app principal, mostrar landing
  return <LandingPage />
}

function LandingPage() {
  return (
    <div className="min-h-screen bg-[#f6f4ef] text-slate-900">
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-[#f6f4ef]/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/logo-black-2.png"
              alt="Vibook"
              width={120}
              height={36}
              className="h-8 w-auto"
              priority
            />
          </Link>
          <nav className="hidden items-center gap-8 text-sm font-medium text-slate-700 md:flex">
            <a href="#producto" className="transition hover:text-slate-900">Producto</a>
            <a href="#interfaz" className="transition hover:text-slate-900">Interfaz</a>
            <a href="#modulos" className="transition hover:text-slate-900">Módulos</a>
            <a href="#precios" className="transition hover:text-slate-900">Precios</a>
          </nav>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="hidden md:inline-flex">
              Ver demo
            </Button>
            <Button>
              Probar 7 días gratis
            </Button>
          </div>
        </div>
      </header>

      <main className="pb-28">
        <section id="inicio" className="relative overflow-hidden px-6 pt-16 md:pt-20">
          <div className="mx-auto grid w-full max-w-6xl items-center gap-10 md:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-6">
              <Badge className="border border-slate-200 bg-white text-slate-700">
                Para agencias de viajes
              </Badge>
              <h1 className="text-4xl font-semibold leading-tight md:text-5xl">
                Tu agencia ordenada, tus ventas en marcha.
              </h1>
              <p className="text-lg text-slate-600">
                Vibook es el sistema de gestión que entiende el ritmo real del turismo: consultas,
                operaciones, cobros y seguimiento en un solo lugar. Sin tecnicismos, sin vueltas.
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <Button className="text-base">Quiero potenciar mi agencia</Button>
                <Button variant="ghost" className="text-base">
                  Ver cómo funciona
                </Button>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                  +50 agencias activas
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -top-6 right-6 hidden rounded-full border border-slate-200 bg-white/90 px-4 py-1 text-xs font-medium text-slate-600 shadow-sm md:inline-flex">
                Diseñado para equipos de turismo
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_35px_80px_-60px_rgba(15,23,42,0.6)]">
                <div className="rounded-2xl border border-slate-200 bg-[#fbfaf8]">
                  <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 text-xs font-medium text-slate-500">
                    <span>Panel Vibook</span>
                    <span>Emilia activa</span>
                  </div>
                  <div className="space-y-4 px-4 py-5">
                    <div className="rounded-xl bg-white p-3 shadow-sm">
                      <p className="text-xs text-slate-500">Emilia</p>
                      <p className="text-sm text-slate-800">
                        Te armé 3 opciones para Bayahíbe con vuelos y hoteles incluidos. ¿Querés verlas?
                      </p>
                    </div>
                    <div className="rounded-xl bg-slate-900 p-3 text-white">
                      <p className="text-xs text-slate-300">Agente</p>
                      <p className="text-sm">Sí, mandame la mejor relación precio-calidad.</p>
                    </div>
                    <div className="rounded-xl bg-white p-3 shadow-sm">
                      <p className="text-xs text-slate-500">Emilia</p>
                      <p className="text-sm text-slate-800">
                        Listo. Te dejo la propuesta en PDF con condiciones y formas de pago.
                      </p>
                      <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                        Propuesta-Bayahibe.pdf
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-500">
                <span className="inline-flex h-5 w-3 rounded-full border border-slate-300">
                  <span className="m-auto block h-2 w-0.5 rounded-full bg-slate-400" />
                </span>
                Deslizá para conocer Vibook
              </div>
            </div>
          </div>
        </section>

        <section id="producto" className="px-6 pt-12">
          <div className="mx-auto w-full max-w-6xl">
            <div className="grid gap-6 md:grid-cols-3">
              {[
                {
                  title: "Ventas claras desde el día uno",
                  description:
                    "Todo lo que tu equipo necesita para responder rápido y hacer seguimiento real.",
                },
                {
                  title: "Operaciones sin planillas",
                  description:
                    "Reservas, pasajeros, documentos y alertas organizados por viaje.",
                },
                {
                  title: "Cobros y caja sin sorpresas",
                  description:
                    "Registrá pagos, vencimientos y margen por operación sin depender de Excel.",
                },
              ].map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <h3 className="text-lg font-semibold">{feature.title}</h3>
                  <p className="mt-2 text-sm text-slate-600">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="interfaz" className="px-6 pt-10">
          <div className="mx-auto grid w-full max-w-6xl items-center gap-10 md:grid-cols-[1fr_1fr]">
            <div className="space-y-4">
              <Badge className="border border-slate-200 bg-white text-slate-700">
                Interfaz clara
              </Badge>
              <h2 className="text-3xl font-semibold">
                Todo el flujo en un solo tablero, sin ruido.
              </h2>
              <p className="text-slate-600">
                Cada módulo está pensado para una agencia real: desde la primera consulta hasta el
                cierre del viaje. Trabajando juntos de forma seamless, sin idas y vueltas.
              </p>
              <ul className="space-y-2 text-sm text-slate-600">
                <li>• Estado de cada operación y responsables claros</li>
                <li>• Alertas automáticas para no perder fechas clave</li>
                <li>• Emilia acompañando en cada cotización</li>
              </ul>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Operaciones</span>
                  <span>Reservado</span>
                </div>
                <div className="mt-4 space-y-3">
                  {[
                    { label: "Paquete Caribe", value: "USD 5.000", status: "Pagado 40%" },
                    { label: "Europa Express", value: "USD 8.200", status: "Pendiente" },
                    { label: "Brasil Familiar", value: "USD 3.400", status: "En seguimiento" },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
                    >
                      <div>
                        <p className="font-medium text-slate-800">{item.label}</p>
                        <p className="text-xs text-slate-500">{item.status}</p>
                      </div>
                      <span className="font-semibold text-slate-800">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="modulos" className="px-6 pt-10">
          <div className="mx-auto w-full max-w-6xl">
            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <h3 className="text-2xl font-semibold">Módulos pensados para turismo</h3>
              <p className="mt-2 text-sm text-slate-600">
                Clientes, operaciones, pagos, reportes y comunicación interna. Todo conectado.
              </p>
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  "CRM y leads",
                  "Operaciones y documentos",
                  "Caja y cobranzas",
                  "Reportes de gestión",
                ].map((item) => (
                  <div
                    key={item}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="precios" className="px-6 pt-12">
          <div className="mx-auto w-full max-w-6xl">
            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-2xl font-semibold">Precios simples</h3>
                  <p className="mt-2 text-sm text-slate-600">
                    Probá Vibook 7 días gratis y elegí el plan que mejor se adapte a tu agencia.
                  </p>
                </div>
                <Button variant="outline">Ver planes</Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <div className="fixed bottom-6 left-1/2 z-30 w-[90%] max-w-3xl -translate-x-1/2 rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900">
              Listo para ordenar tu agencia y vender más viajes
            </p>
            <p className="text-xs text-slate-600">
              Activalo hoy y hacé que tu equipo trabaje en el mismo ritmo.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline">Agendar demo</Button>
            <Button>Empezar prueba</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
