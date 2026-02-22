import { NextResponse } from "next/server"
import { createAdminSupabaseClient } from "@/lib/supabase/admin"
import { getCurrentUser } from "@/lib/auth"
import { sendPushToUser } from "@/lib/push"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ channelId: string }> }
) {
  try {
    const { user } = await getCurrentUser()
    const { channelId } = await params
    const supabase = createAdminSupabaseClient()
    const { searchParams } = new URL(request.url)

    const cursor = searchParams.get("cursor")
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100)

    // Verificar que el usuario es miembro del canal
    const { data: membership } = await (supabase as any)
      .from("team_channel_members")
      .select("id")
      .eq("channel_id", channelId)
      .eq("user_id", user.id)
      .single()

    if (!membership) {
      return NextResponse.json({ error: "No eres miembro de este canal" }, { status: 403 })
    }

    // Obtener mensajes con paginación por cursor
    let query = (supabase as any)
      .from("team_messages")
      .select("*, users:sender_id(name, email)")
      .eq("channel_id", channelId)
      .order("created_at", { ascending: false })
      .limit(limit + 1) // +1 para saber si hay más

    if (cursor) {
      // Cursor es el created_at del último mensaje cargado
      query = query.lt("created_at", cursor)
    }

    const { data: messages, error } = await query

    if (error) {
      console.error("Error fetching messages:", error)
      return NextResponse.json({ error: "Error al obtener mensajes" }, { status: 500 })
    }

    const hasMore = messages && messages.length > limit
    const result = (messages || []).slice(0, limit).map((msg: any) => ({
      id: msg.id,
      channel_id: msg.channel_id,
      sender_id: msg.sender_id,
      content: msg.content,
      created_at: msg.created_at,
      updated_at: msg.updated_at,
      sender_name: msg.users?.name || "Usuario",
      sender_email: msg.users?.email || "",
    }))

    return NextResponse.json({
      messages: result.reverse(), // Ordenar cronológicamente
      has_more: hasMore,
      next_cursor: hasMore ? result[0]?.created_at : null,
    })
  } catch (error) {
    console.error("Error in GET /api/messaging/channels/[id]/messages:", error)
    return NextResponse.json({ error: "Error al obtener mensajes" }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ channelId: string }> }
) {
  try {
    const { user } = await getCurrentUser()
    const { channelId } = await params
    const supabase = createAdminSupabaseClient()
    const body = await request.json()
    const { content } = body

    if (!content?.trim()) {
      return NextResponse.json({ error: "El mensaje no puede estar vacío" }, { status: 400 })
    }

    // Verificar que el usuario es miembro del canal
    const { data: membership } = await (supabase as any)
      .from("team_channel_members")
      .select("id")
      .eq("channel_id", channelId)
      .eq("user_id", user.id)
      .single()

    if (!membership) {
      return NextResponse.json({ error: "No eres miembro de este canal" }, { status: 403 })
    }

    // Insertar mensaje
    const { data: message, error } = await (supabase as any)
      .from("team_messages")
      .insert({
        channel_id: channelId,
        sender_id: user.id,
        content: content.trim(),
      })
      .select("*, users:sender_id(name, email)")
      .single()

    if (error) {
      console.error("Error creating message:", error)
      return NextResponse.json({ error: "Error al enviar mensaje" }, { status: 500 })
    }

    // Actualizar updated_at del canal
    await (supabase as any)
      .from("team_channels")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", channelId)

    // Obtener info del canal para push notification
    const { data: channel } = await (supabase as any)
      .from("team_channels")
      .select("name, type")
      .eq("id", channelId)
      .single()

    // Enviar push notifications a los demás miembros (fire-and-forget)
    const { data: otherMembers } = await (supabase as any)
      .from("team_channel_members")
      .select("user_id")
      .eq("channel_id", channelId)
      .neq("user_id", user.id)

    if (otherMembers && otherMembers.length > 0) {
      const pushTitle = channel?.type === "dm"
        ? `💬 ${user.name || "Alguien"}`
        : `💬 #${channel?.name || "canal"}`
      const pushBody = channel?.type === "dm"
        ? content.trim().slice(0, 100)
        : `${user.name || "Alguien"}: ${content.trim().slice(0, 80)}`

      // No esperar a que terminen los push (fire-and-forget)
      Promise.allSettled(
        otherMembers.map((m: any) =>
          sendPushToUser(supabase, m.user_id, {
            title: pushTitle,
            body: pushBody,
            url: "/tools/messaging",
            tag: `team-msg-${channelId}`,
          })
        )
      ).catch(() => {})
    }

    const result = {
      id: message.id,
      channel_id: message.channel_id,
      sender_id: message.sender_id,
      content: message.content,
      created_at: message.created_at,
      updated_at: message.updated_at,
      sender_name: message.users?.name || "Usuario",
      sender_email: message.users?.email || "",
    }

    return NextResponse.json({ message: result })
  } catch (error) {
    console.error("Error in POST /api/messaging/channels/[id]/messages:", error)
    return NextResponse.json({ error: "Error al enviar mensaje" }, { status: 500 })
  }
}
