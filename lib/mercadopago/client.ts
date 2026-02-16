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
export async function createPreApproval(data: {
  reason: string
  auto_recurring: {
    frequency: number // días entre pagos
    frequency_type: 'days'
    transaction_amount: number
    currency_id: 'ARS'
    start_date?: string // ISO date
    end_date?: string // ISO date (opcional)
  }
  payer_email: string
  card_token_id?: string
  external_reference?: string
  back_url?: string
}) {
  if (!preApproval || !client) {
    throw new Error('Mercado Pago no está configurado. Verifica MERCADOPAGO_ACCESS_TOKEN')
  }

  try {
    const result = await preApproval.create({
      body: {
        reason: data.reason,
        auto_recurring: data.auto_recurring,
        payer_email: data.payer_email,
        card_token_id: data.card_token_id,
        external_reference: data.external_reference,
        back_url: data.back_url
      } as any
    })
    
    return result as any
  } catch (error: any) {
    console.error('Error creando preapproval:', error)
    console.error('Datos enviados:', JSON.stringify(data, null, 2))
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
