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

    const { error } = await (supabase as any)
      .from("team_channel_members")
      .update({ last_read_at: new Date().toISOString() })
      .eq("channel_id", channelId)
      .eq("user_id", user.id)

    if (error) {
      console.error("Error marking as read:", error)
      return NextResponse.json({ error: "Error" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in POST /api/messaging/channels/[id]/read:", error)
    return NextResponse.json({ error: "Error" }, { status: 500 })
  }
}
