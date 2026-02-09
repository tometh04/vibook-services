import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { jwtVerify } from "jose"
import { createAdminSupabaseClient } from "@/lib/supabase/admin"

const JWT_SECRET = new TextEncoder().encode(
  process.env.ADMIN_JWT_SECRET || "vibook-admin-secret-key-change-in-production"
)

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}

async function ensureAdmin() {
  const cookieStore = await cookies()
  const token = cookieStore.get("admin_session")?.value
  if (!token) return false
  try {
    await jwtVerify(token, JWT_SECRET)
    return true
  } catch {
    return false
  }
}

export async function POST(request: Request) {
  try {
    const isAdmin = await ensureAdmin()
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const userId = body?.user_id as string | undefined
    const agencyId = body?.agency_id as string | undefined
    const mode = body?.mode as string | undefined

    if (!userId || !agencyId || !mode || !isUuid(userId) || !isUuid(agencyId)) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 })
    }

    if (!["AUTO", "FORCE_ON", "FORCE_OFF"].includes(mode)) {
      return NextResponse.json({ error: "Modo inválido" }, { status: 400 })
    }

    const supabase = createAdminSupabaseClient()

    if (mode === "AUTO") {
      await (supabase.from("onboarding_controls") as any)
        .delete()
        .eq("user_id", userId)
        .eq("agency_id", agencyId)
    } else {
      const { error } = await (supabase.from("onboarding_controls") as any)
        .upsert(
          {
            user_id: userId,
            agency_id: agencyId,
            mode,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,agency_id" }
        )

      if (error) {
        console.error("Error updating onboarding_controls:", error)
        return NextResponse.json({ error: "Error al actualizar onboarding" }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true, mode })
  } catch (error: any) {
    console.error("Error in POST /api/admin/onboarding/control:", error)
    return NextResponse.json({ error: "Error al actualizar onboarding" }, { status: 500 })
  }
}
