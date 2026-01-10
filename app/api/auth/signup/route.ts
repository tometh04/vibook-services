import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const runtime = 'nodejs'

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

    // Crear usuario en Supabase Auth
    // Intentamos crear el usuario directamente - si ya existe, Supabase nos lo dirá
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: false, // El usuario debe verificar su email
      user_metadata: {
        name,
        agency_name: agencyName,
        city,
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

    // Crear usuario en tabla users como SUPER_ADMIN de su agencia
    // @ts-ignore - TypeScript no tiene los tipos de Supabase generados
    const { data: userData, error: userError } = await (supabaseAdmin
      .from("users") as any)
      .insert({
        auth_id: authData.user.id,
        name,
        email,
        role: "SUPER_ADMIN",
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

    // Supabase envía el email de verificación automáticamente cuando creamos el usuario
    // con email_confirm: false. El email usará la redirect URL configurada en Supabase Dashboard
    // que debe ser: https://vibookservicessaas.vercel.app/auth/verified

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
