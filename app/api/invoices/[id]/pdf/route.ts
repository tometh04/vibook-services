import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { createServerClient } from "@/lib/supabase/server"
import { getAfipClient } from "@/lib/afip/client"
import { hasPermission, type UserRole } from "@/lib/permissions"
import { buildInvoiceHtml, prepareInvoicePdfData } from "@/lib/afip/invoice-pdf"

export const maxDuration = 25

// GET: Generar PDF de una factura usando AFIP SDK
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await getCurrentUser()

    if (!hasPermission(user.role as UserRole, "accounting", "read")) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
    }

    const { id } = await params

    const supabase = await createServerClient()

    // Obtener agency
    const { data: userAgency } = await supabase
      .from("user_agencies")
      .select("agency_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle()

    if (!userAgency?.agency_id) {
      return NextResponse.json({ error: "Usuario sin agencia" }, { status: 400 })
    }

    // Obtener factura con items
    const { data: invoice } = await supabase
      .from("invoices")
      .select("*, invoice_items(*)")
      .eq("id", id)
      .eq("agency_id", userAgency.agency_id)
      .maybeSingle()

    if (!invoice) {
      return NextResponse.json({ error: "Factura no encontrada" }, { status: 404 })
    }

    if (!invoice.cae || invoice.status !== "authorized") {
      return NextResponse.json(
        { error: "Solo se pueden descargar facturas autorizadas con CAE" },
        { status: 400 }
      )
    }

    // Obtener datos de la agencia
    const { data: agency } = await supabase
      .from("agencies")
      .select("name, city")
      .eq("id", userAgency.agency_id)
      .maybeSingle()

    // Intentar obtener dirección de agency_settings
    const { data: agencySettings } = await supabase
      .from("agency_settings")
      .select("company_address_line1")
      .eq("agency_id", userAgency.agency_id)
      .maybeSingle()

    const agencyData = {
      ...(agency || { name: "Mi Empresa", city: "" }),
      company_address_line1: agencySettings?.company_address_line1 || null,
    }

    // Obtener config AFIP (incluye datos fiscales)
    const { data: afipConfig } = await supabase
      .from("afip_config")
      .select("cuit, afip_cert, afip_key, razon_social, domicilio_comercial, condicion_iva, inicio_actividades")
      .eq("agency_id", userAgency.agency_id)
      .eq("is_active", true)
      .maybeSingle()

    if (!afipConfig?.cuit || !afipConfig?.afip_cert || !afipConfig?.afip_key) {
      return NextResponse.json(
        { error: "AFIP no está configurado o falta certificado" },
        { status: 400 }
      )
    }

    // Preparar datos y generar HTML
    const pdfData = prepareInvoicePdfData(invoice, agencyData, afipConfig)
    const html = buildInvoiceHtml(pdfData)

    // Generar PDF via AFIP SDK
    const afip = getAfipClient(Number(afipConfig.cuit), {
      cert: afipConfig.afip_cert,
      key: afipConfig.afip_key,
    })

    const fileName = `Factura_C_${String(invoice.pto_vta).padStart(4, "0")}-${String(invoice.cbte_nro).padStart(8, "0")}`

    const pdfResult = await Promise.race([
      afip.ElectronicBilling.createPDF({
        html,
        file_name: fileName,
        options: {
          width: 8,
          marginLeft: 0.4,
          marginRight: 0.4,
          marginTop: 0.4,
          marginBottom: 0.4,
        },
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Timeout generando PDF (20s)")), 20000)
      ),
    ])

    return NextResponse.json({
      success: true,
      file: pdfResult.file,
      file_name: pdfResult.file_name || fileName,
    })
  } catch (error: any) {
    console.error("[api/invoices/[id]/pdf]", error)
    const msg = error?.data?.message || error?.message || "Error al generar PDF"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
