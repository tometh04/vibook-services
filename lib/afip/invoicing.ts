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
  fchServDesde?: string // YYYYMMDD - requerido si concepto >= 2
  fchServHasta?: string // YYYYMMDD
  fchVtoPago?: string  // YYYYMMDD
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
 * Formatea una fecha Date a YYYYMMDD para AFIP.
 */
export function formatDateAfip(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}${m}${d}`
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

    // 2. Fecha de hoy en formato AFIP
    const today = formatDateAfip(new Date())

    // 3. Armar datos del comprobante
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
      ImpTotal: input.impTotal,
      ImpTotConc: 0,
      ImpNeto: input.impTotal, // Factura C: todo es neto
      ImpOpEx: 0,
      ImpTrib: 0,
      ImpIVA: 0, // Factura C: sin IVA discriminado
      MonId: input.moneda,
      MonCotiz: input.cotizacion,
    }

    // Condición IVA del receptor (si se provee)
    if (input.condicionIvaReceptor) {
      voucherData.CondicionIVAReceptorId = input.condicionIvaReceptor
    }

    // Si es servicio (concepto >= 2), agregar fechas de servicio
    if (input.concepto >= 2) {
      voucherData.FchServDesde = input.fchServDesde || today
      voucherData.FchServHasta = input.fchServHasta || today
      voucherData.FchVtoPago = input.fchVtoPago || today
    }

    // 4. Crear comprobante en AFIP
    const result = await afip.ElectronicBilling.createVoucher(voucherData, true)

    return {
      success: true,
      CAE: result.CAE,
      CAEFchVto: result.CAEFchVto,
      CbteNro: cbteNro,
      afipResponse: result,
    }
  } catch (error: any) {
    console.error("[AFIP createVoucher] Error:", error?.message || error)
    return {
      success: false,
      error: error?.message || "Error al emitir comprobante en AFIP",
      afipResponse: error?.response?.data || null,
    }
  }
}
