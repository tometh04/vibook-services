import { NextResponse } from "next/server"
import { createAdminSupabaseClient } from "@/lib/supabase/admin"
import { getCurrentUser, getUserAgencies } from "@/lib/auth"

export async function POST(request: Request) {
  try {
    const { user } = await getCurrentUser()
    const userAgencies = await getUserAgencies(user.id)
    const agencyIds = userAgencies.map((ua) => ua.agency_id).filter(Boolean)

    if (agencyIds.length === 0) {
      return NextResponse.json({ error: "No se encontró agencia" }, { status: 400 })
    }

    const supabase = createAdminSupabaseClient()
    const body = await request.json()
    const { target_user_id } = body

    if (!target_user_id) {
      return NextResponse.json({ error: "Se requiere el usuario destino" }, { status: 400 })
    }

    if (target_user_id === user.id) {
      return NextResponse.json({ error: "No puedes enviarte un DM a ti mismo" }, { status: 400 })
    }

    // Verificar que el target pertenece a alguna agencia en común
    const { data: targetAgency } = await (supabase as any)
      .from("user_agencies")
      .select("agency_id")
      .eq("user_id", target_user_id)
      .in("agency_id", agencyIds)
      .limit(1)
      .single()

    if (!targetAgency) {
      return NextResponse.json({ error: "El usuario no pertenece a tu agencia" }, { status: 403 })
    }

    const sharedAgencyId = targetAgency.agency_id

    // Buscar DM existente entre estos 2 usuarios
    const { data: existingDMs } = await (supabase as any)
      .from("team_channels")
      .select(`
        id,
        team_channel_members(user_id)
      `)
      .eq("agency_id", sharedAgencyId)
      .eq("type", "dm")

    let existingDM = null
    for (const dm of existingDMs || []) {
      const memberIds = (dm.team_channel_members || []).map((m: any) => m.user_id)
      if (
        memberIds.length === 2 &&
        memberIds.includes(user.id) &&
        memberIds.includes(target_user_id)
      ) {
        existingDM = dm
        break
      }
    }

    if (existingDM) {
      return NextResponse.json({ channel: { id: existingDM.id, type: "dm", existed: true } })
    }

    // Crear nuevo DM
    const { data: channel, error } = await (supabase as any)
      .from("team_channels")
      .insert({
        agency_id: sharedAgencyId,
        type: "dm",
        name: null,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating DM:", error)
      return NextResponse.json({ error: "Error al crear conversación" }, { status: 500 })
    }

    // Agregar ambos usuarios como miembros
    await (supabase as any)
      .from("team_channel_members")
      .insert([
        { channel_id: channel.id, user_id: user.id },
        { channel_id: channel.id, user_id: target_user_id },
      ])

    return NextResponse.json({ channel: { ...channel, existed: false } })
  } catch (error) {
    console.error("Error in POST /api/messaging/channels/dm:", error)
    return NextResponse.json({ error: "Error al crear conversación" }, { status: 500 })
  }
}
