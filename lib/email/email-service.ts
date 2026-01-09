/**
 * Servicio de Email usando Resend
 * 
 * Requiere configurar RESEND_API_KEY en variables de entorno
 * Soporta branding dinámico por tenant
 */

interface EmailBranding {
  appName?: string
  fromName?: string
  fromEmail?: string
  primaryColor?: string
  logoUrl?: string
}

interface EmailOptions {
  to: string | string[]
  subject: string
  html: string
  from?: string
  replyTo?: string
  branding?: EmailBranding
  attachments?: Array<{
    filename: string
    content: Buffer | string
    contentType?: string
  }>
}

interface SendEmailResult {
  success: boolean
  id?: string
  error?: string
}

// Nombre de la app por defecto (configurable via env)
const DEFAULT_APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'Vibook Gestión'
const DEFAULT_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || `${DEFAULT_APP_NAME} <noreply@vibook.app>`

export async function sendEmail(options: EmailOptions): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY

  if (!apiKey) {
    console.warn("RESEND_API_KEY no configurada, email no enviado")
    return { success: false, error: "API key no configurada" }
  }

  // Construir el remitente con branding si está disponible
  let from = options.from
  if (!from && options.branding) {
    const fromName = options.branding.fromName || options.branding.appName || DEFAULT_APP_NAME
    const fromEmail = options.branding.fromEmail || 'noreply@vibook.app'
    from = `${fromName} <${fromEmail}>`
  }
  from = from || DEFAULT_FROM_EMAIL

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: Array.isArray(options.to) ? options.to : [options.to],
        subject: options.subject,
        html: options.html,
        reply_to: options.replyTo,
        attachments: options.attachments?.map(a => ({
          filename: a.filename,
          content: typeof a.content === "string" ? a.content : a.content.toString("base64"),
        })),
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      console.error("Error sending email:", error)
      return { success: false, error: error.message || "Error al enviar email" }
    }

    const data = await response.json()
    return { success: true, id: data.id }
  } catch (error: any) {
    console.error("Error sending email:", error)
    return { success: false, error: error.message }
  }
}

/**
 * Enviar cotización por email
 */
export async function sendQuotationEmail(
  to: string,
  quotationNumber: string,
  customerName: string,
  destination: string,
  totalAmount: string,
  validUntil: string,
  agencyName: string,
  pdfBuffer?: Buffer
): Promise<SendEmailResult> {
  const html = generateQuotationEmailHtml({
    customerName,
    quotationNumber,
    destination,
    totalAmount,
    validUntil,
    agencyName,
  })

  return sendEmail({
    to,
    subject: `Cotización ${quotationNumber} - ${destination}`,
    html,
    attachments: pdfBuffer ? [{
      filename: `cotizacion-${quotationNumber}.pdf`,
      content: pdfBuffer,
      contentType: "application/pdf",
    }] : undefined,
  })
}

/**
 * Enviar confirmación de pago
 */
export async function sendPaymentConfirmationEmail(
  to: string,
  customerName: string,
  amount: string,
  paymentMethod: string,
  destination: string,
  agencyName: string
): Promise<SendEmailResult> {
  const html = generatePaymentConfirmationHtml({
    customerName,
    amount,
    paymentMethod,
    destination,
    agencyName,
  })

  return sendEmail({
    to,
    subject: `Confirmación de Pago - ${agencyName}`,
    html,
  })
}

/**
 * Enviar recordatorio de pago
 */
export async function sendPaymentReminderEmail(
  to: string,
  customerName: string,
  amount: string,
  dueDate: string,
  destination: string,
  agencyName: string
): Promise<SendEmailResult> {
  const html = generatePaymentReminderHtml({
    customerName,
    amount,
    dueDate,
    destination,
    agencyName,
  })

  return sendEmail({
    to,
    subject: `Recordatorio de Pago - ${destination}`,
    html,
  })
}

// ============================================
// TEMPLATES HTML
// ============================================

function generateQuotationEmailHtml(data: {
  customerName: string
  quotationNumber: string
  destination: string
  totalAmount: string
  validUntil: string
  agencyName: string
  primaryColor?: string
  logoUrl?: string
}): string {
  const primaryColor = data.primaryColor || '#6366f1'
  const secondaryColor = data.primaryColor ? adjustColor(data.primaryColor, -20) : '#8b5cf6'
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    ${data.logoUrl ? `<img src="${data.logoUrl}" alt="${data.agencyName}" style="max-height: 40px; margin-bottom: 10px;" />` : ''}
    <h1 style="color: white; margin: 0; font-size: 24px;">${data.agencyName}</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Cotización de Viaje</p>
  </div>
  
  <div style="background: #f9f9f9; padding: 30px; border: 1px solid #e0e0e0;">
    <p style="font-size: 18px;">Hola <strong>${data.customerName}</strong>,</p>
    
    <p>Te enviamos la cotización para tu viaje a <strong>${data.destination}</strong>.</p>
    
    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${primaryColor};">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #666;">Número de Cotización:</td>
          <td style="padding: 8px 0; text-align: right; font-weight: bold;">${data.quotationNumber}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666;">Destino:</td>
          <td style="padding: 8px 0; text-align: right; font-weight: bold;">${data.destination}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666;">Total:</td>
          <td style="padding: 8px 0; text-align: right; font-weight: bold; font-size: 20px; color: ${primaryColor};">${data.totalAmount}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666;">Válida hasta:</td>
          <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #e74c3c;">${data.validUntil}</td>
        </tr>
      </table>
    </div>
    
    <p>Adjuntamos el PDF con el detalle completo de la cotización.</p>
    
    <p style="color: #666; font-size: 14px;">
      Si tienes alguna consulta, no dudes en contactarnos.
    </p>
  </div>
  
  <div style="text-align: center; padding: 20px; color: #888; font-size: 12px;">
    <p>Este email fue enviado por ${data.agencyName}</p>
  </div>
</body>
</html>
  `
}

// Función helper para ajustar colores
function adjustColor(hex: string, amount: number): string {
  const clamp = (num: number) => Math.min(255, Math.max(0, num))
  
  let r = parseInt(hex.slice(1, 3), 16)
  let g = parseInt(hex.slice(3, 5), 16)
  let b = parseInt(hex.slice(5, 7), 16)
  
  r = clamp(r + amount)
  g = clamp(g + amount)
  b = clamp(b + amount)
  
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

function generatePaymentConfirmationHtml(data: {
  customerName: string
  amount: string
  paymentMethod: string
  destination: string
  agencyName: string
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">✓ Pago Confirmado</h1>
  </div>
  
  <div style="background: #f9f9f9; padding: 30px; border: 1px solid #e0e0e0;">
    <p style="font-size: 18px;">Hola <strong>${data.customerName}</strong>,</p>
    
    <p>Hemos recibido tu pago exitosamente. ¡Gracias!</p>
    
    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #27ae60;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #666;">Monto:</td>
          <td style="padding: 8px 0; text-align: right; font-weight: bold; font-size: 20px; color: #27ae60;">${data.amount}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666;">Método:</td>
          <td style="padding: 8px 0; text-align: right;">${data.paymentMethod}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666;">Concepto:</td>
          <td style="padding: 8px 0; text-align: right;">Viaje a ${data.destination}</td>
        </tr>
      </table>
    </div>
    
    <p style="color: #666; font-size: 14px;">
      Conserva este email como comprobante de tu pago.
    </p>
  </div>
  
  <div style="text-align: center; padding: 20px; color: #888; font-size: 12px;">
    <p>${data.agencyName}</p>
  </div>
</body>
</html>
  `
}

function generatePaymentReminderHtml(data: {
  customerName: string
  amount: string
  dueDate: string
  destination: string
  agencyName: string
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #f39c12 0%, #e74c3c 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">⏰ Recordatorio de Pago</h1>
  </div>
  
  <div style="background: #f9f9f9; padding: 30px; border: 1px solid #e0e0e0;">
    <p style="font-size: 18px;">Hola <strong>${data.customerName}</strong>,</p>
    
    <p>Te recordamos que tienes un pago pendiente para tu viaje a <strong>${data.destination}</strong>.</p>
    
    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f39c12;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #666;">Monto a pagar:</td>
          <td style="padding: 8px 0; text-align: right; font-weight: bold; font-size: 20px; color: #e74c3c;">${data.amount}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666;">Fecha de vencimiento:</td>
          <td style="padding: 8px 0; text-align: right; font-weight: bold;">${data.dueDate}</td>
        </tr>
      </table>
    </div>
    
    <p>Por favor, realiza el pago antes de la fecha indicada para confirmar tu reserva.</p>
    
    <p style="color: #666; font-size: 14px;">
      Si ya realizaste el pago, puedes ignorar este mensaje.
    </p>
  </div>
  
  <div style="text-align: center; padding: 20px; color: #888; font-size: 12px;">
    <p>${data.agencyName}</p>
  </div>
</body>
</html>
  `
}

