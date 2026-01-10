import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { createServerClient } from "@/lib/supabase/server"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia",
})

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const { user } = await getCurrentUser()
    const supabase = await createServerClient()
    const body = await request.json()
    const { planId, billingCycle = 'MONTHLY' } = body

    if (!planId) {
      return NextResponse.json(
        { error: "Plan ID es requerido" },
        { status: 400 }
      )
    }

    // Obtener el plan
    const { data: plan, error: planError } = await supabase
      .from("subscription_plans")
      .select("*")
      .eq("id", planId)
      .single()

    if (planError || !plan) {
      return NextResponse.json(
        { error: "Plan no encontrado" },
        { status: 404 }
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

    const agencyId = userAgencies.agency_id

    // Obtener o crear customer en Stripe
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("agency_id", agencyId)
      .maybeSingle()

    let customerId = subscription?.stripe_customer_id

    if (!customerId) {
      // Crear customer en Stripe
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: {
          agency_id: agencyId,
          user_id: user.id,
        },
      })
      customerId = customer.id

      // Guardar customer ID en la suscripción
      await supabase
        .from("subscriptions")
        .update({ stripe_customer_id: customerId })
        .eq("agency_id", agencyId)
    }

    // Obtener el price ID según el ciclo de billing
    const priceId = billingCycle === 'YEARLY' 
      ? plan.stripe_price_id_yearly 
      : plan.stripe_price_id_monthly

    if (!priceId) {
      return NextResponse.json(
        { error: "El plan no tiene un precio configurado en Stripe" },
        { status: 400 }
      )
    }

    // Crear sesión de checkout
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?canceled=true`,
      metadata: {
        agency_id: agencyId,
        plan_id: planId,
        billing_cycle: billingCycle,
      },
    })

    return NextResponse.json({ 
      sessionId: session.id,
      url: session.url 
    })
  } catch (error: any) {
    console.error("Error in POST /api/billing/checkout:", error)
    return NextResponse.json(
      { error: error.message || "Error al crear la sesión de checkout" },
      { status: 500 }
    )
  }
}
