import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { createServerClient } from "@/lib/supabase/server"
import { createAdminSupabaseClient } from "@/lib/supabase/admin"
import { ONBOARDING_EVENT_SET, OnboardingEventType } from "@/lib/onboarding/events"

export const runtime = "nodejs"

export async function POST(request: Request) {
  try {
    let user: any
    try {
      const result = await getCurrentUser()
      user = result.user
    } catch (e: any) {
      if (e?.digest?.startsWith?.("NEXT_REDIRECT")) throw e
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }
    const supabase = await createServerClient()
    const admin = createAdminSupabaseClient()

    const body = await request.json()
    const event = body?.event as OnboardingEventType | undefined
    const metadata = body?.metadata ?? null

    if (!event || !ONBOARDING_EVENT_SET.has(event)) {
      return NextResponse.json(
        { error: "Evento inválido" },
        { status: 400 }
      )
    }

    const { data: userAgencies, error: agencyError } = await supabase
      .from("user_agencies")
      .select("agency_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle()

    if (agencyError || !userAgencies) {
      return NextResponse.json(
        { error: "No se encontró la agencia del usuario" },
        { status: 404 }
      )
    }

    const agencyId = (userAgencies as any).agency_id as string

    const { data: existing } = await (admin
      .from("onboarding_events") as any)
      .select("id")
      .eq("user_id", user.id)
      .eq("agency_id", agencyId)
      .eq("event_type", event)
      .maybeSingle()

    if (!existing) {
      await (admin
        .from("onboarding_events") as any)
        .insert({
          user_id: user.id,
          agency_id: agencyId,
          event_type: event,
          metadata,
        })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error?.digest?.startsWith?.("NEXT_REDIRECT")) throw error
    console.error("Error in POST /api/onboarding/track:", error)
    return NextResponse.json(
      { error: error.message || "Error al registrar evento" },
      { status: 500 }
    )
  }
}
