import type { Metadata } from "next"
import "./globals.css"

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
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
