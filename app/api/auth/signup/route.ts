import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const runtime = 'nodejs'

// ============================================================
// Rate Limiting para prevenir abuso de trials y spam de signups
// ============================================================
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000 // 15 minutos
const MAX_SIGNUPS_PER_IP = 3 // Máximo 3 signups por IP cada 15 minutos
const MAX_SIGNUPS_PER_EMAIL_DOMAIN = 10 // Máximo 10 signups por dominio de email
const signupAttempts = new Map<string, { count: number; firstAttempt: number }>()

function checkRateLimit(ip: string, emailDomain?: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now()

  // Limpiar entradas expiradas cada 100 intentos
  if (signupAttempts.size > 100) {
    const keysToDelete: string[] = []
    signupAttempts.forEach((value, key) => {
      if (now - value.firstAttempt > RATE_LIMIT_WINDOW_MS) {
        keysToDelete.push(key)
      }
    })
    keysToDelete.forEach(key => signupAttempts.delete(key))
  }

  // Verificar por IP
  const ipKey = `ip:${ip}`
  const ipRecord = signupAttempts.get(ipKey)

  if (ipRecord) {
    if (now - ipRecord.firstAttempt > RATE_LIMIT_WINDOW_MS) {
      // Ventana expirada, resetear
      signupAttempts.set(ipKey, { count: 1, firstAttempt: now })
    } else if (ipRecord.count >= MAX_SIGNUPS_PER_IP) {
      const retryAfter = Math.ceil((RATE_LIMIT_WINDOW_MS - (now - ipRecord.firstAttempt)) / 1000)
      return { allowed: false, retryAfter }
    } else {
      ipRecord.count++
    }
  } else {
    signupAttempts.set(ipKey, { count: 1, firstAttempt: now })
  }

  // Verificar por dominio de email (previene registro masivo con emails desechables)
  if (emailDomain) {
    const domainKey = `domain:${emailDomain}`
    const domainRecord = signupAttempts.get(domainKey)

    if (domainRecord) {
      if (now - domainRecord.firstAttempt > RATE_LIMIT_WINDOW_MS) {
        signupAttempts.set(domainKey, { count: 1, firstAttempt: now })
      } else if (domainRecord.count >= MAX_SIGNUPS_PER_EMAIL_DOMAIN) {
        const retryAfter = Math.ceil((RATE_LIMIT_WINDOW_MS - (now - domainRecord.firstAttempt)) / 1000)
        return { allowed: false, retryAfter }
      } else {
        domainRecord.count++
      }
    } else {
      signupAttempts.set(domainKey, { count: 1, firstAttempt: now })
    }
  }

  return { allowed: true }
}

// Validar variables de entorno al inicio
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing Supabase environment variables")
  console.error("   NEXT_PUBLIC_SUPABASE_URL:", supabaseUrl ? "Set" : "Missing")
  console.error("   SUPABASE_SERVICE_ROLE_KEY:", supabaseServiceKey ? "Set" : "Missing")
}

// Cliente admin para operaciones server-side (solo si tenemos las variables)
let supabaseAdmin: ReturnType<typeof createClient> | null = null

if (supabaseUrl && supabaseServiceKey) {
  try {
    supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: {
          'x-client-info': 'vibook-gestion@1.0.0',
        },
      },
    })
  } catch (error) {
    console.error("❌ Error creating Supabase admin client:", error)
    supabaseAdmin = null
  }
}

export async function POST(request: Request) {
  try {
    // Verificar configuración de Supabase primero
    if (!supabaseAdmin) {
      console.error("❌ Supabase admin client not initialized")
      return NextResponse.json(
        { error: "Error de configuración del servidor. Por favor contacta al administrador." },
        { status: 500 }
      )
    }

    let body
    try {
      body = await request.json()
    } catch (parseError) {
      console.error("❌ Error parsing request body:", parseError)
      return NextResponse.json(
        { error: "Error al procesar los datos. Por favor, verifica que todos los campos estén completos." },
        { status: 400 }
      )
    }

    const { name, email, password, agencyName, city } = body

    // Validar campos requeridos
    if (!name || !email || !password || !agencyName || !city) {
      return NextResponse.json(
        { error: "Todos los campos son requeridos" },
        { status: 400 }
      )
    }

    // ============================================================
    // SEGURIDAD: Rate limiting por IP y dominio de email
    // Previene abuso de trials y registro masivo de cuentas
    // ============================================================
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || 'unknown'
    const emailDomain = email.split('@')[1]?.toLowerCase()

    const rateCheck = checkRateLimit(clientIp, emailDomain)
    if (!rateCheck.allowed) {
      console.warn(`🚨 Rate limit exceeded for signup: IP=${clientIp}, domain=${emailDomain}`)
      return NextResponse.json(
        { error: "Demasiados intentos de registro. Por favor esperá unos minutos antes de intentar nuevamente." },
        { status: 429, headers: { 'Retry-After': String(rateCheck.retryAfter || 900) } }
      )
    }

    // Validar formato de email básico
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "El formato del email no es válido" },
        { status: 400 }
      )
    }

    // Validar largo de password
    if (password.length < 6) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 6 caracteres" },
        { status: 400 }
      )
    }

    // Verificar si el email ya existe en la tabla users
    // @ts-ignore - TypeScript no tiene los tipos de Supabase generados
    const { data: existingUser } = await (supabaseAdmin
      .from("users") as any)
      .select("id, email")
      .eq("email", email)
      .maybeSingle()

    if (existingUser) {
      return NextResponse.json(
        { error: "Este email ya está registrado. Por favor, inicia sesión o usa otro email." },
        { status: 400 }
      )
    }

    // Validar que el nombre de agencia no exista (único por agencia en SaaS)
    // @ts-ignore - TypeScript no tiene los tipos de Supabase generados
    const { data: existingAgency } = await (supabaseAdmin
      .from("agencies") as any)
      .select("id, name")
      .eq("name", agencyName.trim())
      .maybeSingle()

    if (existingAgency) {
      return NextResponse.json(
        { error: `El nombre de agencia "${agencyName}" ya está en uso. Por favor, elige otro nombre.` },
        { status: 400 }
      )
    }

    // Resolver origen para el redirect del email de verificación
    const forwardedProto = request.headers.get("x-forwarded-proto")
    const forwardedHost = request.headers.get("x-forwarded-host")
    const origin =
      request.headers.get("origin") ||
      (forwardedProto && forwardedHost ? `${forwardedProto}://${forwardedHost}` : null) ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3044"

    // Crear usuario en Supabase Auth y enviar email de verificación
    // Usamos signUp para que Supabase dispare el email automáticamente
    const { data: authData, error: authError } = await supabaseAdmin.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          agency_name: agencyName,
          city,
        },
        emailRedirectTo: `${origin}/auth/verify-email?email=${encodeURIComponent(email)}`,
      },
    })

    if (authError) {
      console.error("❌ Error creating auth user:", authError)
      
      // Si el error es que el usuario ya existe
      if (authError.message?.includes("already registered") || authError.message?.includes("already been registered")) {
        return NextResponse.json(
          { error: "Este email ya está registrado. Por favor, inicia sesión o usa otro email." },
          { status: 400 }
        )
      }
      
      // Si el error es de JSON parsing (respuesta vacía/inválida)
      if (authError.message?.includes("Unexpected end of JSON input") || authError.message?.includes("JSON")) {
        console.error("❌ Supabase Auth returned invalid response. Check environment variables:")
        console.error("   NEXT_PUBLIC_SUPABASE_URL:", supabaseUrl ? "Set" : "Missing")
        console.error("   SUPABASE_SERVICE_ROLE_KEY:", supabaseServiceKey ? "Set (length: " + supabaseServiceKey.length + ")" : "Missing")
        return NextResponse.json(
          { error: "Error de configuración del servidor. Por favor contacta al administrador." },
          { status: 500 }
        )
      }
      
      return NextResponse.json(
        { error: authError.message || "Error al crear el usuario. Verifica que el email no esté registrado." },
        { status: 400 }
      )
    }
    
    if (!authData?.user) {
      console.error("❌ Auth data is missing user:", authData)
      return NextResponse.json(
        { error: "Error al crear el usuario. No se recibió respuesta del servidor." },
        { status: 500 }
      )
    }

    // Crear agencia
    // @ts-ignore - TypeScript no tiene los tipos de Supabase generados
    const { data: agencyData, error: agencyError } = await (supabaseAdmin
      .from("agencies") as any)
      .insert({
        name: agencyName,
        city,
        timezone: "America/Argentina/Buenos_Aires", // Default, se puede cambiar en onboarding
      })
      .select()
      .single()

    if (agencyError || !agencyData) {
      console.error("❌ Error creating agency:", agencyError)
      // Limpiar usuario de auth si falla crear la agencia
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json(
        { error: "Error al crear la agencia" },
        { status: 500 }
      )
    }

    // Crear usuario en tabla users como ADMIN de su agencia
    // En un SaaS, cada signup crea una agencia independiente
    // El SUPER_ADMIN es solo admin@vibook.ai (administrador del sistema)
    // @ts-ignore - TypeScript no tiene los tipos de Supabase generados
    const { data: userData, error: userError } = await (supabaseAdmin
      .from("users") as any)
      .insert({
        auth_id: authData.user.id,
        name,
        email,
        role: "ADMIN", // Signups son ADMIN, no SUPER_ADMIN
        is_active: true,
      })
      .select()
      .single()

    if (userError || !userData) {
      console.error("❌ Error creating user record:", userError)
      // Limpiar agencia y usuario de auth si falla
      // @ts-ignore - TypeScript no tiene los tipos de Supabase generados
      await (supabaseAdmin.from("agencies") as any).delete().eq("id", agencyData.id)
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json(
        { error: "Error al crear el registro de usuario" },
        { status: 500 }
      )
    }

    // Vincular usuario a agencia
    // @ts-ignore - TypeScript no tiene los tipos de Supabase generados
    const { error: linkError } = await (supabaseAdmin
      .from("user_agencies") as any)
      .insert({
        user_id: userData.id,
        agency_id: agencyData.id,
      })

    if (linkError) {
      console.error("❌ Error linking user to agency:", linkError)
      // Limpiar todo si falla el link
      // @ts-ignore - TypeScript no tiene los tipos de Supabase generados
      await (supabaseAdmin.from("users") as any).delete().eq("id", userData.id)
      // @ts-ignore - TypeScript no tiene los tipos de Supabase generados
      await (supabaseAdmin.from("agencies") as any).delete().eq("id", agencyData.id)
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json(
        { error: "Error al vincular usuario con agencia" },
        { status: 500 }
      )
    }

    // Crear tenant_branding con defaults
    // @ts-ignore - TypeScript no tiene los tipos de Supabase generados
    const { error: brandingError } = await (supabaseAdmin
      .from("tenant_branding") as any)
      .insert({
        agency_id: agencyData.id,
        brand_name: agencyName,
        app_name: agencyName,
        email_from_name: agencyName,
        palette_id: "vibook",
        // Los demás campos tienen defaults en la tabla
      })

    if (brandingError) {
      console.error("⚠️  Error creating tenant_branding:", brandingError)
      // No fallar si solo falla el branding, se puede crear después
    }

    // Crear customer_settings con defaults
    // @ts-ignore - TypeScript no tiene los tipos de Supabase generados
    const { error: customerSettingsError } = await (supabaseAdmin
      .from("customer_settings") as any)
      .insert({
        agency_id: agencyData.id,
        // Todos los campos tienen defaults
      })

    if (customerSettingsError) {
      console.error("⚠️  Error creating customer_settings:", customerSettingsError)
      // No fallar si solo falla los settings
    }

    // Crear operation_settings con defaults
    // @ts-ignore - TypeScript no tiene los tipos de Supabase generados
    const { error: operationSettingsError } = await (supabaseAdmin
      .from("operation_settings") as any)
      .insert({
        agency_id: agencyData.id,
        // Todos los campos tienen defaults
      })

    if (operationSettingsError) {
      console.error("⚠️  Error creating operation_settings:", operationSettingsError)
      // No fallar si solo falla los settings
    }

    // Crear financial_settings con defaults
    // @ts-ignore - TypeScript no tiene los tipos de Supabase generados
    const { error: financialSettingsError } = await (supabaseAdmin
      .from("financial_settings") as any)
      .insert({
        agency_id: agencyData.id,
        // Todos los campos tienen defaults
      })

    if (financialSettingsError) {
      console.error("⚠️  Error creating financial_settings:", financialSettingsError)
      // No fallar si solo falla los settings
    }

    // Supabase envía el email de verificación automáticamente con signUp.
    // El redirect vuelve a /auth/verify-email para completar el flujo.

    return NextResponse.json({
      success: true,
      message: "Cuenta creada exitosamente. Por favor verifica tu email.",
      userId: userData.id,
      agencyId: agencyData.id,
    })
  } catch (error: any) {
    console.error("❌ Error in signup:", error)
    
    // Asegurar que siempre retornamos JSON válido
    const errorMessage = error?.message || "Error al crear la cuenta"
    
    // Si el error es de validación de Supabase, extraer mensaje más claro
    if (error?.code === '23505') {
      return NextResponse.json(
        { error: "Este email ya está registrado" },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
