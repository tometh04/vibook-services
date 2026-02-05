/**
 * Cliente HTTP para AFIP SDK API REST (Multi-tenant por agencia)
 * Documentación: https://afipsdk.com/docs/api-reference/introduction/
 */

import {
  CreateInvoiceRequest,
  CreateInvoiceResponse,
  GetLastVoucherRequest,
  GetLastVoucherResponse,
  GetTaxpayerDataRequest,
  GetTaxpayerDataResponse,
  TipoComprobante,
} from './types'
import { SupabaseClient } from '@supabase/supabase-js'

// Config global (API key es de la plataforma, no por agencia)
const AFIP_SDK_BASE_URL = process.env.AFIP_SDK_BASE_URL || 'https://app.afipsdk.com/api/v1'
const AFIP_SDK_API_KEY = process.env.AFIP_SDK_API_KEY || ''

// Headers comunes para todas las requests
const getHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${AFIP_SDK_API_KEY}`,
})

export interface AgencyAfipConfig {
  cuit: string
  environment: string
  punto_venta: number
  is_active: boolean
  automation_status: string
}

/**
 * Obtiene la configuración AFIP de una agencia desde la BD
 */
export async function getAgencyAfipConfig(
  supabase: SupabaseClient,
  agencyId: string
): Promise<AgencyAfipConfig | null> {
  const { data, error } = await supabase
    .from('afip_config')
    .select('cuit, environment, punto_venta, is_active, automation_status')
    .eq('agency_id', agencyId)
    .eq('is_active', true)
    .maybeSingle()

  if (error || !data) return null
  return data as AgencyAfipConfig
}

/**
 * Hace una request a la API de AFIP SDK
 */
async function afipRequest<T>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: Record<string, any>
): Promise<T> {
  const url = `${AFIP_SDK_BASE_URL}${endpoint}`

  console.log(`[AFIP SDK] ${method} ${url}`)

  try {
    const response = await fetch(url, {
      method,
      headers: getHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('[AFIP SDK] Error response:', data)
      throw new Error(data.message || data.error || `Error ${response.status}`)
    }

    console.log('[AFIP SDK] Success response:', JSON.stringify(data).substring(0, 500))
    return data
  } catch (error: any) {
    console.error('[AFIP SDK] Request failed:', error)
    throw error
  }
}

/**
 * Verifica si AFIP está configurado para una agencia
 */
export async function isAfipConfiguredForAgency(
  supabase: SupabaseClient,
  agencyId: string
): Promise<boolean> {
  const config = await getAgencyAfipConfig(supabase, agencyId)
  return !!config && !!AFIP_SDK_API_KEY && config.automation_status === 'complete'
}

/**
 * Verifica si la API de AFIP está configurada (legacy - usa env vars)
 */
export function isAfipConfigured(): boolean {
  return !!AFIP_SDK_API_KEY
}

/**
 * Crea una instancia del SDK de AFIP para una agencia
 */
function createAfipInstance(config?: { cuit: string; environment: string }) {
  const Afip = require('@afipsdk/afip.js')
  const cuit = config?.cuit || process.env.AFIP_CUIT || ''
  const environment = config?.environment || process.env.AFIP_SDK_ENVIRONMENT || 'sandbox'
  const isProd = environment === 'production' || environment === 'prod'

  return new Afip({
    CUIT: cuit,
    production: isProd,
    access_token: AFIP_SDK_API_KEY,
  })
}

/**
 * Obtiene el último número de comprobante
 */
export async function getLastVoucherNumber(
  ptoVta: number,
  cbteTipo: TipoComprobante,
  config?: { cuit: string; environment: string }
): Promise<GetLastVoucherResponse> {
  try {
    const afip = createAfipInstance(config)
    const lastVoucher = await afip.ElectronicBilling.getLastVoucher(ptoVta, cbteTipo)

    return {
      success: true,
      data: {
        CbteNro: lastVoucher || 0,
        PtoVta: ptoVta,
        CbteTipo: cbteTipo,
      },
    }
  } catch (error: any) {
    console.error('[AFIP SDK] getLastVoucherNumber error:', error)
    return {
      success: false,
      error: error.message || 'Error al obtener último comprobante',
    }
  }
}

/**
 * Crea una factura electrónica usando el SDK de AFIP
 * Usa createNextVoucher que obtiene el último número automáticamente
 */
export async function createInvoice(
  request: CreateInvoiceRequest,
  config?: { cuit: string; environment: string }
): Promise<CreateInvoiceResponse> {
  try {
    const afip = createAfipInstance(config)

    // Determinar si es Factura C (tipo 11) - no discrimina IVA
    const esFacturaC = request.CbteTipo === 11

    // Convertir fecha a número entero (yyyymmdd) como requiere el SDK
    const cbteFch = parseInt((request.CbteFch || formatDate(new Date())).replace(/\D/g, ''), 10)

    // Construir datos del comprobante para createNextVoucher
    const voucherData: Record<string, any> = {
      CantReg: 1,
      PtoVta: request.PtoVta,
      CbteTipo: request.CbteTipo,
      Concepto: request.Concepto,
      DocTipo: request.DocTipo,
      DocNro: request.DocNro,
      CondicionIVAReceptorId: request.CondicionIVAReceptorId,
      CbteFch: cbteFch,
      ImpTotal: request.ImpTotal,
      // Factura C: ImpNeto = total, ImpTotConc = 0, ImpIVA = 0 (no discrimina IVA)
      ImpTotConc: esFacturaC ? 0 : (request.ImpTotConc || 0),
      ImpNeto: esFacturaC ? request.ImpTotal : request.ImpNeto,
      ImpOpEx: request.ImpOpEx || 0,
      ImpIVA: esFacturaC ? 0 : (request.ImpIVA || 0),
      ImpTrib: request.ImpTrib || 0,
      MonId: request.MonId || 'PES',
      MonCotiz: request.MonCotiz || 1,
    }

    // Agregar IVA solo si NO es Factura C
    if (!esFacturaC && request.Iva && request.Iva.length > 0) {
      voucherData.Iva = request.Iva
    }

    // Agregar tributos si existen
    if (request.Tributos && request.Tributos.length > 0) {
      voucherData.Tributos = request.Tributos
    }

    // Agregar comprobantes asociados si existen
    if (request.CbtesAsoc && request.CbtesAsoc.length > 0) {
      voucherData.CbtesAsoc = request.CbtesAsoc
    }

    // Agregar opcionales si existen
    if (request.Opcionales && request.Opcionales.length > 0) {
      voucherData.Opcionales = request.Opcionales
    }

    // Agregar fechas de servicio si el concepto es servicios (2) o productos y servicios (3)
    if (request.Concepto === 2 || request.Concepto === 3) {
      if (request.FchServDesde) {
        voucherData.FchServDesde = parseInt(String(request.FchServDesde).replace(/\D/g, ''), 10)
      }
      if (request.FchServHasta) {
        voucherData.FchServHasta = parseInt(String(request.FchServHasta).replace(/\D/g, ''), 10)
      }
      if (request.FchVtoPago) {
        voucherData.FchVtoPago = parseInt(String(request.FchVtoPago).replace(/\D/g, ''), 10)
      }
    }

    console.log('[AFIP SDK] createNextVoucher data:', JSON.stringify(voucherData))

    // Paso 1: obtener último comprobante
    const lastVoucher = await afip.ElectronicBilling.getLastVoucher(request.PtoVta, request.CbteTipo)
    const voucherNumber = lastVoucher + 1

    console.log('[AFIP SDK] lastVoucher:', lastVoucher, 'next:', voucherNumber)

    // Paso 2: asignar números de comprobante
    voucherData.CbteDesde = voucherNumber
    voucherData.CbteHasta = voucherNumber

    // Paso 3: crear comprobante con returnResponse=true para ver respuesta completa de AFIP
    const fullResponse = await afip.ElectronicBilling.createVoucher(voucherData, true)

    console.log('[AFIP SDK] createVoucher fullResponse:', JSON.stringify(fullResponse).substring(0, 1000))

    // Extraer detalle del response
    let detResponse = fullResponse?.FeDetResp?.FECAEDetResponse
    if (Array.isArray(detResponse)) {
      detResponse = detResponse[0]
    }

    if (detResponse?.CAE) {
      return {
        success: true,
        data: {
          CAE: detResponse.CAE,
          CAEFchVto: detResponse.CAEFchVto,
          CbteDesde: voucherNumber,
          CbteHasta: voucherNumber,
          FchProceso: fullResponse?.FeCabResp?.FchProceso || new Date().toISOString(),
          Resultado: detResponse.Resultado || 'A',
        },
      }
    } else {
      // Extraer observaciones/errores de AFIP
      const obs = detResponse?.Observaciones?.Obs
      const errores = fullResponse?.Errors?.Err
      const errorList = obs || errores || []
      const errorArr = Array.isArray(errorList) ? errorList : [errorList]
      const errorMsg = errorArr.map((e: any) => `(${e.Code}) ${e.Msg}`).join('; ')

      return {
        success: false,
        error: errorMsg || 'No se recibió CAE de AFIP',
        data: {
          CAE: '',
          CAEFchVto: '',
          CbteDesde: voucherNumber,
          CbteHasta: voucherNumber,
          FchProceso: new Date().toISOString(),
          Resultado: detResponse?.Resultado || 'R',
          Errores: errorArr,
        },
      }
    }
  } catch (error: any) {
    // El SDK intercepta axios errors: error.data contiene la respuesta del servidor
    const afipErrorData = error?.data || error?.response?.data
    const afipErrorMsg = afipErrorData?.message || afipErrorData?.error || error.message || 'Error al crear factura'
    console.error('[AFIP SDK] createInvoice error:', afipErrorMsg)
    console.error('[AFIP SDK] error.data:', JSON.stringify(afipErrorData || {}).substring(0, 1000))
    console.error('[AFIP SDK] error.status:', error?.status)
    return {
      success: false,
      error: afipErrorMsg,
      data: {
        CAE: '',
        CAEFchVto: '',
        CbteDesde: 0,
        CbteHasta: 0,
        FchProceso: new Date().toISOString(),
        Resultado: 'R',
        Errores: afipErrorData?.errores || afipErrorData?.Errors?.Err || [{ Code: 0, Msg: afipErrorMsg }],
      },
    }
  }
}

/**
 * Espera que una automatización de AFIP SDK termine (polling)
 */
async function waitForAutomation(
  automationId: string,
  label: string
): Promise<{ success: boolean; error?: string }> {
  const maxAttempts = 24 // 2 minutos
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(resolve => setTimeout(resolve, 5000))

    const statusResponse = await afipRequest<any>(
      `/automations/${automationId}`,
      'GET'
    )

    console.log(`[AFIP ${label}] Polling ${i + 1}/${maxAttempts}: status=${statusResponse.status}`)

    if (statusResponse.status === 'complete') {
      return { success: true }
    }

    if (statusResponse.status === 'error' || statusResponse.status === 'failed') {
      return {
        success: false,
        error: statusResponse.data?.message || statusResponse.data?.error || statusResponse.error || `${label} falló`,
      }
    }

    if (statusResponse.status !== 'in_process') {
      return { success: false, error: `Estado inesperado: ${statusResponse.status}` }
    }
  }
  return { success: false, error: `Timeout: ${label} tardó demasiado` }
}

/**
 * Ejecuta el flujo completo de vinculación AFIP usando el SDK JS:
 * 1. Crear certificado de producción (create-cert-prod)
 * 2. Autorizar web service de producción (auth-web-service-prod)
 *
 * IMPORTANTE: Usamos el SDK JS (CreateAutomation) en vez de REST API directo
 * para que el cert/key quede correctamente asociado al access_token en el backend.
 */
export async function runAfipAutomation(
  cuit: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const Afip = require('@afipsdk/afip.js')
    const afip = new Afip({
      CUIT: cuit,
      production: true,
      access_token: AFIP_SDK_API_KEY,
    })

    // Paso 1: Crear certificado de producción
    console.log('[AFIP Automation] Paso 1: Creando certificado de producción via SDK...')
    try {
      const certResult = await afip.CreateAutomation('create-cert-prod', {
        cuit,
        username: cuit,
        password,
        alias: 'afipsdk',
      })
      console.log('[AFIP Automation] Paso 1 resultado:', JSON.stringify(certResult).substring(0, 500))
    } catch (certError: any) {
      const errMsg = certError?.data?.message || certError.message || ''
      // Si falla porque ya existe, continuar
      if (errMsg.includes('ya existe') || errMsg.includes('already exists') || errMsg.includes('already')) {
        console.log('[AFIP Automation] Certificado ya existe, continuando...')
      } else {
        console.error('[AFIP Automation] Error paso 1:', errMsg)
        return { success: false, error: `Error creando certificado: ${errMsg}` }
      }
    }

    // Paso 2: Autorizar web service wsfe
    console.log('[AFIP Automation] Paso 2: Autorizando web service wsfe via SDK...')
    try {
      const authResult = await afip.CreateAutomation('auth-web-service-prod', {
        cuit,
        username: cuit,
        password,
        alias: 'afipsdk',
        service: 'wsfe',
      })
      console.log('[AFIP Automation] Paso 2 resultado:', JSON.stringify(authResult).substring(0, 500))

      if (authResult.status === 'complete') {
        return { success: true }
      }
      return { success: false, error: `Estado inesperado: ${authResult.status}` }
    } catch (authError: any) {
      const errMsg = authError?.data?.message || authError.message || ''
      console.error('[AFIP Automation] Error paso 2:', errMsg)
      return { success: false, error: `Error autorizando WS: ${errMsg}` }
    }
  } catch (error: any) {
    return { success: false, error: error.message || 'Error en automatización AFIP' }
  }
}

/**
 * Consulta datos de un contribuyente por CUIT
 */
export async function getTaxpayerData(
  cuit: number
): Promise<GetTaxpayerDataResponse> {
  try {
    const response = await afipRequest<any>(
      `/padron/contribuyente/${cuit}`,
      'GET'
    )

    return {
      success: true,
      data: {
        cuit: response.cuit || cuit,
        nombre: response.nombre || response.razonSocial || '',
        domicilio: response.domicilio?.direccion,
        tipoPersona: response.tipoPersona,
        condicionIva: response.condicionIva,
        monotributo: response.monotributo,
        empleador: response.empleador,
        actividades: response.actividades,
      },
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Error al consultar contribuyente',
    }
  }
}

/**
 * Obtiene los puntos de venta habilitados
 */
export async function getPointsOfSale(
  config?: { cuit: string; environment: string }
): Promise<{
  success: boolean
  data?: Array<{
    numero: number
    tipo: string
    bloqueado: boolean
  }>
  error?: string
}> {
  try {
    const afip = createAfipInstance(config)
    const ptosVta = await afip.ElectronicBilling.getSalesPoints()

    return {
      success: true,
      data: (ptosVta || []).map((pv: any) => ({
        numero: pv.Nro,
        tipo: pv.EmisionTipo,
        bloqueado: pv.Bloqueado === 'S',
      })),
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Error al obtener puntos de venta',
    }
  }
}

/**
 * Verifica la conexión con AFIP para una agencia
 */
export async function testConnection(
  config?: { cuit: string; environment: string; punto_venta: number }
): Promise<{
  success: boolean
  message: string
  environment: string
  cuit: string
}> {
  try {
    if (!AFIP_SDK_API_KEY) {
      return {
        success: false,
        message: 'AFIP SDK no está configurado. Verifique AFIP_SDK_API_KEY.',
        environment: '',
        cuit: '',
      }
    }

    const cuit = config?.cuit || process.env.AFIP_CUIT || ''
    const environment = config?.environment || process.env.AFIP_SDK_ENVIRONMENT || 'sandbox'
    const ptoVta = config?.punto_venta || parseInt(process.env.AFIP_POINT_OF_SALE || '1', 10)

    const result = await getLastVoucherNumber(ptoVta, 6, { cuit, environment })

    if (result.success) {
      return {
        success: true,
        message: `Conexión exitosa. Último comprobante: ${result.data?.CbteNro || 0}`,
        environment,
        cuit,
      }
    } else {
      return {
        success: false,
        message: result.error || 'Error de conexión',
        environment,
        cuit,
      }
    }
  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'Error de conexión',
      environment: '',
      cuit: '',
    }
  }
}

// Helpers

/**
 * Formatea una fecha para AFIP (YYYYMMDD)
 */
export function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}${month}${day}`
}

/**
 * Parsea una fecha de AFIP (YYYYMMDD) a Date
 */
export function parseAfipDate(dateStr: string): Date {
  const year = parseInt(dateStr.substring(0, 4), 10)
  const month = parseInt(dateStr.substring(4, 6), 10) - 1
  const day = parseInt(dateStr.substring(6, 8), 10)
  return new Date(year, month, day)
}

/**
 * Calcula el IVA de un monto
 */
export function calculateIVA(neto: number, porcentaje: number): number {
  return Math.round(neto * (porcentaje / 100) * 100) / 100
}

/**
 * Determina el tipo de factura según la condición IVA del cliente
 */
export function determineInvoiceType(
  emisorCondicion: number,
  receptorCondicion: number,
  isExport: boolean = false
): TipoComprobante {
  if (isExport) {
    return 19 // Factura E
  }

  if (emisorCondicion === 1) {
    if (receptorCondicion === 1) {
      return 1 // Factura A
    }
    return 6 // Factura B
  }

  if (emisorCondicion === 6 || emisorCondicion === 11) {
    return 11 // Factura C
  }

  return 6
}
