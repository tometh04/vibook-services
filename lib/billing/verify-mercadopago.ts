/**
 * Verificación de Mercado Pago
 * CRÍTICO: Verifica que mp_preapproval_id sea válido antes de permitir ACTIVE
 */

import { getPreApproval } from "@/lib/mercadopago/client"

export interface PreApprovalVerificationResult {
  isValid: boolean
  status?: string
  error?: string
  preapproval?: any
}

/**
 * Verifica que un mp_preapproval_id existe y es válido en Mercado Pago
 */
export async function verifyPreApproval(
  preapprovalId: string | null | undefined
): Promise<PreApprovalVerificationResult> {
  if (!preapprovalId || preapprovalId === '') {
    return {
      isValid: false,
      error: "mp_preapproval_id no proporcionado"
    }
  }

  try {
    const preapproval = await getPreApproval(preapprovalId)
    const status = (preapproval as any).status

    // Estados válidos en Mercado Pago
    const validStatuses = ['authorized', 'pending']
    
    if (!validStatuses.includes(status)) {
      return {
        isValid: false,
        status,
        error: `Preapproval tiene status inválido: ${status}`
      }
    }

    return {
      isValid: true,
      status,
      preapproval: preapproval as any
    }
  } catch (error: any) {
    console.error("[verifyPreApproval] Error verificando preapproval:", error)
    return {
      isValid: false,
      error: error.message || "Error al verificar preapproval en Mercado Pago"
    }
  }
}

/**
 * Verifica que una suscripción con status ACTIVE tenga un preapproval válido
 * (excepto plan TESTER)
 */
export async function verifyActiveSubscription(
  subscription: {
    status: string
    mp_preapproval_id: string | null
    plan_id: string
  },
  planName: string
): Promise<PreApprovalVerificationResult> {
  // TESTER no requiere preapproval
  if (planName === 'TESTER') {
    return { isValid: true }
  }

  // Si status es ACTIVE, debe tener preapproval válido
  if (subscription.status === 'ACTIVE') {
    return await verifyPreApproval(subscription.mp_preapproval_id)
  }

  // Para otros estados, no requiere verificación
  return { isValid: true }
}
