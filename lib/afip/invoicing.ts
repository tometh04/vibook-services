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
 * Crea un comprobante electrónico en AFIP.
 * Para Factura C (CbteTipo=11): ImpIVA=0, ImpNeto=ImpTotal, sin array Iva.
 */
export async function createAfipVoucher(
  afip: InstanceType<typeof Afip>,
  input: CreateVoucherInput
): Promise<VoucherResult> {
  try {
    // 1. Obtener último comprobante
    const lastVoucher = await afip.ElectronicBilling.getLastVoucher(
      input.ptoVta,
      input.cbteTipo
    )
    const cbteNro = lastVoucher + 1

    // 2. Fecha de hoy en formato AFIP (number YYYYMMDD)
    const today = formatDateAfip(new Date())

    // 3. Armar datos del comprobante
    // IMPORTANTE: CbteFch y fechas deben ser NUMBER, no string
    const voucherData: any = {
      CantReg: 1,
      PtoVta: input.ptoVta,
      CbteTipo: input.cbteTipo,
      Concepto: input.concepto,
      DocTipo: input.docTipo,
      DocNro: input.docTipo === 99 ? 0 : Number(input.docNro),
      CbteDesde: cbteNro,
      CbteHasta: cbteNro,
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

    // Condición IVA del receptor — siempre incluir para Factura C
    if (input.condicionIvaReceptor) {
      voucherData.CondicionIVAReceptorId = input.condicionIvaReceptor
    }

    // Si es servicio (concepto >= 2), agregar fechas de servicio como numbers
    if (input.concepto >= 2) {
      voucherData.FchServDesde = input.fchServDesde ? dateStringToAfip(input.fchServDesde) : today
      voucherData.FchServHasta = input.fchServHasta ? dateStringToAfip(input.fchServHasta) : today
      voucherData.FchVtoPago = input.fchVtoPago ? dateStringToAfip(input.fchVtoPago) : today
    }

    // 4. Crear comprobante en AFIP
    console.log("[AFIP createVoucher] Enviando a AFIP:", JSON.stringify(voucherData, null, 2))
    const result = await afip.ElectronicBilling.createVoucher(voucherData, true)

    return {
      success: true,
      CAE: result.CAE,
      CAEFchVto: result.CAEFchVto,
      CbteNro: cbteNro,
      afipResponse: result,
    }
  } catch (error: any) {
    console.error("[AFIP createVoucher] Error completo:", JSON.stringify({
      message: error?.message,
      status: error?.status,
      data: error?.data,
      response: error?.response?.data,
      stack: error?.stack?.substring(0, 500),
    }, null, 2))

    // El SDK de AFIP puede devolver el error en distintos lugares
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
