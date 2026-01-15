import { GalleryVerticalEnd } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

import { LoginForm } from "@/components/auth/login-form"

export const dynamic = 'force-dynamic'

// Configuración de branding para la página de login
// En un SaaS con subdominios, esto se obtendría dinámicamente
const LOGIN_BRANDING = {
  appName: process.env.NEXT_PUBLIC_APP_NAME || 'Vibook Gestión',
  logoUrl: process.env.NEXT_PUBLIC_LOGO_URL || null,
}

export default function LoginPage() {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      {/* Imagen de viajes a la izquierda */}
      <div className="bg-muted relative hidden lg:block">
        <Image
          src="https://images.unsplash.com/photo-1488646953014-85cb44e25828?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2000&q=80"
          alt="Viajes"
          fill
          className="object-cover"
          priority
        />
        {/* Overlay con gradiente mejorado */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        <div className="absolute bottom-8 left-8 right-8 text-white">
          <h2 className="text-3xl font-bold mb-2 leading-tight">
            El sistema de gestión definitivo<br />
            para AGENCIAS de viajes
          </h2>
          <p className="text-white/80">Operaciones, clientes, finanzas y más en un solo lugar</p>
        </div>
      </div>
      {/* Login centrado a la derecha */}
      <div className="flex flex-1 items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-md">
          <div className="flex justify-center gap-2 mb-8">
            <Link href="/" className="flex items-center gap-2 font-medium text-xl">
              <Image 
                src="/logo-black-2.png" 
                alt="Vibook" 
                width={32} 
                height={32}
                className="size-8 object-contain"
                priority
                unoptimized
              />
              VibookServicesSaaS
            </Link>
          </div>
          <LoginForm />
        </div>
      </div>
    </div>
  )
}

