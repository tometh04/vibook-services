import Afip from "@afipsdk/afip.js"

/**
 * Crea una instancia del cliente AFIP SDK.
 * El access_token es la API key de app.afipsdk.com (env var AFIP_SDK_TOKEN o AFIP_SDK_API_KEY).
 * Para operaciones que requieren autenticación WSFE (facturación), se necesitan cert y key.
 */
export function getAfipClient(
  cuit: number,
  opts?: { cert?: string; key?: string }
): InstanceType<typeof Afip> {
  const token = process.env.AFIP_SDK_TOKEN || process.env.AFIP_SDK_API_KEY
  if (!token) {
    throw new Error("AFIP_SDK_TOKEN no está configurado en las variables de entorno")
  }

  const config: any = {
    CUIT: cuit,
    access_token: token,
    production: true,
  }

  // Agregar certificado y key si están disponibles (requeridos para facturación)
  if (opts?.cert) {
    config.cert = opts.cert
  }
  if (opts?.key) {
    config.key = opts.key
  }

  return new Afip(config)
}

/**
 * Lanza SOLO la creación de certificado (wait=false, retorna inmediato).
 * La autorización WSFE se lanza DESPUÉS, cuando el cert esté completo.
 * Las credenciales ARCA NO se guardan.
 */
export async function startCertAutomation(
  cuit: number,
  username: string,
  password: string
): Promise<{ success: boolean; automationId?: string; error?: string }> {
  const afip = getAfipClient(cuit)
  const alias = `vibook${cuit}`

  try {
    console.log("[AFIP Setup] Lanzando creación de certificado...", { cuit, alias })
    const result = await afip.CreateAutomation(
      "create-cert-prod",
      { cuit: String(cuit), username, password, alias },
      false
    )
    console.log("[AFIP Setup] Cert automation lanzada:", result)
    return { success: true, automationId: result.id }
  } catch (error: any) {
    console.error("[AFIP Setup] Error lanzando cert automation:", {
      message: error?.message,
      status: error?.status,
      data: error?.data,
    })
    return {
      success: false,
      error: error?.data?.message || error?.message || "Error al iniciar creación de certificado",
    }
  }
}

/**
 * Lanza SOLO la autorización WSFE (wait=false, retorna inmediato).
 * Debe ejecutarse DESPUÉS de que el certificado esté creado.
 */
export async function startWsfeAutomation(
  cuit: number,
  username: string,
  password: string
): Promise<{ success: boolean; automationId?: string; error?: string }> {
  const afip = getAfipClient(cuit)
  const alias = `vibook${cuit}`

  try {
    console.log("[AFIP Setup] Lanzando autorización WSFE...", { cuit, alias })
    const result = await afip.CreateAutomation(
      "auth-web-service-prod",
      { cuit: String(cuit), username, password, alias, service: "wsfe" },
      false
    )
    console.log("[AFIP Setup] WSFE automation lanzada:", result)
    return { success: true, automationId: result.id }
  } catch (error: any) {
    console.error("[AFIP Setup] Error lanzando WSFE automation:", {
      message: error?.message,
      status: error?.status,
      data: error?.data,
    })
    return {
      success: false,
      error: error?.data?.message || error?.message || "Error al autorizar WSFE",
    }
  }
}

/**
 * Checkea el status de una automation sin esperar (wait=false).
 * Retorna el status actual: 'pending', 'running', 'complete', 'error', etc.
 */
export async function checkAutomationStatus(
  cuit: number,
  automationId: string
): Promise<{ id: string; status: string; data?: any; error?: string }> {
  try {
    const afip = getAfipClient(cuit)
    const result = await afip.GetAutomationDetails(automationId, false)
    return result
  } catch (error: any) {
    console.error("[AFIP Check] Error:", {
      message: error?.message,
      status: error?.status,
      data: error?.data,
    })
    return {
      id: automationId,
      status: "error",
      error: error?.data?.message || error?.message || "Error verificando automation",
    }
  }
}

/**
 * Wraps a promise with a timeout. Rejects if the promise doesn't resolve in time.
 */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout: ${label} tardó más de ${ms / 1000}s`))
    }, ms)
    promise
      .then((val) => { clearTimeout(timer); resolve(val) })
      .catch((err) => { clearTimeout(timer); reject(err) })
  })
}

/**
 * Prueba la conexión con AFIP intentando obtener el último comprobante.
 * Tiene un timeout de 15 segundos para no colgar en Vercel.
 */
export async function testAfipConnection(
  cuit: number,
  ptoVta: number
): Promise<{ connected: boolean; lastVoucher?: number; error?: string }> {
  try {
    const afip = getAfipClient(cuit)
    const lastVoucher = await withTimeout(
      afip.ElectronicBilling.getLastVoucher(ptoVta, 11), // Factura C
      15000,
      "getLastVoucher"
    )
    return { connected: true, lastVoucher }
  } catch (error: any) {
    console.error("[AFIP Test] Error:", {
      message: error?.message,
      status: error?.status,
      data: error?.data,
    })
    const msg = error?.data?.message || error?.message || "No se pudo conectar con AFIP"
    return {
      connected: false,
      error: msg,
    }
  }
}
