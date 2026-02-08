import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { requireAdminTools } from "@/lib/admin-tools"
import { seedUserDemoData } from "@/lib/seed/seed-user-demo-data"

export async function POST(request: Request) {
  try {
    const { user } = await getCurrentUser()

    const guard = requireAdminTools(user, request)
    if (guard) return guard

    const body = await request.json().catch(() => ({}))
    const email = typeof body.email === "string" ? body.email.trim() : ""
    const seedTag = typeof body.seedTag === "string" ? body.seedTag.trim() : undefined

    if (!email) {
      return NextResponse.json({ error: "Email requerido" }, { status: 400 })
    }

    const result = await seedUserDemoData({ email, seedTag })

    return NextResponse.json({ success: true, ...result })
  } catch (error: any) {
    console.error("Error in POST /api/admin/seed-user-demo-data:", error)
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Error al ejecutar seed",
      },
      { status: 500 },
    )
  }
}
