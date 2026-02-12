// ============================================================================
// DESIGN TOKENS - Single source of truth para colores de dominio
// ============================================================================
// Todos los color maps del sistema centralizados. Importar desde aqui
// en vez de definir constantes locales en cada componente.
// ============================================================================

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/** Color semantico para valores financieros positivos/negativos */
export function financialColor(value: number): string {
  return value >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
}

/** Color semantico para variaciones porcentuales */
export function trendColor(value: number): string {
  return value >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
}

/** Genera un estilo "soft badge" consistente: border-X/30 bg-X/15 text-X dark:text-X */
export function softBadgeStyle(
  color: string,
  opts?: { borderOpacity?: string; bgOpacity?: string }
): string {
  const bo = opts?.borderOpacity ?? "30"
  const bgo = opts?.bgOpacity ?? "15"

  // Mapeo de color base a las variantes light/dark
  const colorMap: Record<string, { text: string; darkText: string }> = {
    emerald: { text: "text-emerald-600", darkText: "dark:text-emerald-300" },
    blue: { text: "text-blue-600", darkText: "dark:text-blue-300" },
    rose: { text: "text-rose-600", darkText: "dark:text-rose-300" },
    amber: { text: "text-amber-700", darkText: "dark:text-amber-300" },
    orange: { text: "text-orange-700", darkText: "dark:text-orange-300" },
    slate: { text: "text-slate-600", darkText: "dark:text-slate-300" },
    indigo: { text: "text-indigo-600", darkText: "dark:text-indigo-300" },
    purple: { text: "text-purple-600", darkText: "dark:text-purple-300" },
    red: { text: "text-red-600", darkText: "dark:text-red-300" },
    green: { text: "text-green-600", darkText: "dark:text-green-300" },
  }

  const c = colorMap[color] ?? { text: `text-${color}-600`, darkText: `dark:text-${color}-300` }
  const borderColor = color === "slate" ? `slate-400/${bo}` : `${color}-500/${bo}`

  return `border border-${borderColor} bg-${color}-500/${bgo} ${c.text} ${c.darkText}`
}

// ═══════════════════════════════════════════════════════════════════════════════
// DOMINIO: OPERACIONES
// ═══════════════════════════════════════════════════════════════════════════════

export const OPERATION_STATUS_COLORS: Record<string, string> = {
  PRE_RESERVATION: "bg-gray-500",
  RESERVED: "bg-blue-500",
  CONFIRMED: "bg-green-500",
  CANCELLED: "bg-red-500",
  TRAVELLED: "bg-purple-500",
  CLOSED: "bg-slate-500",
}

export const OPERATION_STATUS_LABELS: Record<string, string> = {
  PRE_RESERVATION: "Pre-reserva",
  RESERVED: "Reservado",
  CONFIRMED: "Confirmado",
  CANCELLED: "Cancelado",
  TRAVELLED: "Viajado",
  CLOSED: "Cerrado",
}

// ═══════════════════════════════════════════════════════════════════════════════
// DOMINIO: PAGOS
// ═══════════════════════════════════════════════════════════════════════════════

export const PAYMENT_STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-500",
  PAID: "bg-green-500",
  OVERDUE: "bg-red-500",
}

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendiente",
  PAID: "Pagado",
  OVERDUE: "Vencido",
}

// ═══════════════════════════════════════════════════════════════════════════════
// DOMINIO: CONTABILIDAD (LEDGER)
// ═══════════════════════════════════════════════════════════════════════════════

export const LEDGER_TYPE_COLORS: Record<string, string> = {
  INCOME: "bg-amber-500",
  EXPENSE: "bg-red-500",
  FX_GAIN: "bg-amber-500",
  FX_LOSS: "bg-orange-500",
  OPERATOR_PAYMENT: "bg-purple-500",
}

export const LEDGER_TYPE_LABELS: Record<string, string> = {
  INCOME: "Ingreso",
  EXPENSE: "Egreso",
  FX_GAIN: "Ganancia Cambio",
  FX_LOSS: "Perdida Cambio",
  OPERATOR_PAYMENT: "Pago Operador",
}

// ═══════════════════════════════════════════════════════════════════════════════
// DOMINIO: USUARIOS / ROLES
// ═══════════════════════════════════════════════════════════════════════════════

export const USER_ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: "bg-purple-500",
  ADMIN: "bg-blue-500",
  CONTABLE: "bg-green-500",
  SELLER: "bg-orange-500",
  VIEWER: "bg-gray-500",
}

export const USER_ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Administrador",
  CONTABLE: "Contable",
  SELLER: "Vendedor",
  VIEWER: "Observador",
}

export const USER_ROLE_DESCRIPTIONS: Record<string, string> = {
  SUPER_ADMIN: "Acceso total al sistema",
  ADMIN: "Gestion completa sin eliminar",
  CONTABLE: "Solo modulos financieros",
  SELLER: "Solo sus propios datos",
  VIEWER: "Solo lectura",
}

// ═══════════════════════════════════════════════════════════════════════════════
// DOMINIO: LEADS / VENTAS
// ═══════════════════════════════════════════════════════════════════════════════

export const LEAD_REGION_COLORS: Record<string, string> = {
  ARGENTINA: "bg-blue-500",
  CARIBE: "bg-cyan-500",
  BRASIL: "bg-green-500",
  EUROPA: "bg-purple-500",
  EEUU: "bg-red-500",
  OTROS: "bg-gray-500",
  CRUCEROS: "bg-orange-500",
}

export const LEAD_STATUS_LABELS: Record<string, string> = {
  NEW: "Nuevo",
  IN_PROGRESS: "En Progreso",
  QUOTED: "Cotizado",
  WON: "Ganado",
  LOST: "Perdido",
}

// ═══════════════════════════════════════════════════════════════════════════════
// DOMINIO: ALERTAS
// ═══════════════════════════════════════════════════════════════════════════════

export const ALERT_TYPE_COLORS: Record<string, string> = {
  PAYMENT_DUE: "bg-amber-500",
  UPCOMING_TRIP: "bg-blue-500",
  MISSING_DOCUMENT: "bg-orange-500",
  LOW_MARGIN: "bg-red-500",
  QUOTATION_EXPIRING: "bg-purple-500",
  RECURRING_PAYMENT: "bg-emerald-500",
}

export const ALERT_TYPE_LABELS: Record<string, string> = {
  PAYMENT_DUE: "Pago",
  UPCOMING_TRIP: "Viaje",
  MISSING_DOCUMENT: "Doc",
  LOW_MARGIN: "Margen",
  QUOTATION_EXPIRING: "Cotiz",
  RECURRING_PAYMENT: "Recurrente",
}

/** Urgencia de viajes por dias restantes */
export function getUrgencyColor(days: number): string {
  if (days <= 3) return "bg-red-500"
  if (days <= 7) return "bg-amber-500"
  if (days <= 14) return "bg-amber-400"
  return "bg-green-500"
}

// ═══════════════════════════════════════════════════════════════════════════════
// DOMINIO: WHATSAPP
// ═══════════════════════════════════════════════════════════════════════════════

export const WHATSAPP_CATEGORY_COLORS: Record<string, string> = {
  PAYMENT: "bg-amber-100 text-amber-800",
  TRIP: "bg-blue-100 text-blue-800",
  QUOTATION: "bg-purple-100 text-purple-800",
  BIRTHDAY: "bg-pink-100 text-pink-800",
  ANNIVERSARY: "bg-rose-100 text-rose-800",
  MARKETING: "bg-green-100 text-green-800",
  CUSTOM: "bg-muted text-foreground",
}

// ═══════════════════════════════════════════════════════════════════════════════
// DOMINIO: INTERACCIONES CON CLIENTES
// ═══════════════════════════════════════════════════════════════════════════════

export const INTERACTION_TYPE_COLORS: Record<string, string> = {
  call: "bg-blue-500",
  email: "bg-amber-500",
  whatsapp: "bg-green-500",
  meeting: "bg-purple-500",
  video_call: "bg-indigo-500",
  note: "bg-gray-500",
  task: "bg-cyan-500",
  quote_sent: "bg-orange-500",
  quote_approved: "bg-emerald-500",
  payment: "bg-green-600",
  complaint: "bg-red-500",
  feedback: "bg-pink-500",
  other: "bg-slate-500",
}

// ═══════════════════════════════════════════════════════════════════════════════
// DOMINIO: ADMIN / SaaS
// ═══════════════════════════════════════════════════════════════════════════════

export const SUBSCRIPTION_STATUS_STYLES: Record<string, { label: string; className: string }> = {
  ACTIVE: { label: "Activa", className: softBadgeStyle("emerald") },
  TRIAL: { label: "Prueba", className: softBadgeStyle("blue") },
  CANCELED: { label: "Cancelada", className: softBadgeStyle("rose") },
  UNPAID: { label: "Sin pago", className: softBadgeStyle("amber") },
  SUSPENDED: { label: "Suspendida", className: "border border-slate-400/40 bg-slate-500/10 text-slate-600 dark:text-slate-300" },
  PAST_DUE: { label: "Vencida", className: softBadgeStyle("orange") },
}

export const SECURITY_SEVERITY_STYLES: Record<string, string> = {
  CRITICAL: softBadgeStyle("rose"),
  HIGH: softBadgeStyle("orange"),
  MEDIUM: softBadgeStyle("amber"),
  LOW: softBadgeStyle("blue"),
}

export const SECURITY_CHECK_STATUS_STYLES: Record<string, string> = {
  PASS: softBadgeStyle("emerald"),
  FAIL: softBadgeStyle("rose"),
  WARNING: softBadgeStyle("amber"),
}

export const BILLING_EVENT_STYLES: Record<string, { label: string; className: string }> = {
  SUBSCRIPTION_CREATED: { label: "Creada", className: softBadgeStyle("blue") },
  SUBSCRIPTION_UPDATED: { label: "Actualizada", className: softBadgeStyle("indigo") },
  SUBSCRIPTION_CANCELED: { label: "Cancelada", className: softBadgeStyle("rose") },
  SUBSCRIPTION_RENEWED: { label: "Renovada", className: softBadgeStyle("emerald") },
  PAYMENT_SUCCEEDED: { label: "Pago Exitoso", className: softBadgeStyle("emerald") },
  PAYMENT_FAILED: { label: "Pago Fallido", className: softBadgeStyle("rose") },
  TRIAL_EXTENDED_BY_ADMIN: { label: "Trial Extendido", className: softBadgeStyle("amber") },
  SUBSCRIPTION_PLAN_CHANGED: { label: "Plan Cambiado", className: softBadgeStyle("purple") },
}
