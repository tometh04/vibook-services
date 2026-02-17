import Afip from "@afipsdk/afip.js"

// ============================================
// Constantes AFIP
// ============================================

export const DOC_TIPOS = [
  { id: 80, label: "CUIT" },
  { id: 86, label: "CUIL" },
  { id: 96, label: "DNI" },
  { id: 99, label: "Consumidor Final" },
] as const

export const CBTE_TIPOS = [
  { id: 11, label: "Factura C" },
] as const

export const IVA_CONDITIONS = [
  { id: 1, label: "Responsable Inscripto" },
  { id: 4, label: "Exento" },
  { id: 5, label: "Consumidor Final" },
  { id: 6, label: "Monotributo" },
] as const

export const CONCEPTO_TIPOS = [
  { id: 1, label: "Productos" },
  { id: 2, label: "Servicios" },
  { id: 3, label: "Productos y Servicios" },
] as const

// ============================================
// Tipos
// ============================================

export interface CreateVoucherInput {
  ptoVta: number
  cbteTipo: number
  concepto: number
  docTipo: number
  docNro: string
  impTotal: number
  moneda: string       // "PES" o "DOL"
  cotizacion: number   // 1 para PES
  fchServDesde?: string // YYYY-MM-DD - requerido si concepto >= 2
  fchServHasta?: string // YYYY-MM-DD
  fchVtoPago?: string  // YYYY-MM-DD
  condicionIvaReceptor?: number
}

export interface VoucherResult {
  success: boolean
  CAE?: string
  CAEFchVto?: string
  CbteNro?: number
  error?: string
  afipResponse?: any
}

// ============================================
// Funciones
// ============================================

/**
 * Formatea una fecha Date a YYYYMMDD (number) para AFIP.
 * Ajusta por timezone para evitar problemas con UTC.
 */
export function formatDateAfip(date: Date): number {
  // Ajustar por timezone para obtener fecha local correcta
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  const str = local.toISOString().split("T")[0].replace(/-/g, "")
  return parseInt(str)
}

/**
 * Convierte fecha string "YYYY-MM-DD" a number YYYYMMDD para AFIP.
 */
export function dateStringToAfip(dateStr: string): number {
  return parseInt(dateStr.replace(/-/g, ""))
}

/**
 * Crea un comprobante electrónico en AFIP usando createNextVoucher.
 * createNextVoucher maneja automáticamente la numeración (getLastVoucher + 1).
 * Para Factura C (CbteTipo=11): ImpIVA=0, ImpNeto=ImpTotal, sin array Iva.
 */
export async function createAfipVoucher(
  afip: InstanceType<typeof Afip>,
  input: CreateVoucherInput
): Promise<VoucherResult> {
  try {
    // Fecha de hoy en formato AFIP (number YYYYMMDD)
    const today = formatDateAfip(new Date())

    // Armar datos del comprobante
    // IMPORTANTE: Todos los valores numéricos deben ser number, no string
    const voucherData: any = {
      CantReg: 1,
      PtoVta: input.ptoVta,
      CbteTipo: input.cbteTipo,
      Concepto: input.concepto,
      DocTipo: input.docTipo,
      DocNro: input.docTipo === 99 ? 0 : Number(input.docNro),
      CbteFch: today,
      ImpTotal: Number(input.impTotal),
      ImpTotConc: 0,
      ImpNeto: Number(input.impTotal), // Factura C: todo es neto
      ImpOpEx: 0,
      ImpTrib: 0,
      ImpIVA: 0, // Factura C: sin IVA discriminado
      MonId: input.moneda,
      MonCotiz: Number(input.cotizacion),
    }

    // Condición IVA del receptor
    if (input.condicionIvaReceptor) {
      voucherData.CondicionIVAReceptorId = input.condicionIvaReceptor
    }

    // Si es servicio (concepto >= 2), agregar fechas de servicio como numbers
    if (input.concepto >= 2) {
      voucherData.FchServDesde = input.fchServDesde ? dateStringToAfip(input.fchServDesde) : today
      voucherData.FchServHasta = input.fchServHasta ? dateStringToAfip(input.fchServHasta) : today
      voucherData.FchVtoPago = input.fchVtoPago ? dateStringToAfip(input.fchVtoPago) : today
    }

    // Usar createNextVoucher — maneja automáticamente CbteDesde/CbteHasta
    console.log("[AFIP createNextVoucher] Enviando a AFIP:", JSON.stringify(voucherData, null, 2))
    const result = await afip.ElectronicBilling.createNextVoucher(voucherData)

    console.log("[AFIP createNextVoucher] Resultado:", JSON.stringify(result, null, 2))

    return {
      success: true,
      CAE: result.CAE,
      CAEFchVto: result.CAEFchVto,
      CbteNro: result.voucherNumber || result.voucher_number,
      afipResponse: result,
    }
  } catch (error: any) {
    // Log completo del error para debug en Vercel
    console.error("[AFIP createNextVoucher] Error completo:", JSON.stringify({
      message: error?.message,
      code: error?.code,
      status: error?.status,
      statusText: error?.statusText,
      data: error?.data,
      responseData: error?.response?.data,
    }, null, 2))

    // El SDK enriches errors con: { message, status, statusText, data }
    // AfipWebServiceError tiene: { message: "(CODE) Msg", code }
    const afipMsg =
      error?.data?.message ||
      error?.data?.error ||
      error?.response?.data?.message ||
      error?.message ||
      "Error al emitir comprobante en AFIP"

    return {
      success: false,
      error: afipMsg,
      afipResponse: error?.data || error?.response?.data || null,
    }
  }
}
