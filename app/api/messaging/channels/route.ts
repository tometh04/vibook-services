import { NextResponse } from "next/server"
import { createAdminSupabaseClient } from "@/lib/supabase/admin"
import { getCurrentUser, getUserAgencies } from "@/lib/auth"

export async function GET(request: Request) {
  try {
    const { user } = await getCurrentUser()
    const userAgencies = await getUserAgencies(user.id)
    const agencyId = userAgencies[0]?.agency_id

    if (!agencyId) {
      return NextResponse.json({ channels: [] })
    }

    const supabase = createAdminSupabaseClient()
    const { searchParams } = new URL(request.url)
    const typeFilter = searchParams.get("type") // 'channel' | 'dm' | null

    // Obtener canales donde el usuario es miembro
    let query = (supabase as any)
      .from("team_channel_members")
      .select("channel_id, last_read_at, team_channels(*)")
      .eq("user_id", user.id)

    const { data: memberships, error } = await query

    if (error) {
      console.error("Error fetching channels:", error)
      return NextResponse.json({ error: "Error al obtener canales" }, { status: 500 })
    }

    if (!memberships || memberships.length === 0) {
      // Auto-crear/unir al canal general si no tiene membresías
      const { data: generalChannel } = await (supabase as any)
        .from("team_channels")
        .select("id")
        .eq("agency_id", agencyId)
        .eq("type", "channel")
        .eq("name", "general")
        .single()

      if (generalChannel) {
        await (supabase as any)
          .from("team_channel_members")
          .upsert({ channel_id: generalChannel.id, user_id: user.id })

        // Re-fetch
        return GET(request)
      }

      return NextResponse.json({ channels: [] })
    }

    const channelIds = memberships.map((m: any) => m.channel_id)

    // Obtener unread counts
    const { data: unreadData } = await (supabase as any)
      .from("team_messages")
      .select("channel_id, created_at")
      .in("channel_id", channelIds)

    // Obtener último mensaje por canal
    const { data: allMessages } = await (supabase as any)
      .from("team_messages")
      .select("channel_id, content, created_at, sender_id, users:sender_id(name)")
      .in("channel_id", channelIds)
      .order("created_at", { ascending: false })

    // Obtener member counts
    const { data: memberCounts } = await (supabase as any)
      .from("team_channel_members")
      .select("channel_id")
      .in("channel_id", channelIds)

    // Para DMs: obtener info del otro participante
    const dmChannelIds = memberships
      .filter((m: any) => m.team_channels?.type === "dm")
      .map((m: any) => m.channel_id)

    let dmPartners: Record<string, any> = {}
    if (dmChannelIds.length > 0) {
      const { data: dmMembers } = await (supabase as any)
        .from("team_channel_members")
        .select("channel_id, user_id, users:user_id(id, name, email)")
        .in("channel_id", dmChannelIds)
        .neq("user_id", user.id)

      for (const dm of dmMembers || []) {
        dmPartners[dm.channel_id] = {
          id: dm.users?.id,
          name: dm.users?.name || dm.users?.email,
          email: dm.users?.email,
        }
      }
    }

    // Construir respuesta
    const channels = memberships
      .filter((m: any) => {
        if (!m.team_channels) return false
        if (typeFilter && m.team_channels.type !== typeFilter) return false
        if (m.team_channels.agency_id !== agencyId) return false
        return true
      })
      .map((m: any) => {
        const ch = m.team_channels
        const lastReadAt = new Date(m.last_read_at).getTime()

        // Contar mensajes no leídos
        const unreadCount = (unreadData || []).filter(
          (msg: any) =>
            msg.channel_id === ch.id &&
            new Date(msg.created_at).getTime() > lastReadAt
        ).length

        // Obtener último mensaje
        const lastMsg = (allMessages || []).find(
          (msg: any) => msg.channel_id === ch.id
        )

        // Contar miembros
        const memberCount = (memberCounts || []).filter(
          (mc: any) => mc.channel_id === ch.id
        ).length

        return {
          ...ch,
          unread_count: unreadCount,
          member_count: memberCount,
          last_message: lastMsg
            ? {
                content: lastMsg.content,
                sender_name: lastMsg.users?.name || "Usuario",
                created_at: lastMsg.created_at,
              }
            : null,
          dm_partner: dmPartners[ch.id] || null,
        }
      })
      .sort((a: any, b: any) => {
        // Ordenar: canales con mensajes recientes primero
        const aTime = a.last_message?.created_at || a.created_at
        const bTime = b.last_message?.created_at || b.created_at
        return new Date(bTime).getTime() - new Date(aTime).getTime()
      })

    return NextResponse.json({ channels })
  } catch (error) {
    console.error("Error in GET /api/messaging/channels:", error)
    return NextResponse.json({ error: "Error al obtener canales" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { user } = await getCurrentUser()

    // Solo ADMIN y SUPER_ADMIN pueden crear canales
    if (user.role !== "SUPER_ADMIN" && user.role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }

    const userAgencies = await getUserAgencies(user.id)
    const agencyId = userAgencies[0]?.agency_id

    if (!agencyId) {
      return NextResponse.json({ error: "No se encontró agencia" }, { status: 400 })
    }

    const supabase = createAdminSupabaseClient()
    const body = await request.json()
    const { name, description } = body

    if (!name?.trim()) {
      return NextResponse.json({ error: "El nombre del canal es requerido" }, { status: 400 })
    }

    const channelName = name.trim().toLowerCase().replace(/\s+/g, "-")

    // Verificar que no exista
    const { data: existing } = await (supabase as any)
      .from("team_channels")
      .select("id")
      .eq("agency_id", agencyId)
      .eq("type", "channel")
      .ilike("name", channelName)
      .single()

    if (existing) {
      return NextResponse.json({ error: "Ya existe un canal con ese nombre" }, { status: 409 })
    }

    // Crear canal
    const { data: channel, error } = await (supabase as any)
      .from("team_channels")
      .insert({
        agency_id: agencyId,
        type: "channel",
        name: channelName,
        description: description?.trim() || null,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating channel:", error)
      return NextResponse.json({ error: "Error al crear canal" }, { status: 500 })
    }

    // Agregar al creador como miembro
    await (supabase as any)
      .from("team_channel_members")
      .insert({ channel_id: channel.id, user_id: user.id })

    // Auto-agregar a todos los usuarios de la agencia
    const { data: agencyUsers } = await (supabase as any)
      .from("user_agencies")
      .select("user_id")
      .eq("agency_id", agencyId)
      .neq("user_id", user.id)

    if (agencyUsers && agencyUsers.length > 0) {
      await (supabase as any)
        .from("team_channel_members")
        .upsert(
          agencyUsers.map((ua: any) => ({
            channel_id: channel.id,
            user_id: ua.user_id,
          }))
        )
    }

    return NextResponse.json({ channel })
  } catch (error) {
    console.error("Error in POST /api/messaging/channels:", error)
    return NextResponse.json({ error: "Error al crear canal" }, { status: 500 })
  }
}
