import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

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

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const hostname = req.headers.get('host') || ''
  
  // Detectar si viene del subdominio admin
  const isAdminSubdomain = hostname.startsWith('admin.') || hostname === 'admin.vibook.ai'

  // Si viene del subdominio admin, solo permitir acceso a rutas /admin
  if (isAdminSubdomain) {
    // Verificar Basic Auth para el subdominio admin
    const authHeader = req.headers.get("authorization")
    
    if (!verifyBasicAuth(authHeader)) {
      // Si no tiene Basic Auth, retornar 401
      return new NextResponse(null, {
        status: 401,
        headers: {
          "WWW-Authenticate": 'Basic realm="Admin Panel - Vibook"',
        },
      })
    }

    // Si tiene Basic Auth pero no está en /admin, redirigir a /admin
    if (!pathname.startsWith('/admin')) {
      return NextResponse.redirect(new URL('/admin', req.url))
    }

    // Continuar con la verificación normal de autenticación para /admin
    // (esto se hará en el layout del admin)
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
