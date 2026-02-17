import Afip from "@afipsdk/afip.js"

/**
 * Crea una instancia del cliente AFIP SDK.
 * El access_token es la API key de app.afipsdk.com (env var AFIP_SDK_TOKEN o AFIP_SDK_API_KEY).
 */
export function getAfipClient(cuit: number): InstanceType<typeof Afip> {
  const token = process.env.AFIP_SDK_TOKEN || process.env.AFIP_SDK_API_KEY
  if (!token) {
    throw new Error("AFIP_SDK_TOKEN no está configurado en las variables de entorno")
  }

  return new Afip({
    CUIT: cuit,
    access_token: token,
    production: true,
  })
}

/**
 * Ejecuta las automations del SDK para:
 * 1. Crear certificado de producción
 * 2. Autorizar el web service de facturación electrónica (WSFE)
 *
 * Las credenciales ARCA (usuario/contraseña) NO se guardan — solo se usan aquí.
 * Si el certificado ya existe, intenta igualmente autorizar el WSFE.
 */
export async function setupAfipCertificate(
  cuit: number,
  username: string,
  password: string
): Promise<{ success: boolean; error?: string; details?: any }> {
  const afip = getAfipClient(cuit)
  const alias = `vibook${cuit}` // Solo alfanumérico, sin guiones

  // Paso 1: Crear certificado de producción
  let certCreated = false
  try {
    console.log("[AFIP Setup] Creando certificado...", { cuit, alias })
    const certResult = await afip.CreateAutomation(
      "create-cert-prod",
      { cuit: String(cuit), username, password, alias },
      true
    )
    console.log("[AFIP Setup] Certificado creado:", certResult?.status)
    certCreated = true
  } catch (error: any) {
    console.error("[AFIP Setup] Error creando certificado:", {
      message: error?.message,
      status: error?.status,
      data: error?.data,
    })
    // Si falla, puede ser que ya exista — intentamos el paso 2 igualmente
  }

  // Paso 2: Autorizar WSFE (facturación electrónica)
  try {
    console.log("[AFIP Setup] Autorizando WSFE...", { cuit, alias })
    const authResult = await afip.CreateAutomation(
      "auth-web-service-prod",
      { cuit: String(cuit), username, password, alias, service: "wsfe" },
      true
    )
    console.log("[AFIP Setup] WSFE autorizado:", authResult?.status)
    return { success: true }
  } catch (error: any) {
    const errorDetail = {
      message: error?.message,
      status: error?.status,
      statusText: error?.statusText,
      data: error?.data,
    }
    console.error("[AFIP Setup] Error autorizando WSFE:", errorDetail)

    const errorMsg = error?.data?.message || error?.message || "Error desconocido"
    return {
      success: false,
      error: certCreated
        ? `Certificado creado, pero falló la autorización WSFE: ${errorMsg}`
        : `Error en la configuración AFIP: ${errorMsg}`,
      details: errorDetail,
    }
  }
}

/**
 * Prueba la conexión con AFIP intentando obtener el último comprobante.
 */
export async function testAfipConnection(
  cuit: number,
  ptoVta: number
): Promise<{ connected: boolean; lastVoucher?: number; error?: string }> {
  try {
    const afip = getAfipClient(cuit)
    const lastVoucher = await afip.ElectronicBilling.getLastVoucher(ptoVta, 11) // Factura C
    return { connected: true, lastVoucher }
  } catch (error: any) {
    console.error("[AFIP Test] Error:", {
      message: error?.message,
      status: error?.status,
      data: error?.data,
    })
    return {
      connected: false,
      error: error?.data?.message || error?.message || "No se pudo conectar con AFIP",
    }
  }
}
