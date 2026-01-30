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
 * Helper: determina URLs de AFIP según environment
 */
function getWsfeUrls(environment: string) {
  const isProd = environment === 'production' || environment === 'prod'
  return {
    env: isProd ? 'prod' : 'dev',
    url: isProd
      ? 'https://servicios1.afip.gov.ar/wsfev1/service.asmx'
      : 'https://wswhomo.afip.gov.ar/wsfev1/service.asmx',
    wsdl: isProd
      ? 'https://servicios1.afip.gov.ar/wsfev1/service.asmx?WSDL'
      : 'https://wswhomo.afip.gov.ar/wsfev1/service.asmx?WSDL',
  }
}

/**
 * Ejecuta un método del web service wsfe via AFIP SDK
 */
async function executeWsfeMethod(
  method: string,
  params: Record<string, any>,
  config?: { cuit: string; environment: string }
): Promise<any> {
  const cuit = config?.cuit || process.env.AFIP_CUIT || ''
  const environment = config?.environment || process.env.AFIP_SDK_ENVIRONMENT || 'sandbox'
  const urls = getWsfeUrls(environment)

  const requestBody = {
    environment: urls.env,
    method,
    params,
    wsid: 'wsfe',
    url: urls.url,
    wsdl: urls.wsdl,
    soap_v_1_2: false,
    tax_id: cuit,
  }
  console.log(`[AFIP SDK] executeWsfeMethod: ${method}, cuit: ${cuit}, env: ${urls.env}`)
  console.log(`[AFIP SDK] Request body:`, JSON.stringify(requestBody).substring(0, 1000))
  return afipRequest<any>(`/afip/requests`, 'POST', requestBody)
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
    const response = await executeWsfeMethod(
      'FECompUltimoAutorizado',
      { PtoVta: ptoVta, CbteTipo: cbteTipo },
      config
    )

    return {
      success: true,
      data: {
        CbteNro: response.CbteNro || 0,
        PtoVta: ptoVta,
        CbteTipo: cbteTipo,
      },
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Error al obtener último comprobante',
    }
  }
}

/**
 * Crea una factura electrónica via AFIP SDK (FECAESolicitar)
 */
export async function createInvoice(
  request: CreateInvoiceRequest,
  config?: { cuit: string; environment: string }
): Promise<CreateInvoiceResponse> {
  try {
    // Obtener el próximo número de comprobante
    const lastVoucher = await getLastVoucherNumber(request.PtoVta, request.CbteTipo, config)
    const nextNumber = (lastVoucher.data?.CbteNro || 0) + 1

    // Construir el detalle del comprobante
    const feDetReq: Record<string, any> = {
      Concepto: request.Concepto,
      DocTipo: request.DocTipo,
      DocNro: request.DocNro,
      CbteDesde: nextNumber,
      CbteHasta: nextNumber,
      CbteFch: request.CbteFch || formatDate(new Date()),
      ImpTotal: request.ImpTotal,
      ImpTotConc: request.ImpTotConc || 0,
      ImpNeto: request.ImpNeto,
      ImpOpEx: request.ImpOpEx || 0,
      ImpIVA: request.ImpIVA || 0,
      ImpTrib: request.ImpTrib || 0,
      MonId: request.MonId || 'PES',
      MonCotiz: request.MonCotiz || 1,
    }

    // Agregar IVA si existe
    if (request.Iva && request.Iva.length > 0) {
      feDetReq.Iva = request.Iva
    }

    // Agregar tributos si existen
    if (request.Tributos && request.Tributos.length > 0) {
      feDetReq.Tributos = request.Tributos
    }

    // Agregar comprobantes asociados si existen
    if (request.CbtesAsoc && request.CbtesAsoc.length > 0) {
      feDetReq.CbtesAsoc = request.CbtesAsoc
    }

    // Agregar opcionales si existen
    if (request.Opcionales && request.Opcionales.length > 0) {
      feDetReq.Opcionales = request.Opcionales
    }

    // Agregar fechas de servicio si el concepto es servicios (2) o productos y servicios (3)
    if (request.Concepto === 2 || request.Concepto === 3) {
      feDetReq.FchServDesde = request.FchServDesde
      feDetReq.FchServHasta = request.FchServHasta
      feDetReq.FchVtoPago = request.FchVtoPago
    }

    const params = {
      FeCAEReq: {
        FeCabReq: {
          CantReg: 1,
          PtoVta: request.PtoVta,
          CbteTipo: request.CbteTipo,
        },
        FeDetReq: {
          FECAEDetRequest: feDetReq,
        },
      },
    }

    const response = await executeWsfeMethod('FECAESolicitar', params, config)

    // La respuesta viene en FECAESolicitarResult > FeDetResp > FECAEDetResponse
    const detResp = response?.FeDetResp?.FECAEDetResponse || response?.FECAEDetResponse || response
    const resultado = detResp?.Resultado || response?.Resultado

    if (resultado === 'A' && (detResp?.CAE || response?.CAE)) {
      return {
        success: true,
        data: {
          CAE: detResp?.CAE || response?.CAE,
          CAEFchVto: detResp?.CAEFchVto || response?.CAEFchVto,
          CbteDesde: detResp?.CbteDesde || nextNumber,
          CbteHasta: detResp?.CbteHasta || nextNumber,
          FchProceso: response?.FchProceso || new Date().toISOString(),
          Resultado: 'A',
          Observaciones: detResp?.Observaciones,
          Errores: response?.Errors,
        },
      }
    } else {
      return {
        success: false,
        error: detResp?.Observaciones?.Obs?.[0]?.Msg
          || response?.Errors?.Err?.[0]?.Msg
          || 'Error al crear factura',
        data: {
          CAE: '',
          CAEFchVto: '',
          CbteDesde: nextNumber,
          CbteHasta: nextNumber,
          FchProceso: new Date().toISOString(),
          Resultado: resultado || 'R',
          Errores: response?.Errors || detResp?.Observaciones,
        },
      }
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Error al crear factura',
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
 * Ejecuta el flujo completo de vinculación AFIP:
 * 1. Crear certificado de producción (create-certificate-prod)
 * 2. Autorizar web service de producción (auth-web-service-prod)
 */
export async function runAfipAutomation(
  cuit: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Paso 1: Crear certificado de producción
    console.log('[AFIP Automation] Paso 1: Creando certificado de producción...')
    const certResponse = await afipRequest<any>(
      `/automations`,
      'POST',
      {
        automation: 'create-cert-prod',
        params: {
          cuit,
          username: cuit,
          password,
          alias: 'afipsdk',
        },
      }
    )

    if (certResponse.id && certResponse.status !== 'complete') {
      const certResult = await waitForAutomation(certResponse.id, 'Certificado')
      if (!certResult.success) {
        // Si falla porque ya existe, continuar
        if (certResult.error?.includes('ya existe') || certResult.error?.includes('already exists')) {
          console.log('[AFIP Automation] Certificado ya existe, continuando...')
        } else {
          return certResult
        }
      }
    }

    // Paso 2: Autorizar web service wsfe
    console.log('[AFIP Automation] Paso 2: Autorizando web service wsfe...')
    const authResponse = await afipRequest<any>(
      `/automations`,
      'POST',
      {
        automation: 'auth-web-service-prod',
        params: {
          cuit,
          username: cuit,
          password,
          alias: 'afipsdk',
          service: 'wsfe',
        },
      }
    )

    if (authResponse.status === 'complete') {
      return { success: true }
    }

    if (!authResponse.id) {
      return { success: false, error: 'No se recibió ID de automatización' }
    }

    return await waitForAutomation(authResponse.id, 'Auth WS')
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
    const response = await executeWsfeMethod('FEParamGetPtosVenta', {}, config)

    const ptosVta = response?.ResultGet?.PtoVenta || []
    return {
      success: true,
      data: (Array.isArray(ptosVta) ? ptosVta : [ptosVta]).map((pv: any) => ({
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
