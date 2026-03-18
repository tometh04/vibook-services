import { MercadoPagoConfig, Preference, PreApproval } from 'mercadopago'

// Inicializar cliente de Mercado Pago
const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN!

if (!accessToken) {
  console.warn('⚠️ MERCADOPAGO_ACCESS_TOKEN no está configurado')
}

const client = accessToken ? new MercadoPagoConfig({ 
  accessToken,
  options: {
    timeout: 5000,
  }
}) : null

export const preference = client ? new Preference(client) : null
export const preApproval = client ? new PreApproval(client) : null

// Helper para crear preferencia de pago inicial
export async function createPreference(data: {
  items: Array<{
    title: string
    quantity: number
    unit_price: number
  }>
  payer: {
    email: string
    name?: string
  }
  back_urls?: {
    success?: string
    failure?: string
    pending?: string
  }
  auto_return?: 'approved' | 'all'
  external_reference?: string
  notification_url?: string
}) {
  if (!preference || !client) {
    throw new Error('Mercado Pago no está configurado. Verifica MERCADOPAGO_ACCESS_TOKEN')
  }

  return await preference.create({
    body: {
      items: data.items.map(item => ({
        title: item.title,
        quantity: item.quantity,
        unit_price: item.unit_price,
        currency_id: 'ARS'
      })),
      payer: {
        email: data.payer.email,
        name: data.payer.name
      },
      back_urls: data.back_urls || {},
      auto_return: data.auto_return || 'approved',
      external_reference: data.external_reference,
      notification_url: data.notification_url,
    } as any
  })
}

// Helper para crear preapproval (suscripción recurrente)
// Usa llamada directa a la API REST de MercadoPago para evitar problemas con el SDK
export async function createPreApproval(data: {
  reason: string
  auto_recurring: {
    frequency: number
    frequency_type: string
    transaction_amount: number
    currency_id: 'ARS'
    start_date?: string
    end_date?: string
  }
  payer_email: string
  card_token_id?: string
  external_reference?: string
  back_url?: string
}) {
  if (!accessToken) {
    throw new Error('Mercado Pago no está configurado. Verifica MERCADOPAGO_ACCESS_TOKEN')
  }

  // Construir body limpio (sin campos undefined)
  const body: Record<string, any> = {
    reason: data.reason,
    payer_email: data.payer_email,
    auto_recurring: {
      frequency: data.auto_recurring.frequency,
      frequency_type: data.auto_recurring.frequency_type,
      transaction_amount: data.auto_recurring.transaction_amount,
      currency_id: data.auto_recurring.currency_id,
    },
  }

  if (data.auto_recurring.start_date) {
    body.auto_recurring.start_date = data.auto_recurring.start_date
  }
  if (data.auto_recurring.end_date) {
    body.auto_recurring.end_date = data.auto_recurring.end_date
  }
  if (data.card_token_id) {
    body.card_token_id = data.card_token_id
  }
  if (data.external_reference) {
    body.external_reference = data.external_reference
  }
  if (data.back_url) {
    body.back_url = data.back_url
  }

  console.log('[MP] Creando preapproval con body:', JSON.stringify(body, null, 2))

  try {
    const response = await fetch('https://api.mercadopago.com/preapproval', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    })

    const result = await response.json()

    if (!response.ok) {
      console.error('[MP] Error response:', JSON.stringify(result, null, 2))
      console.error('[MP] Status:', response.status)
      throw new Error(result.message || result.error || `HTTP ${response.status}`)
    }

    console.log('[MP] Preapproval creado OK:', result.id, '- init_point:', result.init_point ? 'presente' : 'ausente')
    return result
  } catch (error: any) {
    console.error('[MP] Error creando preapproval:', error.message)
    console.error('[MP] Datos enviados:', JSON.stringify({ ...body, payer_email: body.payer_email?.substring(0, 3) + '***' }, null, 2))
    throw new Error(`Error al crear preapproval: ${error.message || 'Error desconocido'}`)
  }
}

// Helper para obtener preapproval por ID
export async function getPreApproval(preapprovalId: string) {
  if (!preApproval || !client) {
    throw new Error('Mercado Pago no está configurado. Verifica MERCADOPAGO_ACCESS_TOKEN')
  }

  return await preApproval.get({ id: preapprovalId })
}

// Helper para actualizar preapproval (status, reason, y/o monto recurrente)
export async function updatePreApproval(preapprovalId: string, data: {
  status?: 'authorized' | 'paused' | 'cancelled'
  reason?: string
  auto_recurring?: {
    transaction_amount: number
    currency_id?: 'ARS'
  }
}) {
  if (!preApproval || !client) {
    throw new Error('Mercado Pago no está configurado. Verifica MERCADOPAGO_ACCESS_TOKEN')
  }

  const body: any = {}
  if (data.status) body.status = data.status
  if (data.reason) body.reason = data.reason
  if (data.auto_recurring) body.auto_recurring = data.auto_recurring

  return await preApproval.update({
    id: preapprovalId,
    body
  })
}

// Helper para cancelar preapproval
export async function cancelPreApproval(preapprovalId: string) {
  if (!preApproval || !client) {
    throw new Error('Mercado Pago no está configurado. Verifica MERCADOPAGO_ACCESS_TOKEN')
  }

  return await preApproval.update({
    id: preapprovalId,
    body: {
      status: 'cancelled'
    }
  })
}
