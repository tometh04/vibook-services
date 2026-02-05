"use client"

import { useEffect } from "react"
import { useTenantBranding, useBrandingColors } from "@/hooks/use-tenant-branding"

interface BrandingProviderProps {
  agencyId?: string
}

export function BrandingProvider({ agencyId }: BrandingProviderProps) {
  const { branding, refetch } = useTenantBranding(agencyId)

  // Aplicar colores del branding como variables CSS globales
  useBrandingColors(branding)

  useEffect(() => {
    const handler = () => {
      refetch()
    }

    window.addEventListener("branding:updated", handler)
    return () => window.removeEventListener("branding:updated", handler)
  }, [refetch])

  return null
}
