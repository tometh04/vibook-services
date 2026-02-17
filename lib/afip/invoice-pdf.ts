/**
 * Genera el HTML para el PDF de una factura AFIP
 * Basado en el template oficial de Afip SDK
 */

interface InvoicePdfData {
  // Emisor
  razonSocial: string
  domicilioComercial: string
  condicionIva: string
  cuit: string
  inicioActividades?: string

  // Comprobante
  tipoComprobante: string  // "C"
  tipoComprobanteNombre: string // "Factura"
  ptoVta: number
  cbteNro: number
  fechaEmision: string  // "DD/MM/YYYY"

  // Período (para servicios)
  periodoDesde?: string
  periodoHasta?: string
  fechaVtoPago?: string

  // Receptor
  receptorDocTipo: string  // "CUIT", "DNI", etc.
  receptorDocNro: string
  receptorNombre: string
  receptorCondicionIva: string
  receptorDomicilio?: string

  // Items
  items: Array<{
    descripcion: string
    cantidad: number
    precioUnitario: number
    subtotal: number
  }>

  // Totales
  subtotal: number
  impOtrosTributos: number
  impTotal: number
  moneda: string  // "$" o "USD"

  // CAE
  cae: string
  caeFchVto: string  // "DD/MM/YYYY"

  // QR (base64 data URL o URL)
  qrCodeUrl?: string
}

// Mapeo condicion IVA id -> label
const IVA_CONDITION_LABELS: Record<number, string> = {
  1: "Responsable Inscripto",
  4: "Exento",
  5: "Consumidor Final",
  6: "Monotributo",
}

// Mapeo tipo doc id -> label
const DOC_TYPE_LABELS: Record<number, string> = {
  80: "CUIT",
  86: "CUIL",
  96: "DNI",
  99: "Doc. Nro",
}

function formatNumber(n: number): string {
  return n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatAfipDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "-"
  // Puede venir como "YYYY-MM-DD" o "YYYYMMDD"
  const clean = dateStr.replace(/-/g, "")
  if (clean.length === 8) {
    return `${clean.slice(6, 8)}/${clean.slice(4, 6)}/${clean.slice(0, 4)}`
  }
  // Intentar parsear como fecha
  try {
    const d = new Date(dateStr)
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`
  } catch {
    return dateStr
  }
}

export function buildInvoiceHtml(data: InvoicePdfData): string {
  const ptoVtaStr = String(data.ptoVta).padStart(4, "0")
  const cbteNroStr = String(data.cbteNro).padStart(8, "0")
  const monSymbol = data.moneda === "DOL" || data.moneda === "USD" ? "USD" : "$"

  // Items HTML
  const itemsHtml = data.items
    .map(
      (item) => `
      <tr>
        <td>${item.descripcion}</td>
        <td style="text-align:center">${formatNumber(item.cantidad)}</td>
        <td style="text-align:center">Unidad</td>
        <td style="text-align:right">${formatNumber(item.precioUnitario)}</td>
        <td style="text-align:right">${formatNumber(item.subtotal)}</td>
      </tr>`
    )
    .join("")

  // Período (solo si hay fechas de servicio)
  const periodoHtml =
    data.periodoDesde || data.periodoHasta
      ? `
    <tr class="bill-row">
      <td colspan="2">
        <div class="row">
          <p class="col-4 margin-b-0">
            <strong>Período Facturado Desde: </strong>${data.periodoDesde || "-"}
          </p>
          <p class="col-3 margin-b-0">
            <strong>Hasta: </strong>${data.periodoHasta || "-"}
          </p>
          <p class="col-5 margin-b-0">
            <strong>Fecha de Vto. para el pago: </strong>${data.fechaVtoPago || "-"}
          </p>
        </div>
      </td>
    </tr>`
      : ""

  return `<!DOCTYPE html>
<html>
<head>
  <title>Factura ${ptoVtaStr}-${cbteNroStr}</title>
  <style type="text/css">
    *{
      box-sizing: border-box;
      -webkit-user-select: none;
      -moz-user-select: none;
      -ms-user-select: none;
      user-select: none;
    }
    .bill-container{
      width: 750px;
      position: absolute;
      left:0;
      right: 0;
      margin: auto;
      border-collapse: collapse;
      font-family: sans-serif;
      font-size: 13px;
    }
    .bill-emitter-row td{
      width: 50%;
      border-bottom: 1px solid;
      padding-top: 10px;
      padding-left: 10px;
      vertical-align: top;
    }
    .bill-emitter-row{
      position: relative;
    }
    .bill-emitter-row td:nth-child(2){
      padding-left: 60px;
    }
    .bill-emitter-row td:nth-child(1){
      padding-right: 60px;
    }
    .bill-type{
      border: 1px solid;
      border-top: 1px solid;
      border-bottom: 1px solid;
      margin-right: -30px;
      background: white;
      width: 60px;
      height: 50px;
      position: absolute;
      left: 0;
      right: 0;
      top: -1px;
      margin: auto;
      text-align: center;
      font-size: 40px;
      font-weight: 600;
    }
    .text-lg{
      font-size: 30px;
    }
    .text-center{
      text-align: center;
    }
    .col-2{ width: 16.66666667%; float: left; }
    .col-3{ width: 25%; float: left; }
    .col-4{ width: 33.3333333%; float: left; }
    .col-5{ width: 41.66666667%; float: left; }
    .col-6{ width: 50%; float: left; }
    .col-8{ width: 66.66666667%; float: left; }
    .col-10{ width: 83.33333333%; float: left; }
    .row{ overflow: hidden; }
    .margin-b-0{ margin-bottom: 0px; }
    .bill-row td{ padding-top: 5px }
    .bill-row td > div{
      border-top: 1px solid;
      border-bottom: 1px solid;
      margin: 0 -1px 0 -2px;
      padding: 0 10px 13px 10px;
    }
    .row-details table {
      border-collapse: collapse;
      width: 100%;
    }
    .row-details td > div, .row-qrcode td > div{
      border: 0;
      margin: 0 -1px 0 -2px;
      padding: 0;
    }
    .row-details table td{
      padding: 5px;
    }
    .row-details table tr:nth-child(1){
      border-top: 1px solid;
      border-bottom: 1px solid;
      background: #c0c0c0;
      font-weight: bold;
      text-align: center;
    }
    .row-details table tr + tr{
      border-top: 1px solid #c0c0c0;
    }
    .text-right{
      text-align: right;
    }
    .margin-b-10 {
      margin-bottom: 10px;
    }
    .total-row td > div{
      border-width: 2px;
    }
    .row-qrcode td{
      padding: 10px;
    }
  </style>
</head>
<body>
  <table class="bill-container">
    <tr class="bill-emitter-row">
      <td>
        <div class="bill-type">
          ${data.tipoComprobante}
        </div>
        <div class="text-lg text-center">
          ${data.razonSocial}
        </div>
        <p><strong>Razón social:</strong> ${data.razonSocial}</p>
        <p><strong>Domicilio Comercial:</strong> ${data.domicilioComercial}</p>
        <p><strong>Condición Frente al IVA:</strong> ${data.condicionIva}</p>
      </td>
      <td>
        <div>
          <div class="text-lg">
            ${data.tipoComprobanteNombre}
          </div>
          <div class="row">
            <p class="col-6 margin-b-0">
              <strong>Punto de Venta: ${ptoVtaStr}</strong>
            </p>
            <p class="col-6 margin-b-0">
              <strong>Comp. Nro: ${cbteNroStr}</strong>
            </p>
          </div>
          <p><strong>Fecha de Emisión:</strong> ${data.fechaEmision}</p>
          <p><strong>CUIT:</strong> ${data.cuit}</p>
          ${data.inicioActividades ? `<p><strong>Fecha de Inicio de Actividades:</strong> ${data.inicioActividades}</p>` : ""}
        </div>
      </td>
    </tr>
    ${periodoHtml}
    <tr class="bill-row">
      <td colspan="2">
        <div>
          <div class="row">
            <p class="col-4 margin-b-0">
              <strong>${data.receptorDocTipo}: </strong>${data.receptorDocNro}
            </p>
            <p class="col-8 margin-b-0">
              <strong>Apellido y Nombre / Razón social: </strong>${data.receptorNombre}
            </p>
          </div>
          <div class="row">
            <p class="col-6 margin-b-0">
              <strong>Condición Frente al IVA: </strong>${data.receptorCondicionIva}
            </p>
            ${data.receptorDomicilio ? `<p class="col-6 margin-b-0"><strong>Domicilio: </strong>${data.receptorDomicilio}</p>` : ""}
          </div>
        </div>
      </td>
    </tr>
    <tr class="bill-row row-details">
      <td colspan="2">
        <div>
          <table>
            <tr>
              <td>Producto / Servicio</td>
              <td>Cantidad</td>
              <td>U. Medida</td>
              <td>Precio Unit.</td>
              <td>Subtotal</td>
            </tr>
            ${itemsHtml}
          </table>
        </div>
      </td>
    </tr>
    <tr class="bill-row total-row">
      <td colspan="2">
        <div>
          <div class="row text-right">
            <p class="col-10 margin-b-0">
              <strong>Subtotal: ${monSymbol}</strong>
            </p>
            <p class="col-2 margin-b-0">
              <strong>${formatNumber(data.subtotal)}</strong>
            </p>
          </div>
          <div class="row text-right">
            <p class="col-10 margin-b-0">
              <strong>Importe Otros Tributos: ${monSymbol}</strong>
            </p>
            <p class="col-2 margin-b-0">
              <strong>${formatNumber(data.impOtrosTributos)}</strong>
            </p>
          </div>
          <div class="row text-right">
            <p class="col-10 margin-b-0">
              <strong>Importe total: ${monSymbol}</strong>
            </p>
            <p class="col-2 margin-b-0">
              <strong>${formatNumber(data.impTotal)}</strong>
            </p>
          </div>
        </div>
      </td>
    </tr>
    <tr class="bill-row row-details">
      <td>
        <div>
          ${data.qrCodeUrl ? `<img style="width:120px" src="${data.qrCodeUrl}" />` : ""}
        </div>
      </td>
      <td>
        <div>
          <div class="row text-right margin-b-10">
            <strong>CAE Nro:&nbsp;</strong> ${data.cae}
          </div>
          <div class="row text-right">
            <strong>Fecha de Vto. de CAE:&nbsp;</strong> ${data.caeFchVto}
          </div>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>`
}

/**
 * Prepara los datos de una factura de la DB para generar el HTML del PDF
 */
export function prepareInvoicePdfData(invoice: any, agency: any, afipConfig: any): InvoicePdfData {
  return {
    // Prioridad: datos fiscales cargados en afip_config > datos de agencia > fallback
    razonSocial: afipConfig.razon_social || agency.name || "Sin razón social",
    domicilioComercial: afipConfig.domicilio_comercial || agency.company_address_line1 || agency.city || "-",
    condicionIva: afipConfig.condicion_iva || "Monotributo",
    cuit: afipConfig.cuit,
    inicioActividades: afipConfig.inicio_actividades ? formatAfipDate(afipConfig.inicio_actividades) : undefined,

    tipoComprobante: "C",
    tipoComprobanteNombre: "Factura",
    ptoVta: invoice.pto_vta,
    cbteNro: invoice.cbte_nro,
    fechaEmision: formatAfipDate(invoice.fecha_emision),

    periodoDesde: invoice.fch_serv_desde ? formatAfipDate(invoice.fch_serv_desde) : undefined,
    periodoHasta: invoice.fch_serv_hasta ? formatAfipDate(invoice.fch_serv_hasta) : undefined,
    fechaVtoPago: invoice.fecha_vto_pago ? formatAfipDate(invoice.fecha_vto_pago) : undefined,

    receptorDocTipo: DOC_TYPE_LABELS[invoice.receptor_doc_tipo] || "Doc.",
    receptorDocNro: invoice.receptor_doc_nro || "0",
    receptorNombre: invoice.receptor_nombre || "-",
    receptorCondicionIva: IVA_CONDITION_LABELS[invoice.receptor_condicion_iva] || "Consumidor Final",

    items: invoice.invoice_items?.length > 0
      ? invoice.invoice_items.map((item: any) => ({
          descripcion: item.descripcion || "Servicio",
          cantidad: item.cantidad || 1,
          precioUnitario: item.precio_unitario || invoice.imp_total,
          subtotal: item.subtotal || invoice.imp_total,
        }))
      : [
          {
            descripcion: invoice.notes || "Servicio",
            cantidad: 1,
            precioUnitario: invoice.imp_total,
            subtotal: invoice.imp_total,
          },
        ],

    subtotal: invoice.imp_neto || invoice.imp_total,
    impOtrosTributos: invoice.imp_trib || 0,
    impTotal: invoice.imp_total,
    moneda: invoice.moneda || "PES",

    cae: invoice.cae,
    caeFchVto: formatAfipDate(invoice.cae_fch_vto),
  }
}
