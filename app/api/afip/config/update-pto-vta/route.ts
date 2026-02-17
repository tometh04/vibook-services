import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { createServerClient } from "@/lib/supabase/server"
import { createAdminSupabaseClient } from "@/lib/supabase/admin"
import { hasPermission, type UserRole } from "@/lib/permissions"

// POST: Actualizar punto de venta en la config AFIP activa
export async function POST(request: Request) {
  try {
    const { user } = await getCurrentUser()

    if (!hasPermission(user.role as UserRole, "settings", "write")) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
    }

    const body = await request.json()
    const { punto_venta } = body

    if (!punto_venta || Number(punto_venta) < 1) {
      return NextResponse.json({ error: "Punto de venta inválido" }, { status: 400 })
    }

    const supabase = await createServerClient()
    const { data: userAgency } = await supabase
      .from("user_agencies")
      .select("agency_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle()

    if (!userAgency?.agency_id) {
      return NextResponse.json({ error: "Usuario sin agencia" }, { status: 400 })
    }

    const adminSupabase = createAdminSupabaseClient()
    const { error } = await (adminSupabase as any)
      .from("afip_config")
      .update({ punto_venta: Number(punto_venta) })
      .eq("agency_id", userAgency.agency_id)
      .eq("is_active", true)

    if (error) {
      console.error("[update-pto-vta]", error)
      return NextResponse.json({ error: "Error actualizando punto de venta" }, { status: 500 })
    }

    return NextResponse.json({ success: true, punto_venta: Number(punto_venta) })
  } catch (error: any) {
    console.error("[update-pto-vta]", error)
    return NextResponse.json({ error: error?.message || "Error interno" }, { status: 500 })
  }
}
