import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { SignJWT } from "jose"

// Credenciales del admin
const ADMIN_EMAIL = "admin@vibook.ai"
const ADMIN_PASSWORD = "_Vibook042308"

// Secret para firmar el JWT (en producción debería estar en variables de entorno)
const JWT_SECRET = new TextEncoder().encode(
  process.env.ADMIN_JWT_SECRET || "vibook-admin-secret-key-change-in-production"
)

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()

    // Normalizar credenciales (trim para eliminar espacios)
    const normalizedEmail = email?.trim()
    const normalizedPassword = password?.trim()

    // Verificar credenciales
    if (normalizedEmail !== ADMIN_EMAIL || normalizedPassword !== ADMIN_PASSWORD) {
      console.error("Admin login failed:", { 
        receivedEmail: normalizedEmail, 
        receivedPassword: normalizedPassword ? "***" : "empty",
        expectedEmail: ADMIN_EMAIL 
      })
      return NextResponse.json(
        { error: "Credenciales incorrectas" },
        { status: 401 }
      )
    }

    // Crear JWT token
    const token = await new SignJWT({ email, role: "ADMIN" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("24h")
      .sign(JWT_SECRET)

    // Guardar token en cookie
    const cookieStore = await cookies()
    cookieStore.set("admin_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 24 horas
      path: "/",
      // No usar domain para evitar problemas con subdominios
      // La cookie funcionará en el mismo dominio donde se establece
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Admin login error:", error)
    return NextResponse.json(
      { error: "Error al iniciar sesión" },
      { status: 500 }
    )
  }
}
