import { createServerClient } from "@/lib/supabase/server"
import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Cliente admin para operaciones server-side
const supabaseAdmin = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const origin = requestUrl.origin

  if (!supabaseAdmin) {
    console.error("❌ Missing Supabase Service Role Key")
    return NextResponse.redirect(`${origin}/login?error=config_error`)
  }

  if (code) {
    const supabase = await createServerClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // Verificar si el usuario ya existe en nuestra BD
      const { data: { user: authUser } } = await supabase.auth.getUser()
      
      if (authUser) {
        const { data: existingUser } = await supabaseAdmin
          .from("users")
          .select("id, role, is_active")
          .eq("auth_id", authUser.id)
          .maybeSingle()

        // Si el usuario no existe (primera vez con OAuth), crear agencia automáticamente
        if (!existingUser) {
          // Obtener información del usuario desde metadata o email
          const userName = authUser.user_metadata?.name || authUser.user_metadata?.full_name || authUser.email?.split("@")[0] || "Usuario"
          const userEmail = authUser.email!
          
          // Crear agencia con nombre default (se puede cambiar en onboarding)
          const { data: agencyData, error: agencyError } = await supabaseAdmin
            .from("agencies")
            .insert({
              name: `${userName}'s Agency`,
              city: "Buenos Aires",
              timezone: "America/Argentina/Buenos_Aires",
            })
            .select()
            .single()

          if (!agencyError && agencyData) {
            // Crear usuario como SUPER_ADMIN
            const { data: userData, error: userError } = await supabaseAdmin
              .from("users")
              .insert({
                auth_id: authUser.id,
                name: userName,
                email: userEmail,
                role: "SUPER_ADMIN",
                is_active: true,
              })
              .select()
              .single()

            if (!userError && userData) {
              // Vincular usuario a agencia
              await supabaseAdmin.from("user_agencies").insert({
                user_id: userData.id,
                agency_id: agencyData.id,
              })

              // Crear tenant_branding, settings, etc. (similar a signup)
              await supabaseAdmin.from("tenant_branding").insert({
                agency_id: agencyData.id,
                brand_name: `${userName}'s Agency`,
              })

              await supabaseAdmin.from("customer_settings").insert({ agency_id: agencyData.id })
              await supabaseAdmin.from("operation_settings").insert({ agency_id: agencyData.id })
              await supabaseAdmin.from("financial_settings").insert({ agency_id: agencyData.id })

              // Redirigir a onboarding para completar la configuración
              return NextResponse.redirect(`${origin}/onboarding`)
            }
          }
        } else if (existingUser && existingUser.is_active) {
          // Usuario existe y está activo, redirigir al dashboard
          return NextResponse.redirect(`${origin}/dashboard`)
        }
      }
    }
  }

  // Si hay error o el flujo no se completó, redirigir al login
  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
