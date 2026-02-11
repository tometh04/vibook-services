import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { createAdminSupabaseClient } from "@/lib/supabase/admin"
import { getUserAgencyIds } from "@/lib/permissions-api"
import { verifyFeatureAccess } from "@/lib/billing/subscription-middleware"

export async function GET() {
  const debug: Record<string, any> = {}

  try {
    // 1. Check env vars
    debug.hasOpenAIKey = !!process.env.OPENAI_API_KEY
    debug.openAIKeyPrefix = process.env.OPENAI_API_KEY?.substring(0, 8) || "MISSING"
    debug.hasSupabaseUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL
    debug.hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY

    // 2. Check auth
    try {
      const { user } = await getCurrentUser()
      debug.auth = user ? { id: user.id, email: user.email, role: user.role } : "NO_USER"

      if (user) {
        // 3. Check feature access
        try {
          const featureAccess = await verifyFeatureAccess(user.id, user.role, "cerebro")
          debug.featureAccess = featureAccess
        } catch (e: any) {
          debug.featureAccess = { error: e.message }
        }

        // 4. Check admin client + agency IDs
        try {
          const supabaseAdmin = createAdminSupabaseClient()
          debug.adminClientType = typeof supabaseAdmin?.rpc

          const agencyIds = await getUserAgencyIds(supabaseAdmin as any, user.id, user.role as any)
          debug.agencyIds = agencyIds
          debug.agencyCount = agencyIds.length

          // 5. Test RPC
          try {
            const { data, error } = await supabaseAdmin.rpc('execute_readonly_query', {
              query_text: 'SELECT 1 as test'
            })
            debug.rpcTest = error ? { error: error.message } : { data, success: true }
          } catch (e: any) {
            debug.rpcTest = { error: e.message }
          }

          // 6. Test actual query with agency filter
          if (agencyIds.length > 0) {
            const agencyArrayLiteral = agencyIds.map((id: string) => `'${id}'::uuid`).join(",")
            const testQuery = `SELECT COUNT(*) as total FROM operations WHERE agency_id = ANY(ARRAY[${agencyArrayLiteral}]::uuid[])`
            try {
              const { data, error } = await supabaseAdmin.rpc('execute_readonly_query', {
                query_text: testQuery
              })
              debug.queryTest = error ? { error: error.message, query: testQuery } : { data, success: true }
            } catch (e: any) {
              debug.queryTest = { error: e.message }
            }
          }
        } catch (e: any) {
          debug.adminClient = { error: e.message }
        }
      }
    } catch (e: any) {
      debug.auth = { error: e.message }
    }

    return NextResponse.json(debug)
  } catch (e: any) {
    return NextResponse.json({ error: e.message, debug })
  }
}
