import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/auth"

export async function GET() {
  try {
    const { user } = await getCurrentUser()
    if (user.role !== "SUPER_ADMIN" && user.role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }

    const supabase = await createServerClient()
    
    // SUPER_ADMIN (admin@vibook.ai) ve TODOS los usuarios
    // ADMIN y otros roles solo ven usuarios de sus agencias
    let usersQuery = supabase
      .from("users")
      .select(`
        *,
        user_agencies(
          agency_id,
          agencies(id, name)
        )
      `)
    
    if (user.role !== "SUPER_ADMIN") {
      // Filtrar por agencias del usuario
      const { getUserAgencyIds } = await import("@/lib/permissions-api")
      const agencyIds = await getUserAgencyIds(supabase, user.id, user.role as any)
      
      if (agencyIds.length === 0) {
        return NextResponse.json({ users: [] })
      }
      
      // Obtener IDs de usuarios de las agencias del usuario actual
      const { data: userAgenciesData } = await supabase
        .from("user_agencies")
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
      // Si hay error con la relación, intentar sin user_agencies
      const { data: usersSimple, error: simpleError } = await supabase
        .from("users")
        .select("*")
        .order("created_at", { ascending: false })
      
      if (simpleError) {
        return NextResponse.json({ error: "Error al cargar usuarios", details: simpleError.message }, { status: 500 })
      }
      
      return NextResponse.json({ users: usersSimple || [] })
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

