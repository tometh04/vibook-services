import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Credenciales de Basic Auth para el panel de admin
const ADMIN_USERNAME = "admin@vibook.ai"
const ADMIN_PASSWORD = "_Vibook042308"

function verifyBasicAuth(authHeader: string | null): boolean {
  if (!authHeader || !authHeader.startsWith("Basic ")) {
    return false
  }

  try {
    const base64Credentials = authHeader.split(" ")[1]
    const credentials = Buffer.from(base64Credentials, "base64").toString("utf-8")
    const [username, password] = credentials.split(":")

    return username === ADMIN_USERNAME && password === ADMIN_PASSWORD
  } catch {
    return false
  }
}

export function middleware(request: NextRequest) {
  // Solo aplicar a rutas /admin
  if (request.nextUrl.pathname.startsWith("/admin")) {
    const authHeader = request.headers.get("authorization")

    if (!verifyBasicAuth(authHeader)) {
      return new NextResponse(null, {
        status: 401,
        headers: {
          "WWW-Authenticate": 'Basic realm="Admin Panel"',
        },
      })
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: "/admin/:path*",
}
