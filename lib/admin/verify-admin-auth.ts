/**
 * Verificación directa de autenticación admin para rutas API
 *
 * CRÍTICO: El middleware.ts matcher excluye /api routes, por lo que
 * las rutas API bajo /api/admin/ NO son protegidas por middleware.
 * Cada ruta admin API DEBE llamar a verifyAdminAuth() al inicio.
 */
import { jwtVerify } from "jose"

const JWT_SECRET = new TextEncoder().encode(
  process.env.ADMIN_JWT_SECRET || "vibook-admin-secret-key-change-in-production"
)

export interface AdminAuthResult {
  valid: boolean
  adminId?: string
  adminEmail?: string
}

/**
 * Verifica la sesión admin directamente desde el JWT cookie.
 * Debe llamarse al inicio de TODA ruta bajo /api/admin/ (excepto login/logout).
 */
export async function verifyAdminAuth(request: Request): Promise<AdminAuthResult> {
  try {
    const cookieHeader = request.headers.get('cookie')
    if (!cookieHeader) return { valid: false }

    const cookies = cookieHeader.split(';').map(c => c.trim())
    const adminSessionCookie = cookies.find(c => c.startsWith('admin_session='))
    if (!adminSessionCookie) return { valid: false }

    const token = adminSessionCookie.substring('admin_session='.length)
    if (!token || token.length === 0) return { valid: false }

    const { payload } = await jwtVerify(token, JWT_SECRET)
    return {
      valid: true,
      adminId: (payload as any).admin_id || 'unknown',
      adminEmail: (payload as any).email || 'unknown'
    }
  } catch (error) {
    console.error('[Admin API Auth] Error verifying admin session:', error)
    return { valid: false }
  }
}

/**
 * Helper: retorna 401 si el admin no está autenticado.
 * Uso: const auth = await requireAdminAuth(request); if (auth instanceof NextResponse) return auth;
 */
export async function requireAdminAuthOrReject(request: Request): Promise<AdminAuthResult | Response> {
  const { NextResponse } = await import("next/server")
  const auth = await verifyAdminAuth(request)
  if (!auth.valid) {
    return NextResponse.json(
      { error: "No autorizado. Se requiere sesión de administrador." },
      { status: 401 }
    )
  }
  return auth
}
