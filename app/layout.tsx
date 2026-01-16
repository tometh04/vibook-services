import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Toaster } from "sonner"

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-inter"
})

export const metadata: Metadata = {
  title: "Vibook Gestión",
  description: "Sistema de gestión para agencia de viajes",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className="dark">
      <body className={`${inter.variable} bg-[#0a0a0f] text-white`}>
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  )
}
