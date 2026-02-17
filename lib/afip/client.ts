import Afip from "@afipsdk/afip.js"

/**
 * Crea una instancia del cliente AFIP SDK.
 * El access_token es la API key de app.afipsdk.com (env var AFIP_SDK_TOKEN).
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
 */
export async function setupAfipCertificate(
  cuit: number,
  username: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const afip = getAfipClient(cuit)

    // Paso 1: Crear certificado de producción
    const alias = `vibook-${cuit}`
    await afip.CreateAutomation(
      "create-cert-prod",
      { cuit: String(cuit), username, password, alias },
      true
    )

    // Paso 2: Autorizar WSFE (facturación electrónica)
    await afip.CreateAutomation(
      "auth-web-service-prod",
      { cuit: String(cuit), username, password, alias, service: "wsfe" },
      true
    )

    return { success: true }
  } catch (error: any) {
    console.error("[AFIP Setup] Error:", error?.message || error)
    return {
      success: false,
      error: error?.message || "Error desconocido al configurar AFIP",
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
    console.error("[AFIP Test] Error:", error?.message || error)
    return {
      connected: false,
      error: error?.message || "No se pudo conectar con AFIP",
    }
  }
}
