import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import Stripe from "stripe"
import { createClient } from "@supabase/supabase-js"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia",
})

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const body = await request.text()
  const signature = request.headers.get("stripe-signature")!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message)
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 }
    )
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        await handleCheckoutCompleted(session)
        break
      }
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionUpdated(subscription)
        break
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionDeleted(subscription)
        break
      }
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice
        await handlePaymentSucceeded(invoice)
        break
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice
        await handlePaymentFailed(invoice)
        break
      }
      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error("Error processing webhook:", error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const agencyId = session.metadata?.agency_id
  const planId = session.metadata?.plan_id
  const billingCycle = session.metadata?.billing_cycle || 'MONTHLY'

  if (!agencyId || !planId) {
    throw new Error("Missing metadata in checkout session")
  }

  // Obtener la suscripción de Stripe
  const subscriptionId = session.subscription as string
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)

  // Actualizar o crear suscripción en nuestra BD
  const { data: existingSubscription } = await supabaseAdmin
    .from("subscriptions")
    .select("id")
    .eq("agency_id", agencyId)
    .maybeSingle()

  const subscriptionData = {
    agency_id: agencyId,
    plan_id: planId,
    stripe_subscription_id: subscriptionId,
    stripe_customer_id: subscription.customer as string,
    stripe_status: subscription.status,
    status: mapStripeStatusToOurStatus(subscription.status),
    current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    trial_start: subscription.trial_start ? new Date(subscription.trial_start * 1000).toISOString() : null,
    trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
    billing_cycle: billingCycle,
    updated_at: new Date().toISOString(),
  }

  if (existingSubscription) {
    await supabaseAdmin
      .from("subscriptions")
      .update(subscriptionData)
      .eq("id", existingSubscription.id)
  } else {
    await supabaseAdmin
      .from("subscriptions")
      .insert(subscriptionData)
  }

  // Registrar evento
  await supabaseAdmin
    .from("billing_events")
    .insert({
      agency_id: agencyId,
      event_type: "SUBSCRIPTION_CREATED",
      stripe_event_id: session.id,
      metadata: { subscription_id: subscriptionId },
    })
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const { data: existingSubscription } = await supabaseAdmin
    .from("subscriptions")
    .select("id, agency_id")
    .eq("stripe_subscription_id", subscription.id)
    .maybeSingle()

  if (!existingSubscription) {
    console.warn(`Subscription ${subscription.id} not found in database`)
    return
  }

  // Actualizar suscripción
  await supabaseAdmin
    .from("subscriptions")
    .update({
      stripe_status: subscription.status,
      status: mapStripeStatusToOurStatus(subscription.status),
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
      cancel_at_period_end: subscription.cancel_at_period_end,
      updated_at: new Date().toISOString(),
    })
    .eq("id", existingSubscription.id)

  // Registrar evento
  await supabaseAdmin
    .from("billing_events")
    .insert({
      agency_id: existingSubscription.agency_id,
      subscription_id: existingSubscription.id,
      event_type: "SUBSCRIPTION_UPDATED",
      stripe_event_id: subscription.id,
      metadata: { status: subscription.status },
    })
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const { data: existingSubscription } = await supabaseAdmin
    .from("subscriptions")
    .select("id, agency_id")
    .eq("stripe_subscription_id", subscription.id)
    .maybeSingle()

  if (!existingSubscription) return

  // Actualizar suscripción a CANCELED
  await supabaseAdmin
    .from("subscriptions")
    .update({
      status: "CANCELED",
      canceled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", existingSubscription.id)

  // Registrar evento
  await supabaseAdmin
    .from("billing_events")
    .insert({
      agency_id: existingSubscription.agency_id,
      subscription_id: existingSubscription.id,
      event_type: "SUBSCRIPTION_CANCELED",
      stripe_event_id: subscription.id,
    })
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const subscriptionId = invoice.subscription as string
  if (!subscriptionId) return

  const { data: subscription } = await supabaseAdmin
    .from("subscriptions")
    .select("id, agency_id")
    .eq("stripe_subscription_id", subscriptionId)
    .maybeSingle()

  if (!subscription) return

  // Registrar evento
  await supabaseAdmin
    .from("billing_events")
    .insert({
      agency_id: subscription.agency_id,
      subscription_id: subscription.id,
      event_type: "PAYMENT_SUCCEEDED",
      stripe_invoice_id: invoice.id,
      metadata: { amount: invoice.amount_paid, currency: invoice.currency },
    })
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId = invoice.subscription as string
  if (!subscriptionId) return

  const { data: subscription } = await supabaseAdmin
    .from("subscriptions")
    .select("id, agency_id")
    .eq("stripe_subscription_id", subscriptionId)
    .maybeSingle()

  if (!subscription) return

  // Actualizar estado de suscripción
  await supabaseAdmin
    .from("subscriptions")
    .update({
      status: "PAST_DUE",
      updated_at: new Date().toISOString(),
    })
    .eq("id", subscription.id)

  // Registrar evento
  await supabaseAdmin
    .from("billing_events")
    .insert({
      agency_id: subscription.agency_id,
      subscription_id: subscription.id,
      event_type: "PAYMENT_FAILED",
      stripe_invoice_id: invoice.id,
      metadata: { amount: invoice.amount_due, currency: invoice.currency },
    })
}

function mapStripeStatusToOurStatus(stripeStatus: string): "TRIAL" | "ACTIVE" | "CANCELED" | "PAST_DUE" | "UNPAID" | "SUSPENDED" {
  switch (stripeStatus) {
    case "trialing":
      return "TRIAL"
    case "active":
      return "ACTIVE"
    case "canceled":
    case "unpaid":
      return "CANCELED"
    case "past_due":
      return "PAST_DUE"
    case "incomplete":
    case "incomplete_expired":
      return "UNPAID"
    default:
      return "SUSPENDED"
  }
}
