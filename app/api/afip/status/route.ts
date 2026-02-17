import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { createServerClient } from "@/lib/supabase/server"

// GET: Check rápido si AFIP está configurado para la agencia del usuario
export async function GET() {
  try {
    const { user } = await getCurrentUser()
    const supabase = await createServerClient()

    // Obtener agency_id
    const { data: userAgency } = await supabase
      .from("user_agencies")
      .select("agency_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle()

    if (!userAgency?.agency_id) {
      return NextResponse.json({ configured: false })
    }

    // Buscar config activa y completa
    const { data: config } = await supabase
      .from("afip_config")
      .select("cuit, punto_venta, automation_status")
      .eq("agency_id", userAgency.agency_id)
      .eq("is_active", true)
      .maybeSingle()

    if (!config || config.automation_status !== "complete") {
      return NextResponse.json({ configured: false })
    }

    return NextResponse.json({
      configured: true,
      cuit: config.cuit,
      punto_venta: config.punto_venta,
    })
  } catch (error: any) {
    console.error("[api/afip/status]", error)
    return NextResponse.json({ configured: false })
  }
}
