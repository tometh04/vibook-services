import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  // Middleware mínimo - solo permitir todo por ahora para debug
  // Una vez que funcione, agregaremos la lógica de autenticación
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
