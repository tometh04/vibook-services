import { NextResponse } from "next/server"
import { createAdminSupabaseClient } from "@/lib/supabase/admin"
import { getCurrentUser } from "@/lib/auth"

export async function GET() {
  try {
    const { user } = await getCurrentUser()
    const supabase = createAdminSupabaseClient()

    // Obtener membresías del usuario con last_read_at
    const { data: memberships, error } = await (supabase as any)
      .from("team_channel_members")
      .select("channel_id, last_read_at")
      .eq("user_id", user.id)

    if (error || !memberships || memberships.length === 0) {
      return NextResponse.json({ total_unread: 0 })
    }

    let totalUnread = 0

    // Para cada canal, contar mensajes después de last_read_at
    for (const m of memberships) {
      const { count } = await (supabase as any)
        .from("team_messages")
        .select("id", { count: "exact", head: true })
        .eq("channel_id", m.channel_id)
        .gt("created_at", m.last_read_at)

      totalUnread += count || 0
    }

    return NextResponse.json({ total_unread: totalUnread })
  } catch (error) {
    console.error("Error in GET /api/messaging/unread-total:", error)
    return NextResponse.json({ total_unread: 0 })
  }
}
