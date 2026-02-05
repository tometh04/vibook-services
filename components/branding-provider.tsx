"use client"

import { useEffect } from "react"
import { useTheme } from "next-themes"
import { useTenantBranding, useBrandingColors } from "@/hooks/use-tenant-branding"

interface BrandingProviderProps {
  agencyId?: string
}

export function BrandingProvider({ agencyId }: BrandingProviderProps) {
  const { branding, refetch } = useTenantBranding(agencyId)
  const { theme, setTheme } = useTheme()
  const defaultPaletteId = "vibook"

  // Aplicar colores del branding como variables CSS globales
  useBrandingColors(branding)

  useEffect(() => {
    if (typeof document === "undefined") return
    const isDefault = (branding.palette_id || defaultPaletteId) === defaultPaletteId
    const root = document.documentElement
    root.dataset.themeLocked = isDefault ? "false" : "true"
    root.dataset.brandPalette = branding.palette_id || defaultPaletteId

    if (!isDefault && theme !== "light") {
      setTheme("light")
    }
  }, [branding.palette_id, defaultPaletteId, setTheme, theme])

  useEffect(() => {
    const handler = () => {
      refetch()
    }

    window.addEventListener("branding:updated", handler)
    return () => window.removeEventListener("branding:updated", handler)
  }, [refetch])

  return null
}
