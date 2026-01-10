import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

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
]

// Rutas de API que tienen su propia autenticación
const API_WITH_OWN_AUTH = [
  '/api/webhooks/manychat',
  '/api/trello/webhook',
  '/api/cron/',
  '/api/auth/signup',
  '/api/health',
  '/api/test',
]

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // PERMITIR RUTAS PÚBLICAS PRIMERO - Sin ningún procesamiento
  if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // PERMITIR APIs CON AUTENTICACIÓN PROPIA - Sin ningún procesamiento
  if (API_WITH_OWN_AUTH.some(route => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // Solo para rutas protegidas: Validar variables de entorno
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Missing required Supabase environment variables')
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }
    return NextResponse.redirect(new URL('/login?error=config', req.url))
  }

  // Crear response para cookies
  let response = NextResponse.next({
    request: {
      headers: req.headers,
    },
  })

  try {
    // Crear cliente de Supabase solo para rutas protegidas
    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
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
      }
    )

    // Verificar sesión de usuario
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      // Redirigir a login si no hay sesión válida
      if (!pathname.startsWith('/api/')) {
        return NextResponse.redirect(new URL('/login', req.url))
      }
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Usuario autenticado - permitir acceso
    return response
  } catch (error: any) {
    console.error('❌ Middleware error:', error)
    
    // Para errores de autenticación, redirigir a login
    if (error?.message?.includes('Refresh Token') || 
        error?.message?.includes('JWT') ||
        error?.status === 401) {
      if (!pathname.startsWith('/api/')) {
        return NextResponse.redirect(new URL('/login', req.url))
      }
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Para otros errores, redirigir a login o retornar error
    if (!pathname.startsWith('/api/')) {
      return NextResponse.redirect(new URL('/login?error=server', req.url))
    }
    return NextResponse.json(
      { error: 'Internal server error', message: error?.message || 'Unknown error' },
      { status: 500 }
    )
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
