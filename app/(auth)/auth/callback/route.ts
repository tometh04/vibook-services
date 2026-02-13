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

export const runtime = 'nodejs'

export async function GET(request: Request) {
  try {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get("code")
    const error = requestUrl.searchParams.get("error")
    const errorDescription = requestUrl.searchParams.get("error_description")
    const origin = requestUrl.origin

    // Manejar errores de OAuth
    if (error) {
      console.error("❌ OAuth error:", error, errorDescription)
      return NextResponse.redirect(`${origin}/login?error=oauth_error&message=${encodeURIComponent(errorDescription || error)}`)
    }

    if (!supabaseAdmin) {
      console.error("❌ Missing Supabase Service Role Key")
      return NextResponse.redirect(`${origin}/login?error=config_error`)
    }

    if (!code) {
      console.error("❌ No code parameter in callback")
      return NextResponse.redirect(`${origin}/login?error=no_code`)
    }

    const supabase = await createServerClient()
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
    
    if (exchangeError) {
      console.error("❌ Error exchanging code for session:", exchangeError)
      return NextResponse.redirect(`${origin}/login?error=exchange_error&message=${encodeURIComponent(exchangeError.message)}`)
    }
    
    const { data: { user: authUser }, error: getUserError } = await supabase.auth.getUser()
    
    if (getUserError || !authUser) {
      console.error("❌ Error getting user after exchange:", getUserError)
      return NextResponse.redirect(`${origin}/login?error=get_user_error`)
    }

    // Verificar si el usuario ya existe en nuestra BD
    // @ts-ignore - TypeScript no tiene los tipos de Supabase generados
    const { data: existingUser, error: existingUserError } = await (supabaseAdmin
      .from("users") as any)
      .select("id, role, is_active")
      .eq("auth_id", authUser.id)
      .maybeSingle()

    if (existingUserError) {
      console.error("❌ Error checking existing user:", existingUserError)
    }

    // Si el usuario no existe (primera vez con OAuth), crear agencia automáticamente
    if (!existingUser) {
      // Obtener información del usuario desde metadata o email
      const userName = authUser.user_metadata?.name || authUser.user_metadata?.full_name || authUser.email?.split("@")[0] || "Usuario"
      const userEmail = authUser.email!
      
      // Crear agencia con nombre default (se puede cambiar en onboarding)
      // @ts-ignore - TypeScript no tiene los tipos de Supabase generados
      const { data: agencyData, error: agencyError } = await (supabaseAdmin
        .from("agencies") as any)
        .insert({
          name: `${userName}'s Agency`,
          city: "Buenos Aires",
          timezone: "America/Argentina/Buenos_Aires",
        })
        .select()
        .single()

      if (!agencyError && agencyData) {
        // Crear usuario como ADMIN (el SUPER_ADMIN es solo admin@vibook.ai)
        // @ts-ignore - TypeScript no tiene los tipos de Supabase generados
        const { data: userData, error: userError } = await (supabaseAdmin
          .from("users") as any)
          .insert({
            auth_id: authUser.id,
            name: userName,
            email: userEmail,
            role: "ADMIN",
            is_active: true,
          })
          .select()
          .single()

        if (!userError && userData) {
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
          }

          // Crear tenant_branding, settings, etc. (similar a signup)
          try {
            // @ts-ignore - TypeScript no tiene los tipos de Supabase generados
            const { error: brandingError } = await (supabaseAdmin
              .from("tenant_branding") as any)
              .insert({
                agency_id: agencyData.id,
                brand_name: `${userName}'s Agency`,
                app_name: `${userName}'s Agency`,
                email_from_name: `${userName}'s Agency`,
                palette_id: "vibook",
              })
            if (brandingError) console.error("⚠️ Error creating branding:", brandingError)
          } catch (err) {
            console.error("⚠️ Error creating branding:", err)
          }

          try {
            // @ts-ignore - TypeScript no tiene los tipos de Supabase generados
            const { error: customerSettingsError } = await (supabaseAdmin
              .from("customer_settings") as any)
              .insert({ agency_id: agencyData.id })
            if (customerSettingsError) console.error("⚠️ Error creating customer settings:", customerSettingsError)
          } catch (err) {
            console.error("⚠️ Error creating customer settings:", err)
          }
          
          try {
            // @ts-ignore - TypeScript no tiene los tipos de Supabase generados
            const { error: operationSettingsError } = await (supabaseAdmin
              .from("operation_settings") as any)
              .insert({ agency_id: agencyData.id })
            if (operationSettingsError) console.error("⚠️ Error creating operation settings:", operationSettingsError)
          } catch (err) {
            console.error("⚠️ Error creating operation settings:", err)
          }
          
          try {
            // @ts-ignore - TypeScript no tiene los tipos de Supabase generados
            const { error: financialSettingsError } = await (supabaseAdmin
              .from("financial_settings") as any)
              .insert({ agency_id: agencyData.id })
            if (financialSettingsError) console.error("⚠️ Error creating financial settings:", financialSettingsError)
          } catch (err) {
            console.error("⚠️ Error creating financial settings:", err)
          }

              // Redirigir a paywall para elegir plan
              return NextResponse.redirect(`${origin}/paywall`)
        } else {
          console.error("❌ Error creating user:", userError)
        }
      } else {
        console.error("❌ Error creating agency:", agencyError)
      }
    } else if (existingUser && existingUser.is_active) {
      // Usuario existe y está activo - verificar suscripción antes de redirigir
      // Buscar la agencia del usuario
      const { data: userAgency } = await (supabaseAdmin
        .from("user_agencies") as any)
        .select("agency_id")
        .eq("user_id", existingUser.id)
        .limit(1)
        .maybeSingle()

      if (userAgency?.agency_id) {
        // Verificar si tiene suscripción activa
        const { data: subscription } = await (supabaseAdmin
          .from("subscriptions") as any)
          .select("id, status, trial_end, plan:subscription_plans(name)")
          .eq("agency_id", userAgency.agency_id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()

        if (!subscription) {
          // Sin suscripción → paywall
          return NextResponse.redirect(`${origin}/paywall`)
        }

        const subStatus = subscription.status as string
        const planName = subscription.plan?.name as string

        // TESTER siempre tiene acceso
        if (planName === 'TESTER') {
          return NextResponse.redirect(`${origin}/dashboard`)
        }

        // ACTIVE tiene acceso
        if (subStatus === 'ACTIVE') {
          return NextResponse.redirect(`${origin}/dashboard`)
        }

        // TRIAL solo si no expiró
        if (subStatus === 'TRIAL') {
          const trialEnd = subscription.trial_end ? new Date(subscription.trial_end) : null
          if (!trialEnd || trialEnd >= new Date()) {
            return NextResponse.redirect(`${origin}/dashboard`)
          }
          // Trial expirado → paywall
          return NextResponse.redirect(`${origin}/paywall?trial_expired=true`)
        }

        // Cualquier otro estado (CANCELED, SUSPENDED, UNPAID, PAST_DUE) → paywall
        return NextResponse.redirect(`${origin}/paywall?status=${subStatus.toLowerCase()}`)
      }

      // Sin agencia (caso raro) → dashboard
      return NextResponse.redirect(`${origin}/dashboard`)
    } else if (existingUser && !existingUser.is_active) {
      return NextResponse.redirect(`${origin}/login?error=account_inactive`)
    }

    // Si llegamos aquí sin redirigir, algo salió mal
    return NextResponse.redirect(`${origin}/login?error=auth_failed`)
  } catch (error: any) {
    console.error("❌ Unexpected error in callback:", error)
    const origin = new URL(request.url).origin
    return NextResponse.redirect(`${origin}/login?error=unexpected_error&message=${encodeURIComponent(error?.message || 'Error desconocido')}`)
  }
}
