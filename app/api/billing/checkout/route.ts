import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { createServerClient } from "@/lib/supabase/server"
import { createPreference } from "@/lib/mercadopago/client"

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const { user } = await getCurrentUser()
    const supabase = await createServerClient()
    const body = await request.json()
    const { planId } = body

    if (!planId) {
      return NextResponse.json(
        { error: "Plan ID es requerido" },
        { status: 400 }
      )
    }

    // Obtener el plan
    // @ts-ignore - subscription_plans no está en los tipos generados todavía
    const { data: planData, error: planError } = await supabase
      .from("subscription_plans")
      .select("*")
      .eq("id", planId)
      .single()

    if (planError || !planData) {
      return NextResponse.json(
        { error: "Plan no encontrado" },
        { status: 404 }
      )
    }

    const plan = planData as any // Cast porque los tipos no están generados todavía

    // Plan FREE no requiere pago
    if (plan.name === 'FREE') {
      return NextResponse.json(
        { error: "El plan FREE ya está activo" },
        { status: 400 }
      )
    }

    // Obtener la agencia del usuario
    const { data: userAgencies, error: userAgenciesError } = await supabase
      .from("user_agencies")
      .select("agency_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle()

    if (userAgenciesError || !userAgencies) {
      return NextResponse.json(
        { error: "No se encontró la agencia del usuario" },
        { status: 404 }
      )
    }

    const agencyId = (userAgencies as any).agency_id

    // Verificar si ya tiene una suscripción activa
    const { data: existingSubscription } = await supabase
      .from("subscriptions")
      .select("id, status")
      .eq("agency_id", agencyId)
      .maybeSingle()

    // Crear preferencia de pago en Mercado Pago
    // Nota: Para suscripciones, Mercado Pago usa Preapproval, pero primero
    // necesitamos que el usuario autorice la suscripción mediante un pago inicial
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    
    const preference = await createPreference({
      items: [
        {
          title: `Suscripción ${plan.display_name} - Vibook Gestión`,
          quantity: 1,
          unit_price: plan.price_monthly
        }
      ],
      payer: {
        email: user.email,
        name: user.name
      },
      back_urls: {
        success: `${appUrl}/settings/billing?status=success`,
        failure: `${appUrl}/pricing?status=failure`,
        pending: `${appUrl}/settings/billing?status=pending`
      },
      auto_return: 'approved',
      external_reference: JSON.stringify({
        agency_id: agencyId,
        plan_id: planId,
        user_id: user.id
      }),
      notification_url: `${appUrl}/api/billing/webhook`
    })

    // Guardar preference_id en la suscripción (si existe) o crear una nueva
    // subscriptions table no está en tipos generados todavía, usar as any
    if (existingSubscription) {
      await (supabase
        .from("subscriptions") as any)
        .update({
          mp_preference_id: preference.id,
          updated_at: new Date().toISOString()
        })
        .eq("id", (existingSubscription as any).id)
    } else {
      // Crear suscripción pendiente
      await (supabase
        .from("subscriptions") as any)
        .insert({
          agency_id: agencyId,
          plan_id: planId,
          mp_preference_id: preference.id,
          status: 'TRIAL',
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          billing_cycle: 'MONTHLY'
        })
    }

    return NextResponse.json({ 
      preferenceId: preference.id,
      initPoint: preference.init_point, // URL para redirigir al usuario
      sandboxInitPoint: preference.sandbox_init_point // URL para testing
    })
  } catch (error: any) {
    console.error("Error in POST /api/billing/checkout:", error)
    return NextResponse.json(
      { error: error.message || "Error al crear la preferencia de pago" },
      { status: 500 }
    )
  }
}
