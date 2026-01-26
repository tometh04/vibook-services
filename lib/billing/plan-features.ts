/**
 * Helper para obtener qué plan incluye cada feature
 * Útil para mostrar información a usuarios TESTER
 */

export interface FeaturePlanInfo {
  feature: string
  planName: string
  displayName: string
}

const FEATURE_TO_PLAN_MAP: Record<string, { plan: string, displayName: string }> = {
  crm: { plan: 'STARTER', displayName: 'Starter' },
  whatsapp: { plan: 'STARTER', displayName: 'Starter' },
  reports: { plan: 'STARTER', displayName: 'Starter' },
  cerebro: { plan: 'PRO', displayName: 'Pro' },
  emilia: { plan: 'PRO', displayName: 'Pro' },
  marketing_ads: { plan: 'BUSINESS', displayName: 'Business' },
}

/**
 * Obtiene qué plan incluye una feature específica
 */
export function getPlanForFeature(feature: string): { plan: string, displayName: string } | null {
  return FEATURE_TO_PLAN_MAP[feature] || null
}

/**
 * Obtiene todas las features y sus planes correspondientes
 */
export function getAllFeaturePlans(): FeaturePlanInfo[] {
  return Object.entries(FEATURE_TO_PLAN_MAP).map(([feature, info]) => ({
    feature,
    planName: info.plan,
    displayName: info.displayName
  }))
}

/**
 * Obtiene el nombre amigable de una feature
 */
export function getFeatureDisplayName(feature: string): string {
  const names: Record<string, string> = {
    crm: 'CRM',
    whatsapp: 'WhatsApp',
    reports: 'Reportes Avanzados',
    cerebro: 'Cerebro (Asistente IA)',
    emilia: 'Emilia (Asistente IA)',
    marketing_ads: 'Marketing y Ads',
  }
  return names[feature] || feature
}
