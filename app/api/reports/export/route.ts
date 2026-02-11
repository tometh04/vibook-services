import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/auth"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { verifyFeatureAccess } from "@/lib/billing/subscription-middleware"

export async function GET(request: Request) {
  try {
    const { user } = await getCurrentUser()
    const supabase = await createServerClient()
    const { searchParams } = new URL(request.url)

    const featureAccess = await verifyFeatureAccess(user.id, user.role, "reports")
    if (!featureAccess.hasAccess) {
      return NextResponse.json(
        { error: featureAccess.message || "No tiene acceso a Reportes" },
        { status: 403 }
      )
    }

    const reportType = searchParams.get("type") || "operations"
    const exportFormat = searchParams.get("format") || "csv"
    const dateFrom = searchParams.get("dateFrom")
    const dateTo = searchParams.get("dateTo")
    const agencyId = searchParams.get("agencyId")

    // CRÍTICO: Obtener agencias del usuario para filtro obligatorio (multi-tenancy)
    const { getUserAgencyIds } = await import("@/lib/permissions-api")
    const agencyIds = await getUserAgencyIds(supabase, user.id, user.role as any)

    // Validar que el agencyId solicitado pertenece al usuario
    if (agencyId && agencyId !== "ALL" && user.role !== "SUPER_ADMIN" && !agencyIds.includes(agencyId)) {
      return NextResponse.json({ error: "No tiene acceso a esta agencia" }, { status: 403 })
    }

    let data: any[] = []
    let columns: { key: string; label: string }[] = []

    switch (reportType) {
      case "operations": {
        let query = (supabase.from("operations") as any)
          .select(`
            *,
            sellers:seller_id (name),
            operators:operator_id (name),
            agencies:agency_id (name)
          `)
          .order("departure_date", { ascending: false })

        if (dateFrom) query = query.gte("departure_date", dateFrom)
        if (dateTo) query = query.lte("departure_date", dateTo)
        if (agencyId && agencyId !== "ALL") {
          query = query.eq("agency_id", agencyId)
        } else if (user.role !== "SUPER_ADMIN" && agencyIds.length > 0) {
          query = query.in("agency_id", agencyIds)
        }

        const { data: ops } = await query.limit(1000)
        data = (ops || []).map((op: any) => ({
          fecha_salida: op.departure_date ? format(new Date(op.departure_date), "dd/MM/yyyy") : "",
          destino: op.destination || "",
          tipo: op.type || "",
          estado: op.status || "",
          adultos: op.adults || 0,
          menores: op.children || 0,
          venta_total: op.sale_amount_total || 0,
          costo_operador: op.operator_cost || 0,
          margen: op.margin_amount || 0,
          moneda: op.currency || "ARS",
          vendedor: op.sellers?.name || "",
          operador: op.operators?.name || "",
          agencia: op.agencies?.name || "",
        }))

        columns = [
          { key: "fecha_salida", label: "Fecha Salida" },
          { key: "destino", label: "Destino" },
          { key: "tipo", label: "Tipo" },
          { key: "estado", label: "Estado" },
          { key: "adultos", label: "Adultos" },
          { key: "menores", label: "Menores" },
          { key: "venta_total", label: "Venta Total" },
          { key: "costo_operador", label: "Costo Operador" },
          { key: "margen", label: "Margen" },
          { key: "moneda", label: "Moneda" },
          { key: "vendedor", label: "Vendedor" },
          { key: "operador", label: "Operador" },
          { key: "agencia", label: "Agencia" },
        ]
        break
      }

      case "customers": {
        let query = (supabase.from("customers") as any)
          .select(`*, agencies:agency_id (name)`)
          .order("created_at", { ascending: false })

        if (agencyId && agencyId !== "ALL") {
          query = query.eq("agency_id", agencyId)
        } else if (user.role !== "SUPER_ADMIN" && agencyIds.length > 0) {
          query = query.in("agency_id", agencyIds)
        }

        const { data: customers } = await query.limit(1000)
        data = (customers || []).map((c: any) => ({
          nombre: c.first_name || "",
          apellido: c.last_name || "",
          email: c.email || "",
          telefono: c.phone || "",
          documento: `${c.document_type || ""} ${c.document_number || ""}`.trim(),
          nacionalidad: c.nationality || "",
          fecha_alta: c.created_at ? format(new Date(c.created_at), "dd/MM/yyyy") : "",
          agencia: c.agencies?.name || "",
        }))

        columns = [
          { key: "nombre", label: "Nombre" },
          { key: "apellido", label: "Apellido" },
          { key: "email", label: "Email" },
          { key: "telefono", label: "Teléfono" },
          { key: "documento", label: "Documento" },
          { key: "nacionalidad", label: "Nacionalidad" },
          { key: "fecha_alta", label: "Fecha Alta" },
          { key: "agencia", label: "Agencia" },
        ]
        break
      }

      case "payments": {
        let query = (supabase.from("payments") as any)
          .select(`
            *,
            operations:operation_id (destination, agencies:agency_id (name))
          `)
          .order("date_due", { ascending: false })

        if (dateFrom) query = query.gte("date_due", dateFrom)
        if (dateTo) query = query.lte("date_due", dateTo)

        // CRÍTICO: Filtro de agencia para payments (a través de operations)
        if (agencyId && agencyId !== "ALL") {
          // Obtener operation_ids de la agencia
          const { data: agencyOps } = await (supabase.from("operations") as any)
            .select("id")
            .eq("agency_id", agencyId)
          const opIds = (agencyOps || []).map((o: any) => o.id)
          if (opIds.length > 0) {
            query = query.in("operation_id", opIds)
          }
        } else if (user.role !== "SUPER_ADMIN" && agencyIds.length > 0) {
          const { data: agencyOps } = await (supabase.from("operations") as any)
            .select("id")
            .in("agency_id", agencyIds)
          const opIds = (agencyOps || []).map((o: any) => o.id)
          if (opIds.length > 0) {
            query = query.in("operation_id", opIds)
          }
        }

        const { data: payments } = await query.limit(1000)
        data = (payments || []).map((p: any) => ({
          fecha_vencimiento: p.date_due ? format(new Date(p.date_due), "dd/MM/yyyy") : "",
          fecha_pago: p.date_paid ? format(new Date(p.date_paid), "dd/MM/yyyy") : "",
          monto: p.amount || 0,
          moneda: p.currency || "ARS",
          estado: p.status || "",
          metodo: p.method || "",
          tipo: p.payer_type || "",
          direccion: p.direction || "",
          operacion: p.operations?.destination || "",
          referencia: p.reference || "",
        }))

        columns = [
          { key: "fecha_vencimiento", label: "Fecha Vencimiento" },
          { key: "fecha_pago", label: "Fecha Pago" },
          { key: "monto", label: "Monto" },
          { key: "moneda", label: "Moneda" },
          { key: "estado", label: "Estado" },
          { key: "metodo", label: "Método" },
          { key: "tipo", label: "Tipo" },
          { key: "direccion", label: "Dirección" },
          { key: "operacion", label: "Operación" },
          { key: "referencia", label: "Referencia" },
        ]
        break
      }

      default:
        return NextResponse.json({ error: "Tipo de reporte no soportado" }, { status: 400 })
    }

    // Generar según formato
    switch (exportFormat) {
      case "csv": {
        const csvContent = generateCSV(data, columns)
        return new NextResponse(csvContent, {
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="${reportType}-${format(new Date(), "yyyy-MM-dd")}.csv"`,
          },
        })
      }

      case "json": {
        return NextResponse.json({ data, columns })
      }

      default:
        return NextResponse.json({ error: "Formato no soportado" }, { status: 400 })
    }
  } catch (error: any) {
    console.error("Error exporting report:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

function generateCSV(data: any[], columns: { key: string; label: string }[]): string {
  // Header
  const header = columns.map(c => `"${c.label}"`).join(",")
  
  // Rows
  const rows = data.map(row => 
    columns.map(col => {
      const value = row[col.key]
      if (typeof value === "string") {
        return `"${value.replace(/"/g, '""')}"`
      }
      return value ?? ""
    }).join(",")
  )

  // BOM for Excel UTF-8 compatibility
  const BOM = "\uFEFF"
  return BOM + header + "\n" + rows.join("\n")
}
