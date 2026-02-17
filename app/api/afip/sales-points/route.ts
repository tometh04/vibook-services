import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { createServerClient } from "@/lib/supabase/server"
import { getAfipClient } from "@/lib/afip/client"
import { hasPermission, type UserRole } from "@/lib/permissions"

export const maxDuration = 25

// GET: Consultar puntos de venta habilitados para WebServices en AFIP
export async function GET() {
  try {
    const { user } = await getCurrentUser()

    if (!hasPermission(user.role as UserRole, "accounting", "read")) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
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

    const { data: config } = await supabase
      .from("afip_config")
      .select("cuit, afip_cert, afip_key")
      .eq("agency_id", userAgency.agency_id)
      .eq("is_active", true)
      .maybeSingle()

    if (!config?.cuit || !config?.afip_cert || !config?.afip_key) {
      return NextResponse.json(
        { error: "AFIP no está configurado o falta certificado" },
        { status: 400 }
      )
    }

    const afip = getAfipClient(Number(config.cuit), {
      cert: config.afip_cert,
      key: config.afip_key,
    })

    const salesPoints = await afip.ElectronicBilling.getSalesPoints()

    return NextResponse.json({
      salesPoints: salesPoints || [],
    })
  } catch (error: any) {
    console.error("[api/afip/sales-points]", error)
    const msg = error?.data?.message || error?.message || "Error consultando puntos de venta"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
