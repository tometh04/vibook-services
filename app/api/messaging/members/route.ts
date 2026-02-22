import { NextResponse } from "next/server"
import { createAdminSupabaseClient } from "@/lib/supabase/admin"
import { getCurrentUser, getUserAgencies } from "@/lib/auth"

export async function GET() {
  try {
    const { user } = await getCurrentUser()
    const userAgencies = await getUserAgencies(user.id)
    const agencyIds = userAgencies.map((ua) => ua.agency_id).filter(Boolean)

    if (agencyIds.length === 0) {
      return NextResponse.json({ members: [] })
    }

    const supabase = createAdminSupabaseClient()

    // Obtener todos los usuarios de TODAS las agencias del usuario (excluyéndose a sí mismo)
    const { data: agencyUsers, error } = await (supabase as any)
      .from("user_agencies")
      .select("user_id, agency_id, users(id, name, email, role, is_active)")
      .in("agency_id", agencyIds)
      .neq("user_id", user.id)

    if (error) {
      console.error("Error fetching members:", error)
      return NextResponse.json({ error: "Error al obtener miembros" }, { status: 500 })
    }

    // Deduplicar por user_id (un usuario puede estar en múltiples agencias)
    const seen = new Set<string>()
    const members = (agencyUsers || [])
      .filter((ua: any) => {
        if (!ua.users || ua.users.is_active === false) return false
        if (seen.has(ua.user_id)) return false
        seen.add(ua.user_id)
        return true
      })
      .map((ua: any) => ({
        id: ua.users.id,
        name: ua.users.name || ua.users.email,
        email: ua.users.email,
        role: ua.users.role,
      }))

    return NextResponse.json({ members })
  } catch (error) {
    console.error("Error in GET /api/messaging/members:", error)
    return NextResponse.json({ error: "Error al obtener miembros" }, { status: 500 })
  }
}
