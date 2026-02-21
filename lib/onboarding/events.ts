export const ONBOARDING_EVENT_TYPES = {
  visited_finances: "visited_finances",
  skipped_onboarding: "skipped_onboarding",
} as const

export type OnboardingEventType = typeof ONBOARDING_EVENT_TYPES[keyof typeof ONBOARDING_EVENT_TYPES]

export const ONBOARDING_EVENT_SET = new Set<string>(Object.values(ONBOARDING_EVENT_TYPES))
