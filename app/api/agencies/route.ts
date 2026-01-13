import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getCachedAgencies, revalidateTag, CACHE_TAGS } from "@/lib/cache"

/**
 * GET /api/agencies
 * Lista agencias: SUPER_ADMIN ve todas, otros solo sus agencias
 */
export async function GET() {
  try {
    const { getCurrentUser } = await import("@/lib/auth")
    const { user } = await getCurrentUser()
    
    const agencies = await getCachedAgencies(async () => {
      const supabase = await createServerClient()
      
      let query = supabase.from("agencies").select("id, name")
      
      // SUPER_ADMIN (admin@vibook.ai) ve TODAS las agencias
      if (user.role !== "SUPER_ADMIN") {
        // ADMIN y otros roles solo ven sus agencias
        const { getUserAgencyIds } = await import("@/lib/permissions-api")
        const agencyIds = await getUserAgencyIds(supabase, user.id, user.role as any)
        
        if (agencyIds.length === 0) {
          return []
        }
        
        query = query.in("id", agencyIds)
      }

      const { data, error } = await query.order("name")

      if (error) {
        console.error("❌ Error fetching agencies:", error.message, error.details)
        // Devolver array vacío en lugar de error para no bloquear el UI
        return []
      }

      console.log("✅ Agencies loaded:", data?.length || 0)
      return data || []
    })

    return NextResponse.json({ agencies })
  } catch (error: any) {
    console.error("❌ Exception in GET agencies:", error)
    return NextResponse.json({ agencies: [], error: error.message })
  }
}
