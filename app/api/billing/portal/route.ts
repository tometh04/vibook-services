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

    // Obtener el customer ID de Stripe
    const { data: subscription, error: subscriptionError } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("agency_id", agencyId)
      .maybeSingle()

    if (subscriptionError || !subscription?.stripe_customer_id) {
      return NextResponse.json(
        { error: "No se encontró una suscripción activa" },
        { status: 404 }
      )
    }

    // Crear sesión del customer portal
    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing`,
    })

    return NextResponse.json({ url: session.url })
  } catch (error: any) {
    console.error("Error in POST /api/billing/portal:", error)
    return NextResponse.json(
      { error: error.message || "Error al crear la sesión del portal" },
      { status: 500 }
    )
  }
}
