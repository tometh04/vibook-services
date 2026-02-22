import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/auth"
import { createAdminSupabaseClient } from "@/lib/supabase/admin"

export async function GET() {
  try {
    const { user } = await getCurrentUser()
    if (user.role !== "SUPER_ADMIN" && user.role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }

    // Usar admin client para bypass RLS en user_agencies
    // La RLS de user_agencies solo permite ver registros propios,
    // pero un ADMIN necesita ver los registros de todos los usuarios de su agencia
    const supabaseAdmin = createAdminSupabaseClient()

    // SUPER_ADMIN ve TODOS los usuarios
    // ADMIN solo ve usuarios de sus agencias
    let usersQuery = (supabaseAdmin
      .from("users") as any)
      .select(`
        *,
        user_agencies(
          agency_id,
          agencies(id, name)
        )
      `)

    if (user.role !== "SUPER_ADMIN") {
      // Obtener agencias del usuario actual usando admin client
      const { data: currentUserAgencies } = await (supabaseAdmin
        .from("user_agencies") as any)
        .select("agency_id")
        .eq("user_id", user.id)

      const agencyIds = (currentUserAgencies || []).map((ua: any) => ua.agency_id) as string[]

      if (agencyIds.length === 0) {
        return NextResponse.json({ users: [] })
      }

      // Obtener IDs de todos los usuarios de esas agencias
      const { data: userAgenciesData } = await (supabaseAdmin
        .from("user_agencies") as any)
        .select("user_id")
        .in("agency_id", agencyIds)

      const userIds = Array.from(new Set((userAgenciesData || []).map((ua: any) => ua.user_id))) as string[]

      if (userIds.length === 0) {
        return NextResponse.json({ users: [] })
      }

      usersQuery = usersQuery.in("id", userIds)
    }

    const { data: users, error: usersError } = await usersQuery.order("created_at", { ascending: false })

    if (usersError) {
      console.error("Error fetching users:", usersError)
      return NextResponse.json({ error: "Error al cargar usuarios", details: usersError.message }, { status: 500 })
    }

    return NextResponse.json({ users: users || [] })
  } catch (error) {
    return NextResponse.json({ error: "Error al cargar usuarios" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { user } = await getCurrentUser()
    if (user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }

    const supabase = await createServerClient()
    const body = await request.json()
    const { id, role, is_active } = body

    if (!id) {
      return NextResponse.json({ error: "Falta el ID del usuario" }, { status: 400 })
    }

    // No permitir cambiar el rol de SUPER_ADMIN
    const { data: existingUser } = await supabase.from("users").select("role").eq("id", id).single()
    if (existingUser && (existingUser as any).role === "SUPER_ADMIN" && role && role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "No se puede cambiar el rol de SUPER_ADMIN" }, { status: 400 })
    }

    const updates: { role?: string; is_active?: boolean } = {}
    if (role) updates.role = role
    if (typeof is_active === "boolean") updates.is_active = is_active

    const usersTable = supabase.from("users") as any
    const { data, error } = await usersTable
      .update(updates)
      .eq("id", id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: "Error al actualizar usuario" }, { status: 400 })
    }

    return NextResponse.json({ success: true, user: data })
  } catch (error) {
    return NextResponse.json({ error: "Error al actualizar usuario" }, { status: 500 })
  }
}

