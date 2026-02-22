import { NextResponse } from "next/server"
import { createAdminSupabaseClient } from "@/lib/supabase/admin"
import { getCurrentUser } from "@/lib/auth"

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ channelId: string }> }
) {
  try {
    const { user } = await getCurrentUser()
    const { channelId } = await params
    const supabase = createAdminSupabaseClient()

    // Verificar que es un canal público (no DM)
    const { data: channel } = await (supabase as any)
      .from("team_channels")
      .select("id, type")
      .eq("id", channelId)
      .single()

    if (!channel) {
      return NextResponse.json({ error: "Canal no encontrado" }, { status: 404 })
    }

    if (channel.type === "dm") {
      return NextResponse.json({ error: "No puedes unirte a un DM" }, { status: 400 })
    }

    // Unirse al canal
    const { error } = await (supabase as any)
      .from("team_channel_members")
      .upsert({ channel_id: channelId, user_id: user.id })

    if (error) {
      console.error("Error joining channel:", error)
      return NextResponse.json({ error: "Error al unirse" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in POST /api/messaging/channels/[id]/join:", error)
    return NextResponse.json({ error: "Error" }, { status: 500 })
  }
}
