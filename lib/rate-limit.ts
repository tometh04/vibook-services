/**
 * Rate Limiting para endpoints críticos
 * Previene ataques de fuerza bruta y abuso del sistema
 */

interface RateLimitConfig {
  maxRequests: number
  windowMs: number
}

// Configuraciones por endpoint
const RATE_LIMITS: Record<string, RateLimitConfig> = {
  '/api/billing/checkout': { maxRequests: 5, windowMs: 60 * 1000 }, // 5 requests por minuto
  '/api/billing/change-plan': { maxRequests: 3, windowMs: 60 * 1000 }, // 3 requests por minuto
  '/api/admin/subscriptions': { maxRequests: 20, windowMs: 60 * 1000 }, // 20 requests por minuto
  '/api/operations': { maxRequests: 30, windowMs: 60 * 1000 }, // 30 requests por minuto (POST)
  '/api/settings/users/invite': { maxRequests: 10, windowMs: 60 * 1000 }, // 10 requests por minuto
  '/api/leads': { maxRequests: 30, windowMs: 60 * 1000 }, // 30 requests por minuto (POST)
  '/api/customers': { maxRequests: 30, windowMs: 60 * 1000 }, // 30 requests por minuto (POST)
  '/api/ai': { maxRequests: 15, windowMs: 60 * 1000 }, // 15 requests por minuto (Cerebro)
}

// In-memory store (en producción usar Redis)
const requestCounts = new Map<string, { count: number; resetAt: number }>()

/**
 * Verifica rate limit para un endpoint
 * @param endpoint - Ruta del endpoint
 * @param identifier - Identificador único (user ID, IP, etc.)
 * @returns true si está dentro del límite, false si excedió
 */
export function checkRateLimit(
  endpoint: string,
  identifier: string
): { allowed: boolean; remaining: number; resetAt: number } {
  const config = RATE_LIMITS[endpoint]
  
  if (!config) {
    // Si no hay configuración, permitir
    return { allowed: true, remaining: Infinity, resetAt: Date.now() }
  }

  const key = `${endpoint}:${identifier}`
  const now = Date.now()
  const record = requestCounts.get(key)

  // Si no existe o expiró, crear nuevo registro
  if (!record || now > record.resetAt) {
    requestCounts.set(key, {
      count: 1,
      resetAt: now + config.windowMs
    })
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: now + config.windowMs
    }
  }

  // Si está dentro de la ventana, incrementar contador
  if (record.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: record.resetAt
    }
  }

  record.count++
  requestCounts.set(key, record)

  return {
    allowed: true,
    remaining: config.maxRequests - record.count,
    resetAt: record.resetAt
  }
}

/**
 * Limpia registros expirados (ejecutar periódicamente)
 */
export function cleanupExpiredRecords() {
  const now = Date.now()
  // Usar Array.from para compatibilidad con TypeScript
  const entries = Array.from(requestCounts.entries())
  for (const [key, record] of entries) {
    if (now > record.resetAt) {
      requestCounts.delete(key)
    }
  }
}

// Limpiar cada 5 minutos
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupExpiredRecords, 5 * 60 * 1000)
}
