import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const runtime = 'nodejs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing Supabase environment variables")
}

// Cliente admin para operaciones server-side
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

export async function POST(request: Request) {
  try {
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

    // Verificar si el email ya existe en Supabase Auth primero
    const { data: existingAuthUser } = await supabaseAdmin.auth.admin.listUsers()
    const emailExists = existingAuthUser?.users?.some(u => u.email === email)
    
    if (emailExists) {
      return NextResponse.json(
        { error: "Este email ya está registrado. Por favor, inicia sesión o usa otro email." },
        { status: 400 }
      )
    }

    // También verificar en la tabla users por si acaso
    const { data: existingUser } = await supabaseAdmin
      .from("users")
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

    if (authError || !authData.user) {
      console.error("❌ Error creating auth user:", authError)
      return NextResponse.json(
        { error: authError?.message || "Error al crear el usuario" },
        { status: 400 }
      )
    }

    // Crear agencia
    const { data: agencyData, error: agencyError } = await supabaseAdmin
      .from("agencies")
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
    const { data: userData, error: userError } = await supabaseAdmin
      .from("users")
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
      await supabaseAdmin.from("agencies").delete().eq("id", agencyData.id)
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json(
        { error: "Error al crear el registro de usuario" },
        { status: 500 }
      )
    }

    // Vincular usuario a agencia
    const { error: linkError } = await supabaseAdmin
      .from("user_agencies")
      .insert({
        user_id: userData.id,
        agency_id: agencyData.id,
      })

    if (linkError) {
      console.error("❌ Error linking user to agency:", linkError)
      // Limpiar todo si falla el link
      await supabaseAdmin.from("users").delete().eq("id", userData.id)
      await supabaseAdmin.from("agencies").delete().eq("id", agencyData.id)
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json(
        { error: "Error al vincular usuario con agencia" },
        { status: 500 }
      )
    }

    // Crear tenant_branding con defaults
    const { error: brandingError } = await supabaseAdmin
      .from("tenant_branding")
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
    const { error: customerSettingsError } = await supabaseAdmin
      .from("customer_settings")
      .insert({
        agency_id: agencyData.id,
        // Todos los campos tienen defaults
      })

    if (customerSettingsError) {
      console.error("⚠️  Error creating customer_settings:", customerSettingsError)
      // No fallar si solo falla los settings
    }

    // Crear operation_settings con defaults
    const { error: operationSettingsError } = await supabaseAdmin
      .from("operation_settings")
      .insert({
        agency_id: agencyData.id,
        // Todos los campos tienen defaults
      })

    if (operationSettingsError) {
      console.error("⚠️  Error creating operation_settings:", operationSettingsError)
      // No fallar si solo falla los settings
    }

    // Crear financial_settings con defaults
    const { error: financialSettingsError } = await supabaseAdmin
      .from("financial_settings")
      .insert({
        agency_id: agencyData.id,
        // Todos los campos tienen defaults
      })

    if (financialSettingsError) {
      console.error("⚠️  Error creating financial_settings:", financialSettingsError)
      // No fallar si solo falla los settings
    }

    // Generar y enviar link de verificación (usamos password aquí porque aún lo tenemos)
    try {
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: "signup",
        email,
        password, // Tenemos el password aquí, lo usamos para generar el link
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/auth/verify-email`,
        },
      })

      if (linkError) {
        console.error("⚠️  Error generating verification link:", linkError)
        // No fallar si solo falla el email, el usuario puede usar reenvío
      } else if (linkData?.properties?.action_link) {
        // Aquí podrías enviar el email manualmente usando un servicio de email
        // Por ahora, Supabase debería enviarlo automáticamente cuando se genera el link
        console.log("✅ Verification link generated:", linkData.properties.action_link)
      }
    } catch (error) {
      console.error("⚠️  Error in verification email generation:", error)
      // No fallar, el usuario puede usar reenvío
    }

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
