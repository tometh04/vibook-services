import { NextResponse } from "next/server"
import { createAdminSupabaseClient } from "@/lib/supabase/admin"
import { getCurrentUser, getUserAgencies } from "@/lib/auth"

export async function GET() {
  try {
    const { user } = await getCurrentUser()
    const userAgencies = await getUserAgencies(user.id)
    const agencyId = userAgencies[0]?.agency_id

    if (!agencyId) {
      return NextResponse.json({ members: [] })
    }

    const supabase = createAdminSupabaseClient()

    // Obtener todos los usuarios de la agencia (excluyendo al usuario actual)
    const { data: agencyUsers, error } = await (supabase as any)
      .from("user_agencies")
      .select("user_id, users(id, name, email, role, is_active)")
      .eq("agency_id", agencyId)
      .neq("user_id", user.id)

    if (error) {
      console.error("Error fetching members:", error)
      return NextResponse.json({ error: "Error al obtener miembros" }, { status: 500 })
    }

    const members = (agencyUsers || [])
      .filter((ua: any) => ua.users?.is_active !== false)
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
