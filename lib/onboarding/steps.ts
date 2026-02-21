export type OnboardingStepId =
  | "lead"
  | "customer"
  | "wholesaler"
  | "operation"
  | "payment"
  | "finance"

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
    id: "customer",
    title: "Creá tu primer cliente",
    description: "Cargá un cliente para poder asignarlo a operaciones.",
    actionLabel: "Ir a Clientes",
    actionPath: "/customers",
    allowedPrefixes: ["/customers"],
  },
  {
    id: "wholesaler",
    title: "Creá tu primer mayorista",
    description: "Cargá un operador mayorista para asignarlo a tus operaciones.",
    actionLabel: "Ir a Operadores",
    actionPath: "/operators",
    allowedPrefixes: ["/operators"],
  },
  {
    id: "operation",
    title: "Generá tu primera operación",
    description: "Creá una operación con el cliente y mayorista que ya tenés.",
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
]
