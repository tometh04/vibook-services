import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/auth"

export const dynamic = 'force-dynamic'

/**
 * GET /api/agencies
 * Lista agencias: SUPER_ADMIN ve todas, otros solo sus agencias
 */
export async function GET(request: Request) {
  try {
    const { user } = await getCurrentUser()
    const supabase = await createServerClient()
    const { searchParams } = new URL(request.url)
    const idsParam = searchParams.get("ids")
    
    let query = supabase.from("agencies").select("id, name")
    
    // Si se proporcionan IDs específicos, filtrar por esos
    if (idsParam) {
      const ids = idsParam.split(",").filter(Boolean)
      if (ids.length > 0) {
        query = query.in("id", ids)
      } else {
        return NextResponse.json({ agencies: [] })
      }
    } else {
      // SUPER_ADMIN (admin@vibook.ai) ve TODAS las agencias
      if (user.role !== "SUPER_ADMIN") {
        // ADMIN y otros roles solo ven sus agencias
        const { data: userAgencies } = await supabase
          .from("user_agencies")
          .select("agency_id")
          .eq("user_id", user.id)
        
        const agencyIds = (userAgencies || []).map((ua: any) => ua.agency_id)
        
        if (agencyIds.length === 0) {
          console.log(`[API /agencies] User ${user.id} has no agencies`)
          return NextResponse.json({ agencies: [] })
        }
        
        query = query.in("id", agencyIds)
      }
    }

    const { data, error } = await query.order("name")

    if (error) {
      console.error("❌ Error fetching agencies:", error.message, error.details)
      return NextResponse.json({ agencies: [], error: error.message })
    }

    console.log(`[API /agencies] Found ${data?.length || 0} agencies for user ${user.id} (${user.role})`)
    return NextResponse.json({ agencies: data || [] })
  } catch (error: any) {
    console.error("❌ Exception in GET agencies:", error)
    return NextResponse.json({ agencies: [], error: error.message })
  }
}
