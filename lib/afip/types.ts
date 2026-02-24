// ==========================================================
// Tipos para AFIP SDK — Facturación electrónica
// ==========================================================

/** Tipos de comprobante AFIP (Cbt_Tipo) */
export type TipoComprobante =
  | 1 | 2 | 3      // Factura / ND / NC  — A
  | 6 | 7 | 8      // Factura / ND / NC  — B
  | 11 | 12 | 13   // Factura / ND / NC  — C
  | 51 | 52 | 53   // Factura / ND / NC  — M

/** Tipos de documento del receptor */
export type TipoDocumento =
  | 80   // CUIT
  | 86   // CUIL
  | 96   // DNI
  | 99   // Sin identificar / Consumidor Final

/** Alícuotas de IVA AFIP */
export type TipoIVA =
  | 3    // 0%
  | 4    // 10.5%
  | 5    // 21%
  | 6    // 27%
  | 8    // 5%
  | 9    // 2.5%

/** Mapa de IVA Id → porcentaje */
export const IVA_PORCENTAJES: Record<TipoIVA, number> = {
  3: 0,
  4: 10.5,
  5: 21,
  6: 27,
  8: 5,
  9: 2.5,
}

/** Condición ante el IVA del receptor */
export type CondicionIVA =
  | 1   // Responsable Inscripto
  | 4   // Exento
  | 5   // Consumidor Final
  | 6   // Monotributista
  | 8   // Proveedor del Exterior
  | 9   // Cliente del Exterior
  | 10  // IVA Liberado - Ley 19.640
  | 11  // Responsable Inscripto - Agente de percepción
  | 13  // Monotributista Social

// ----- Requests & Responses -----

export interface CreateInvoiceRequest {
  CbteTipo: TipoComprobante
  PtoVta: number
  Concepto: 1 | 2 | 3
  DocTipo: TipoDocumento
  DocNro: number
  CondicionIVAReceptorId?: CondicionIVA
  CbteFch: string
  ImpTotal: number
  ImpTotConc: number
  ImpNeto: number
  ImpOpEx: number
  ImpIVA: number
  ImpTrib: number
  MonId: string
  MonCotiz: number
  Iva?: { Id: TipoIVA; BaseImp: number; Importe: number }[]
  FchServDesde?: string
  FchServHasta?: string
  FchVtoPago?: string
}

export interface CreateInvoiceResponse {
  success: boolean
  data?: {
    CAE: string
    CAEFchVto: string
    CbteDesde: number
    CbteHasta: number
    Errores?: any
  }
  error?: string
}

export interface GetLastVoucherRequest {
  cbteTipo: TipoComprobante
  ptoVta: number
}

export interface GetLastVoucherResponse {
  success: boolean
  data?: { CbteNro: number }
  error?: string
}

export interface GetTaxpayerDataRequest {
  cuit: string
}

export interface GetTaxpayerDataResponse {
  success: boolean
  data?: {
    razonSocial: string
    condicionIva: string
    domicilioFiscal: string
  }
  error?: string
}

/**
 * Labels para tipos de comprobante AFIP
 * Se usa en la UI para mostrar nombre legible del tipo de comprobante
 */
export const COMPROBANTE_LABELS: Record<number, string> = {
  1: "Factura A",
  2: "Nota de Débito A",
  3: "Nota de Crédito A",
  6: "Factura B",
  7: "Nota de Débito B",
  8: "Nota de Crédito B",
  11: "Factura C",
  12: "Nota de Débito C",
  13: "Nota de Crédito C",
  51: "Factura M",
  52: "Nota de Débito M",
  53: "Nota de Crédito M",
}
