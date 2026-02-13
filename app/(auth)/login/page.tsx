"use client"

import Image from "next/image"
import Link from "next/link"
import { LoginForm } from "@/components/auth/login-form"
import { Plane, Globe, TrendingUp, Shield } from "lucide-react"

export default function LoginPage() {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      {/* Panel izquierdo - Hero */}
      <div className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-slate-900">
        {/* Imagen de fondo */}
        <Image
          src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=2000&q=80"
          alt="Playa paradisíaca"
          fill
          className="object-cover opacity-40"
          priority
        />
        {/* Overlay gradiente */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-slate-900/30" />

        {/* Logo arriba */}
        <div className="relative z-10 p-10">
          <Image
            src="/logo-white-2.png"
            alt="Vibook"
            width={130}
            height={44}
            className="h-9 w-auto object-contain"
            unoptimized
          />
        </div>

        {/* Contenido central */}
        <div className="relative z-10 flex-1 flex flex-col justify-center px-10">
          <h2 className="text-4xl xl:text-5xl font-bold text-white leading-tight">
            Gestioná tu agencia<br />
            de viajes con <span className="text-sky-400">Vibook</span>
          </h2>
          <p className="text-white/60 text-lg mt-4 max-w-lg">
            Operaciones, clientes, finanzas y contabilidad integrados en una sola plataforma.
          </p>
        </div>

        {/* Feature pills abajo */}
        <div className="relative z-10 p-10 pt-0">
          <div className="flex flex-wrap gap-3">
            {[
              { icon: Plane, label: "Operaciones" },
              { icon: Globe, label: "CRM & Clientes" },
              { icon: TrendingUp, label: "Finanzas" },
              { icon: Shield, label: "Contabilidad" },
            ].map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 px-4 py-2 text-sm text-white/80"
              >
                <Icon className="h-4 w-4 text-sky-400" />
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Panel derecho - Formulario de login */}
      <div className="flex flex-1 items-center justify-center p-6 md:p-10 bg-white">
        <div className="w-full max-w-md">
          {/* Logo para mobile */}
          <div className="flex justify-center mb-8 lg:hidden">
            <Link href="/" className="flex items-center">
              <Image
                src="/logo-black-2.png"
                alt="Vibook"
                width={120}
                height={40}
                className="h-10 w-auto object-contain"
                priority
                unoptimized
              />
            </Link>
          </div>
          {/* Logo para desktop */}
          <div className="hidden lg:flex justify-center mb-8">
            <Link href="/" className="flex items-center">
              <Image
                src="/logo-black-2.png"
                alt="Vibook"
                width={120}
                height={40}
                className="h-10 w-auto object-contain"
                priority
                unoptimized
              />
            </Link>
          </div>
          <LoginForm />
        </div>
      </div>
    </div>
  )
}
