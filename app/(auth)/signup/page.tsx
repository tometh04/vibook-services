import { GalleryVerticalEnd } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { SignupForm } from "@/components/auth/signup-form"

export default function SignupPage() {
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
        {/* Overlay con gradiente */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute bottom-8 left-8 right-8 text-white">
          <h2 className="text-3xl font-bold mb-2">Gestioná tu agencia de viajes</h2>
          <p className="text-white/80">Operaciones, clientes, finanzas y más en un solo lugar</p>
        </div>
      </div>
      {/* Signup centrado a la derecha */}
      <div className="flex flex-1 items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-md">
          <div className="flex justify-center gap-2 mb-8">
            <Link href="/" className="flex items-center gap-2 font-medium text-xl">
              <div className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-md">
                <GalleryVerticalEnd className="size-5" />
              </div>
              Vibook Gestión
            </Link>
          </div>
          <SignupForm />
        </div>
      </div>
    </div>
  )
}
