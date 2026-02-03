"use client"

import Image from "next/image"
import Link from "next/link"
import { LoginForm } from "@/components/auth/login-form"

export default function LoginPage() {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      {/* Panel izquierdo con branding moderno */}
      <div className="bg-[#0b1220] relative hidden lg:flex items-center justify-center overflow-hidden">
        {/* Animated background gradient orbs */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-[520px] h-[520px] bg-sky-500/20 rounded-full blur-[130px] animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-[420px] h-[420px] bg-blue-500/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: "1s" }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[640px] h-[640px] bg-cyan-400/10 rounded-full blur-[160px]" />
        </div>

        {/* Grid pattern overlay */}
        <div 
          className="absolute inset-0 opacity-[0.15]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
                             linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)`,
            backgroundSize: '60px 60px'
          }}
        />

        {/* Contenido del panel */}
        <div className="relative z-10 px-8 text-white">
          <h2 className="text-4xl font-bold mb-4 leading-tight">
            El sistema de gestión definitivo<br />
            para <span className="bg-gradient-to-r from-sky-400 via-blue-400 to-cyan-300 bg-clip-text text-transparent">AGENCIAS</span> de viajes
          </h2>
          <p className="text-slate-300 text-lg">Operaciones, clientes, finanzas y más en un solo lugar</p>
        </div>
      </div>
      {/* Login centrado a la derecha */}
      <div className="flex flex-1 items-center justify-center p-6 md:p-10 bg-white">
        <div className="w-full max-w-md">
          <div className="flex justify-center mb-8">
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
