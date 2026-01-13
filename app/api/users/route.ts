import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/auth"

export const dynamic = 'force-dynamic'

// GET - Obtener usuarios de las agencias del usuario actual (AISLAMIENTO SaaS ESTRICTO)
export async function GET(request: Request) {
  try {
    const { user } = await getCurrentUser()
    const supabase = await createServerClient()
    const { searchParams } = new URL(request.url)

    // Parámetros de filtro
    const role = searchParams.get("role")
    const search = searchParams.get("search")
    const excludeUserId = searchParams.get("exclude")
    const agencyIdFilter = searchParams.get("agencyId") // Filtro opcional por agencia específica
    
    console.log(`[API /users] GET request - User: ${user.id} (${user.email}), Role: ${user.role}`)
    console.log(`[API /users] Params - role: ${role}, search: ${search}, exclude: ${excludeUserId}, agencyId: ${agencyIdFilter}`)

    // Obtener agencias del usuario directamente
    const { data: userAgenciesData, error: agencyError } = await supabase
      .from("user_agencies")
      .select("agency_id")
      .eq("user_id", user.id)

    if (agencyError) {
      console.error("[API /users] Error getting user agencies:", agencyError)
      return NextResponse.json({ users: [] })
    }

    const userAgencyIds = (userAgenciesData || []).map((ua: any) => ua.agency_id)
    console.log(`[API /users] User ${user.id} has access to agencies:`, userAgencyIds)

    // Si no hay agencias, retornar vacío
    if (!userAgencyIds || userAgencyIds.length === 0) {
      console.log(`[API /users] User ${user.id} has no agencies - returning empty`)
      return NextResponse.json({ users: [] })
    }

    // Determinar qué agencias usar para el filtro
    let agencyIdsToFilter = userAgencyIds
    
    // Si se especifica un agencyId, verificar que el usuario tenga acceso
    if (agencyIdFilter && agencyIdFilter !== "ALL") {
      if (!userAgencyIds.includes(agencyIdFilter)) {
        console.log(`[API /users] User does not have access to agency ${agencyIdFilter}`)
        return NextResponse.json({ users: [] })
      }
      agencyIdsToFilter = [agencyIdFilter]
    }

    // Obtener IDs de usuarios de SOLO las agencias filtradas (AISLAMIENTO ESTRICTO!)
    const { data: allUserAgencies, error: userAgenciesError } = await supabase
      .from("user_agencies")
      .select("user_id, agency_id")
      .in("agency_id", agencyIdsToFilter)

    if (userAgenciesError) {
      console.error("[API /users] Error fetching user_agencies:", userAgenciesError)
      return NextResponse.json({ users: [] })
    }

    const allUserIds = (allUserAgencies || []).map((ua: any) => ua.user_id)
    const userIds = Array.from(new Set(allUserIds)) as string[]
    
    console.log(`[API /users] Found ${userIds.length} users in filtered agencies`)

    if (userIds.length === 0) {
      return NextResponse.json({ users: [] })
    }

    // Query de usuarios - columnas reales: id, auth_id, name, email, role, is_active, created_at, updated_at
    let query = (supabase.from("users") as any)
      .select("id, name, email, role, is_active, created_at")
      .in("id", userIds)
      .eq("is_active", true)

    // Filtros opcionales
    if (role) {
      query = query.eq("role", role)
    }
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`)
    }
    if (excludeUserId) {
      query = query.neq("id", excludeUserId)
    }

    const { data: usersData, error } = await query

    if (error) {
      console.error("[API /users] Error fetching users:", error)
      return NextResponse.json(
        { error: "Error al obtener usuarios" },
        { status: 500 }
      )
    }
    
    console.log(`[API /users] Found ${(usersData || []).length} users matching filters`)
    
    // Transformar los datos para compatibilidad con el frontend
    const users = (usersData || []).map((u: any) => {
      const nameParts = (u.name || '').split(' ')
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        is_active: u.is_active,
        created_at: u.created_at,
        // Campos derivados para compatibilidad
        first_name: nameParts[0] || '',
        last_name: nameParts.slice(1).join(' ') || '',
        avatar_url: null,
        phone: null,
      }
    })

    return NextResponse.json({ users })
  } catch (error: any) {
    console.error("Error in GET /api/users:", error)
    return NextResponse.json(
      { error: error.message || "Error al obtener usuarios" },
      { status: 500 }
    )
  }
}
