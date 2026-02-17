import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { createServerClient } from "@/lib/supabase/server"
import { createAdminSupabaseClient } from "@/lib/supabase/admin"
import { hasPermission, type UserRole } from "@/lib/permissions"
import { getAfipClient } from "@/lib/afip/client"
import { createAfipVoucher, formatDateAfip } from "@/lib/afip/invoicing"

// GET: Listar facturas de la agencia
export async function GET(request: Request) {
  try {
    const { user } = await getCurrentUser()
    const supabase = await createServerClient()

    if (!hasPermission(user.role as UserRole, "accounting", "read")) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const dateFrom = searchParams.get("dateFrom")
    const dateTo = searchParams.get("dateTo")
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200)
    const offset = (page - 1) * limit

    // Obtener agency_id
    const { data: userAgency } = await supabase
      .from("user_agencies")
      .select("agency_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle()

    if (!userAgency?.agency_id) {
      return NextResponse.json({ invoices: [], pagination: { total: 0, page: 1, limit, totalPages: 0 } })
    }

    // Query facturas
    let query = supabase
      .from("invoices")
      .select("*", { count: "exact" })
      .eq("agency_id", userAgency.agency_id)
      .order("created_at", { ascending: false })

    if (status && status !== "ALL") {
      query = query.eq("status", status)
    }
    if (dateFrom) {
      query = query.gte("fecha_emision", dateFrom)
    }
    if (dateTo) {
      query = query.lte("fecha_emision", dateTo)
    }

    const { data: invoices, count, error } = await query.range(offset, offset + limit - 1)

    if (error) {
      console.error("[api/invoices GET]", error)
      return NextResponse.json({ error: "Error al obtener facturas" }, { status: 500 })
    }

    const totalPages = Math.ceil((count || 0) / limit)

    return NextResponse.json({
      invoices: invoices || [],
      pagination: {
        total: count || 0,
        page,
        limit,
        totalPages,
      },
    })
  } catch (error: any) {
    console.error("[api/invoices GET]", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

// POST: Crear y emitir factura en AFIP
export async function POST(request: Request) {
  try {
    const { user } = await getCurrentUser()

    if (!hasPermission(user.role as UserRole, "accounting", "write")) {
      return NextResponse.json({ error: "Sin permisos para facturar" }, { status: 403 })
    }

    const body = await request.json()
    const {
      operation_id,
      customer_id,
      receptor_nombre,
      receptor_doc_tipo,
      receptor_doc_nro,
      receptor_condicion_iva,
      concepto,
      imp_total,
      descripcion,
      moneda,
      fch_serv_desde,
      fch_serv_hasta,
    } = body

    // Validaciones básicas
    if (!receptor_nombre || receptor_doc_tipo === undefined || !imp_total || !concepto) {
      return NextResponse.json(
        { error: "Completá los campos requeridos: nombre, tipo doc, importe y concepto" },
        { status: 400 }
      )
    }

    if (Number(imp_total) <= 0) {
      return NextResponse.json({ error: "El importe debe ser mayor a 0" }, { status: 400 })
    }

    const supabase = await createServerClient()

    // Obtener agency_id
    const { data: userAgency } = await supabase
      .from("user_agencies")
      .select("agency_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle()

    if (!userAgency?.agency_id) {
      return NextResponse.json({ error: "Usuario sin agencia" }, { status: 400 })
    }

    // Obtener config AFIP
    const { data: afipConfig } = await supabase
      .from("afip_config")
      .select("*")
      .eq("agency_id", userAgency.agency_id)
      .eq("is_active", true)
      .eq("automation_status", "complete")
      .maybeSingle()

    if (!afipConfig) {
      return NextResponse.json(
        { error: "AFIP no está configurado. Andá a Configuración → AFIP para conectarte." },
        { status: 400 }
      )
    }

    // Crear instancia AFIP
    const cuit = Number(afipConfig.cuit)
    const afip = getAfipClient(cuit)
    const ptoVta = afipConfig.punto_venta || 1

    // Determinar moneda AFIP
    const monAfip = moneda === "USD" ? "DOL" : "PES"
    const cotizacion = moneda === "USD" ? 1 : 1 // Para USD usamos cotización 1 (declarado en dólares)

    // Emitir en AFIP
    const result = await createAfipVoucher(afip, {
      ptoVta,
      cbteTipo: 11, // Factura C
      concepto: Number(concepto),
      docTipo: Number(receptor_doc_tipo),
      docNro: String(receptor_doc_nro || "0"),
      impTotal: Number(imp_total),
      moneda: monAfip,
      cotizacion,
      condicionIvaReceptor: receptor_condicion_iva ? Number(receptor_condicion_iva) : undefined,
      fchServDesde: fch_serv_desde ? fch_serv_desde.replace(/-/g, "") : undefined,
      fchServHasta: fch_serv_hasta ? fch_serv_hasta.replace(/-/g, "") : undefined,
      fchVtoPago: fch_serv_hasta ? fch_serv_hasta.replace(/-/g, "") : undefined,
    })

    // Guardar en DB (admin client para bypass RLS)
    const adminSupabase = createAdminSupabaseClient()
    const today = new Date().toISOString().split("T")[0]

    const invoiceData: any = {
      agency_id: userAgency.agency_id,
      operation_id: operation_id || null,
      customer_id: customer_id || null,
      cbte_tipo: 11,
      pto_vta: ptoVta,
      cbte_nro: result.CbteNro || null,
      cae: result.CAE || null,
      cae_fch_vto: result.CAEFchVto || null,
      receptor_doc_tipo: Number(receptor_doc_tipo),
      receptor_doc_nro: String(receptor_doc_nro || "0"),
      receptor_nombre: receptor_nombre,
      receptor_condicion_iva: receptor_condicion_iva ? Number(receptor_condicion_iva) : null,
      imp_neto: Number(imp_total),
      imp_iva: 0,
      imp_total: Number(imp_total),
      imp_tot_conc: 0,
      imp_op_ex: 0,
      imp_trib: 0,
      moneda: monAfip,
      cotizacion,
      concepto: Number(concepto),
      fch_serv_desde: fch_serv_desde || null,
      fch_serv_hasta: fch_serv_hasta || null,
      status: result.success ? "authorized" : "rejected",
      fecha_emision: today,
      fecha_vto_pago: fch_serv_hasta || today,
      afip_response: result.afipResponse || null,
      notes: descripcion || null,
      created_by: user.id,
    }

    const { data: invoice, error: insertError } = await (adminSupabase as any)
      .from("invoices")
      .insert(invoiceData)
      .select()
      .single()

    if (insertError) {
      console.error("[api/invoices POST] DB insert error:", insertError)
      // Aún así retornar el resultado de AFIP
      return NextResponse.json({
        success: result.success,
        afip_result: result,
        db_error: "La factura se emitió en AFIP pero hubo un error al guardarla en la base de datos",
      })
    }

    // Si tiene operación, actualizar campos de facturación en la operación
    if (operation_id && result.success) {
      await (adminSupabase as any)
        .from("operations")
        .update({
          invoice_cae: result.CAE,
          invoice_number: `${String(ptoVta).padStart(4, "0")}-${String(result.CbteNro).padStart(8, "0")}`,
          invoice_date: today,
        })
        .eq("id", operation_id)
    }

    if (!result.success) {
      return NextResponse.json(
        {
          error: `AFIP rechazó la factura: ${result.error}`,
          invoice,
          afip_result: result,
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      invoice,
      afip_result: result,
    })
  } catch (error: any) {
    console.error("[api/invoices POST]", error)
    return NextResponse.json(
      { error: error?.message || "Error interno al emitir factura" },
      { status: 500 }
    )
  }
}
