"use client"

import { useEffect, useRef } from "react"
import { usePathname } from "next/navigation"
import { ONBOARDING_EVENT_TYPES } from "@/lib/onboarding/events"

const EVENT_BY_PREFIX: Array<{ prefix: string; event: string }> = [
  { prefix: "/cash", event: ONBOARDING_EVENT_TYPES.visited_finances },
  { prefix: "/accounting", event: ONBOARDING_EVENT_TYPES.visited_finances },
  { prefix: "/finances", event: ONBOARDING_EVENT_TYPES.visited_finances },
  { prefix: "/reports", event: ONBOARDING_EVENT_TYPES.visited_reports },
]

export function OnboardingTracker() {
  const pathname = usePathname()
  const firedRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!pathname) return

    for (const rule of EVENT_BY_PREFIX) {
      if (pathname.startsWith(rule.prefix) && !firedRef.current.has(rule.event)) {
        firedRef.current.add(rule.event)
        fetch("/api/onboarding/track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ event: rule.event }),
        }).catch((error) => {
          console.error("[OnboardingTracker] Error:", error)
        })
      }
    }
  }, [pathname])

  return null
}
