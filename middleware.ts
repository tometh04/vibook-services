import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

// Rutas públicas que no requieren autenticación
const PUBLIC_ROUTES = [
  '/login',
  '/signup',
  '/forgot-password',
  '/auth/accept-invite',
  '/auth/verify-email',
  '/auth/verified',
  '/auth/callback',
  '/privacy',
  '/terms',
  '/api/webhooks', // Webhooks tienen su propia autenticación
  '/health',
]

// Rutas de API que tienen autenticación propia
const API_WITH_OWN_AUTH = [
  '/api/webhooks/manychat',
  '/api/cron/',
]

// Secret para verificar el JWT del admin
const JWT_SECRET = new TextEncoder().encode(
  process.env.ADMIN_JWT_SECRET || "vibook-admin-secret-key-change-in-production"
)

async function verifyAdminSession(cookieHeader: string | null): Promise<boolean> {
  if (!cookieHeader) return false

  try {
    const cookies = cookieHeader.split(';').map(c => c.trim())
    const adminSessionCookie = cookies.find(c => c.startsWith('admin_session='))
    
    if (!adminSessionCookie) return false

    const token = adminSessionCookie.split('=')[1]
    if (!token) return false

    await jwtVerify(token, JWT_SECRET)
    return true
  } catch {
    return false
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const hostname = req.headers.get('host') || ''
  
  // Detectar si viene del subdominio admin
  const isAdminSubdomain = hostname.startsWith('admin.') || hostname === 'admin.vibook.ai'

  // Si viene del subdominio admin
  if (isAdminSubdomain) {
    // IMPORTANTE: Permitir explícitamente /admin-login y APIs de admin sin verificación
    // Esto debe estar ANTES de cualquier otra verificación
    if (pathname === '/admin-login' || 
        pathname === '/admin/login' || // Mantener compatibilidad
        pathname.startsWith('/api/admin/login') ||
        pathname.startsWith('/api/admin/logout') ||
        pathname.startsWith('/_next') ||
        pathname.startsWith('/api/_next') ||
        pathname.startsWith('/favicon.ico')) {
      return NextResponse.next()
    }

    // Verificar sesión para todas las demás rutas
    const cookieHeader = req.headers.get('cookie')
    const hasValidSession = await verifyAdminSession(cookieHeader)

    // Si está en la raíz, SIEMPRE redirigir a /admin-login si no tiene sesión
    // o a /admin si tiene sesión
    if (pathname === '/') {
      if (hasValidSession) {
        const adminUrl = new URL('/admin', req.url)
        return NextResponse.redirect(adminUrl)
      } else {
        const loginUrl = new URL('/admin-login', req.url)
        return NextResponse.redirect(loginUrl)
      }
    }

    // Si está en /admin pero no tiene sesión, redirigir a login
    if (pathname.startsWith('/admin') && !hasValidSession) {
      const loginUrl = new URL('/admin-login', req.url)
      return NextResponse.redirect(loginUrl)
    }

    // Si tiene sesión válida, permitir acceso
    // NO aplicar verificación de Supabase para rutas admin
    return NextResponse.next()
  } else {
    // Si NO viene del subdominio admin, bloquear acceso a /admin
    if (pathname.startsWith('/admin')) {
      // Retornar 404 en lugar de redirigir para mayor seguridad
      return new NextResponse(null, { status: 404 })
    }
  }

  // Permitir rutas públicas
  if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // Permitir webhooks con autenticación propia
  if (API_WITH_OWN_AUTH.some(route => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // Validar variables de entorno
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing required Supabase environment variables')
    return NextResponse.json(
      { error: 'Server configuration error' },
      { status: 500 }
    )
  }

  let response = NextResponse.next({
    request: { headers: req.headers },
  })

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return req.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          req.cookies.set(name, value)
          response.cookies.set(name, value, options)
        })
      },
    },
  })

  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      // Redirigir a login si no hay sesión válida
      if (!pathname.startsWith('/api/')) {
        return NextResponse.redirect(new URL('/login', req.url))
      }
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  } catch (error) {
    console.error('Auth error:', error)
    if (!pathname.startsWith('/api/')) {
      return NextResponse.redirect(new URL('/login', req.url))
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
