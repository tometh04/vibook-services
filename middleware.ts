import { NextResponse, type NextRequest } from 'next/server'

// Rutas públicas que no requieren autenticación
const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/signup',
  '/forgot-password',
  '/auth/accept-invite',
  '/auth/verify-email',
  '/auth/callback',
  '/auth/reset-password',
  '/onboarding',
]

// Rutas de API que tienen su propia autenticación
const API_WITH_OWN_AUTH = [
  '/api/webhooks/manychat',
  '/api/trello/webhook',
  '/api/cron/',
  '/api/auth/signup',
  '/api/health',
  '/api/test',
  '/api/simple',
]

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // PERMITIR RUTAS PÚBLICAS PRIMERO - Sin ningún procesamiento
  if (PUBLIC_ROUTES.some(route => pathname === route || pathname.startsWith(route + '/'))) {
    return NextResponse.next()
  }

  // PERMITIR APIs CON AUTENTICACIÓN PROPIA - Sin ningún procesamiento  
  if (API_WITH_OWN_AUTH.some(route => pathname === route || pathname.startsWith(route + '/'))) {
    return NextResponse.next()
  }

  // Para rutas protegidas, redirigir a login temporalmente
  if (!pathname.startsWith('/api/')) {
    return NextResponse.redirect(new URL('/login', req.url))
  }
  
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
