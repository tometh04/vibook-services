import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { createServerClient } from "@/lib/supabase/server"
import { getAfipClient } from "@/lib/afip/client"
import { hasPermission, type UserRole } from "@/lib/permissions"

export const maxDuration = 25

// POST: Verificar un comprobante existente en AFIP usando FECompConsultar
export async function POST(request: Request) {
  try {
    const { user } = await getCurrentUser()

    if (!hasPermission(user.role as UserRole, "accounting", "read")) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
    }

    const body = await request.json()
    const { cbteNro, ptoVta, cbteTipo } = body

    if (!cbteNro || !ptoVta || !cbteTipo) {
      return NextResponse.json(
        { error: "Faltan parámetros: cbteNro, ptoVta, cbteTipo" },
        { status: 400 }
      )
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

    const { data: afipConfig } = await supabase
      .from("afip_config")
      .select("cuit, afip_cert, afip_key")
      .eq("agency_id", userAgency.agency_id)
      .eq("is_active", true)
      .maybeSingle()

    if (!afipConfig?.cuit || !afipConfig?.afip_cert || !afipConfig?.afip_key) {
      return NextResponse.json(
        { error: "AFIP no está configurado o falta certificado" },
        { status: 400 }
      )
    }

    const afip = getAfipClient(Number(afipConfig.cuit), {
      cert: afipConfig.afip_cert,
      key: afipConfig.afip_key,
    })

    // Consultar comprobante en AFIP con timeout de 15s
    const voucherInfo = await Promise.race([
      afip.ElectronicBilling.getVoucherInfo(
        Number(cbteNro),
        Number(ptoVta),
        Number(cbteTipo)
      ),
      new Promise<null>((_, reject) =>
        setTimeout(() => reject(new Error("Timeout consultando AFIP (15s)")), 15000)
      ),
    ])

    if (!voucherInfo) {
      return NextResponse.json({
        exists: false,
        message: "El comprobante no fue encontrado en AFIP",
      })
    }

    // FECompConsultar devuelve ResultGet con estos campos
    return NextResponse.json({
      exists: true,
      voucherInfo: {
        CbteNro: voucherInfo.CbteDesde,
        PtoVta: voucherInfo.PtoVta,
        CbteTipo: voucherInfo.CbteTipo,
        CbteFch: voucherInfo.CbteFch,
        CAE: voucherInfo.CodAutorizacion,
        CAEFchVto: voucherInfo.FchVto,
        ImpTotal: voucherInfo.ImpTotal,
        ImpNeto: voucherInfo.ImpNeto,
        DocTipo: voucherInfo.DocTipo,
        DocNro: voucherInfo.DocNro,
        Resultado: voucherInfo.Resultado,
        Concepto: voucherInfo.Concepto,
        MonId: voucherInfo.MonId,
      },
    })
  } catch (error: any) {
    console.error("[api/invoices/verify]", error)
    const msg = error?.data?.message || error?.message || "Error al verificar comprobante en AFIP"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
