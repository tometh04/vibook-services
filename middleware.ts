import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Rutas públicas que no requieren autenticación
const PUBLIC_ROUTES = [
  '/login',
  '/forgot-password',
  '/auth/accept-invite',
]

// Rutas de API que tienen su propia autenticación
const API_WITH_OWN_AUTH = [
  '/api/webhooks/manychat',
  '/api/trello/webhook',
  '/api/cron/',
]

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Permitir rutas públicas
  if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // Permitir APIs con autenticación propia
  if (API_WITH_OWN_AUTH.some(route => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // Validar variables de entorno - REQUERIDAS
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

  let response = NextResponse.next({
    request: {
      headers: req.headers,
    },
  })

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
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      // Redirigir a login si no hay sesión válida
      if (!pathname.startsWith('/api/')) {
        return NextResponse.redirect(new URL('/login', req.url))
      }
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  } catch (error: any) {
    // Silenciar errores de refresh token
    if (error?.message?.includes('Refresh Token') || 
        error?.message?.includes('JWT') ||
        error?.status === 401) {
      if (!pathname.startsWith('/api/')) {
        return NextResponse.redirect(new URL('/login', req.url))
      }
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.warn('Middleware auth error:', error)
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

