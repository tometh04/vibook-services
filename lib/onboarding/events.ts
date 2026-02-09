export const ONBOARDING_EVENT_TYPES = {
  visited_whatsapp: "visited_whatsapp",
  visited_reports: "visited_reports",
  used_cerebro: "used_cerebro",
  used_emilia: "used_emilia",
} as const

export type OnboardingEventType = typeof ONBOARDING_EVENT_TYPES[keyof typeof ONBOARDING_EVENT_TYPES]

export const ONBOARDING_EVENT_SET = new Set<string>(Object.values(ONBOARDING_EVENT_TYPES))
