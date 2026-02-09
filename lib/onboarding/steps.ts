export type OnboardingStepId =
  | "lead"
  | "operation"
  | "payment"
  | "finance"
  | "reports"
  | "cerebro"
  | "emilia"

export interface OnboardingStepDefinition {
  id: OnboardingStepId
  title: string
  description: string
  actionLabel: string
  actionPath: string
  allowedPrefixes: string[]
  feature?: string
}

export const ONBOARDING_STEPS: OnboardingStepDefinition[] = [
  {
    id: "lead",
    title: "Creá tu primer lead",
    description: "Cargá una consulta real o de prueba para empezar el CRM.",
    actionLabel: "Ir a CRM",
    actionPath: "/sales/leads",
    allowedPrefixes: ["/sales/leads"],
    feature: "crm",
  },
  {
    id: "operation",
    title: "Generá tu primera operación",
    description: "Convertí un lead en operación para activar el flujo comercial.",
    actionLabel: "Ir a Operaciones",
    actionPath: "/operations",
    allowedPrefixes: ["/operations"],
  },
  {
    id: "payment",
    title: "Registrá el primer pago",
    description: "Cargá un cobro para ver el impacto en caja y reportes.",
    actionLabel: "Registrar pago",
    actionPath: "/operations",
    allowedPrefixes: ["/operations"],
  },
  {
    id: "finance",
    title: "Revisá tu caja",
    description: "Entrá al resumen financiero para validar ingresos y egresos.",
    actionLabel: "Ir a Finanzas",
    actionPath: "/cash/summary",
    allowedPrefixes: ["/cash", "/accounting", "/finances"],
  },
  {
    id: "reports",
    title: "Revisá un reporte",
    description: "Abrí el panel de reportes para ver métricas clave.",
    actionLabel: "Ver Reportes",
    actionPath: "/reports",
    allowedPrefixes: ["/reports"],
    feature: "reports",
  },
  {
    id: "cerebro",
    title: "Usá Cerebro",
    description: "Hacé tu primera consulta al asistente IA.",
    actionLabel: "Abrir Cerebro",
    actionPath: "/tools/cerebro",
    allowedPrefixes: ["/tools/cerebro"],
    feature: "cerebro",
  },
  {
    id: "emilia",
    title: "Usá Emilia",
    description: "Pedí una búsqueda de viaje para probar Emilia.",
    actionLabel: "Abrir Emilia",
    actionPath: "/emilia",
    allowedPrefixes: ["/emilia"],
    feature: "emilia",
  },
]
