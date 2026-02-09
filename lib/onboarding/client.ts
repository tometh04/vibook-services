"use client"

const fired = new Set<string>()

export async function trackOnboardingEvent(event: string, metadata?: Record<string, any>) {
  if (fired.has(event)) return
  fired.add(event)

  try {
    await fetch("/api/onboarding/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, metadata }),
    })
  } catch (error) {
    console.error("[trackOnboardingEvent] Error:", error)
  }
}
