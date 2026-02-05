'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface TenantBranding {
  id: string
  agency_id: string
  app_name: string
  logo_url: string | null
  logo_dark_url: string | null
  favicon_url: string | null
  palette_id: string
  primary_color: string
  secondary_color: string
  accent_color: string
  email_from_name: string
  email_from_address: string | null
  support_email: string | null
  support_phone: string | null
  support_whatsapp: string | null
  website_url: string | null
  instagram_url: string | null
  facebook_url: string | null
  company_name: string | null
  company_tax_id: string | null
  company_address_line1: string | null
  company_address_line2: string | null
  company_city: string | null
  company_state: string | null
  company_postal_code: string | null
  company_country: string | null
  company_phone: string | null
  company_email: string | null
}

const DEFAULT_BRANDING: TenantBranding = {
  id: '',
  agency_id: '',
  app_name: 'Vibook Gestión',
  logo_url: null,
  logo_dark_url: null,
  favicon_url: null,
  palette_id: 'vibook',
  primary_color: '#6366f1',
  secondary_color: '#8b5cf6',
  accent_color: '#f59e0b',
  email_from_name: 'Vibook Gestión',
  email_from_address: null,
  support_email: null,
  support_phone: null,
  support_whatsapp: null,
  website_url: null,
  instagram_url: null,
  facebook_url: null,
  company_name: null,
  company_tax_id: null,
  company_address_line1: null,
  company_address_line2: null,
  company_city: null,
  company_state: null,
  company_postal_code: null,
  company_country: null,
  company_phone: null,
  company_email: null,
}

interface UseTenantBrandingReturn {
  branding: TenantBranding
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
  updateBranding: (updates: Partial<TenantBranding>) => Promise<boolean>
}

export function useTenantBranding(agencyId?: string): UseTenantBrandingReturn {
  const [branding, setBranding] = useState<TenantBranding>(DEFAULT_BRANDING)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchBranding = useCallback(async () => {
    if (!agencyId) {
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const supabase = createClient()
      // tenant_branding no está en los tipos generados aún - usar cast
      const { data, error: fetchError } = await (supabase
        .from('tenant_branding') as any)
        .select('*')
        .eq('agency_id', agencyId)
        .maybeSingle()

      if (fetchError) {
        // Si la tabla no existe, usar defaults
        if (fetchError.code === '42P01') {
          console.warn('tenant_branding table does not exist yet, using defaults')
          setIsLoading(false)
          return
        }
        throw fetchError
      }

      if (data) {
        // Cast a any porque tenant_branding no está en los tipos generados aún
        const brandingData = data as any
        setBranding({
          id: brandingData.id,
          agency_id: brandingData.agency_id,
          app_name: brandingData.app_name || brandingData.brand_name || DEFAULT_BRANDING.app_name,
          logo_url: brandingData.logo_url,
          logo_dark_url: brandingData.logo_dark_url,
          favicon_url: brandingData.favicon_url,
          palette_id: brandingData.palette_id || DEFAULT_BRANDING.palette_id,
          primary_color: brandingData.primary_color || DEFAULT_BRANDING.primary_color,
          secondary_color: brandingData.secondary_color || DEFAULT_BRANDING.secondary_color,
          accent_color: brandingData.accent_color || DEFAULT_BRANDING.accent_color,
          email_from_name: brandingData.email_from_name || brandingData.brand_name || DEFAULT_BRANDING.email_from_name,
          email_from_address: brandingData.email_from_address,
          support_email: brandingData.support_email,
          support_phone: brandingData.support_phone,
          support_whatsapp: brandingData.support_whatsapp || brandingData.social_whatsapp,
          website_url: brandingData.website_url,
          instagram_url: brandingData.instagram_url || brandingData.social_instagram,
          facebook_url: brandingData.facebook_url || brandingData.social_facebook,
          company_name: brandingData.company_name,
          company_tax_id: brandingData.company_tax_id,
          company_address_line1: brandingData.company_address_line1,
          company_address_line2: brandingData.company_address_line2,
          company_city: brandingData.company_city,
          company_state: brandingData.company_state,
          company_postal_code: brandingData.company_postal_code,
          company_country: brandingData.company_country,
          company_phone: brandingData.company_phone,
          company_email: brandingData.company_email,
        })
      }
    } catch (err: any) {
      console.error('Error fetching branding:', err)
      setError(err.message || 'Error al cargar branding')
    } finally {
      setIsLoading(false)
    }
  }, [agencyId])

  useEffect(() => {
    fetchBranding()
  }, [fetchBranding])

  const updateBranding = useCallback(async (updates: Partial<TenantBranding>): Promise<boolean> => {
    if (!agencyId) return false

    try {
      const supabase = createClient()
      
      // Intentar actualizar primero - tenant_branding no está en los tipos generados aún
      const { error: updateError } = await (supabase
        .from('tenant_branding') as any)
        .update(updates)
        .eq('agency_id', agencyId)

      if (updateError) {
        // Si no existe, insertar
        if (updateError.code === 'PGRST116') {
          const { error: insertError } = await (supabase
            .from('tenant_branding') as any)
            .insert({ agency_id: agencyId, ...updates })

          if (insertError) throw insertError
        } else {
          throw updateError
        }
      }

      // Refrescar datos
      await fetchBranding()
      return true
    } catch (err: any) {
      console.error('Error updating branding:', err)
      setError(err.message || 'Error al actualizar branding')
      return false
    }
  }, [agencyId, fetchBranding])

  return {
    branding,
    isLoading,
    error,
    refetch: fetchBranding,
    updateBranding,
  }
}

// Hook para aplicar colores CSS del branding
export function useBrandingColors(branding: TenantBranding) {
  useEffect(() => {
    if (typeof document === 'undefined') return

    const root = document.documentElement
    let sidebarObserver: MutationObserver | null = null

    const hexToHsl = (hex: string): { h: number; s: number; l: number } | null => {
      const normalized = hex.replace('#', '')
      if (normalized.length !== 6) return null
      const r = parseInt(normalized.slice(0, 2), 16) / 255
      const g = parseInt(normalized.slice(2, 4), 16) / 255
      const b = parseInt(normalized.slice(4, 6), 16) / 255
      const max = Math.max(r, g, b)
      const min = Math.min(r, g, b)
      const delta = max - min
      let h = 0
      if (delta !== 0) {
        if (max === r) h = ((g - b) / delta) % 6
        else if (max === g) h = (b - r) / delta + 2
        else h = (r - g) / delta + 4
        h = Math.round(h * 60)
        if (h < 0) h += 360
      }
      const l = (max + min) / 2
      const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1))
      return { h, s: Math.round(s * 100), l: Math.round(l * 100) }
    }

    const getForegroundHsl = (hex: string): string => {
      const normalized = hex.replace('#', '')
      if (normalized.length !== 6) return '0 0% 100%'
      const r = parseInt(normalized.slice(0, 2), 16) / 255
      const g = parseInt(normalized.slice(2, 4), 16) / 255
      const b = parseInt(normalized.slice(4, 6), 16) / 255
      const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b
      return luminance > 0.6 ? '222.2 84% 4.9%' : '0 0% 100%'
    }

    const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

    const setLightness = (hsl: { h: number; s: number; l: number }, lightness: number) => ({
      h: hsl.h,
      s: clamp(hsl.s, 8, 90),
      l: clamp(lightness, 6, 96),
    })

    const getForegroundForHsl = (hsl: { h: number; s: number; l: number }) =>
      hsl.l > 60 ? '222.2 84% 4.9%' : '0 0% 100%'

    const primaryHsl = hexToHsl(branding.primary_color)
    const secondaryHsl = hexToHsl(branding.secondary_color)
    const accentHsl = hexToHsl(branding.accent_color)

    const adjustLightness = (hsl: { h: number; s: number; l: number }, delta: number) => ({
      h: hsl.h,
      s: hsl.s,
      l: Math.min(96, Math.max(8, hsl.l + delta)),
    })

    if (primaryHsl) {
      const hslValue = `${primaryHsl.h} ${primaryHsl.s}% ${primaryHsl.l}%`
      root.style.setProperty('--primary', hslValue)
      root.style.setProperty('--sidebar-primary', hslValue)
      root.style.setProperty('--ring', hslValue)
      root.style.setProperty('--chart-1', hslValue)
      root.style.setProperty('--primary-foreground', getForegroundHsl(branding.primary_color))
      root.style.setProperty('--sidebar-primary-foreground', getForegroundHsl(branding.primary_color))
    }

    if (secondaryHsl) {
      root.style.setProperty('--chart-2', `${secondaryHsl.h} ${secondaryHsl.s}% ${secondaryHsl.l}%`)
    }

    if (accentHsl) {
      root.style.setProperty('--chart-3', `${accentHsl.h} ${accentHsl.s}% ${accentHsl.l}%`)
    }

    if (primaryHsl) {
      const darkerPrimary = adjustLightness(primaryHsl, -14)
      root.style.setProperty('--chart-4', `${darkerPrimary.h} ${darkerPrimary.s}% ${darkerPrimary.l}%`)
    }

    if (secondaryHsl) {
      const darkerSecondary = adjustLightness(secondaryHsl, -12)
      root.style.setProperty('--chart-5', `${darkerSecondary.h} ${darkerSecondary.s}% ${darkerSecondary.l}%`)
    }

    if (accentHsl) {
      const darkerAccent = adjustLightness(accentHsl, -10)
      root.style.setProperty('--chart-6', `${darkerAccent.h} ${darkerAccent.s}% ${darkerAccent.l}%`)
    }

    const applySidebarTokens = () => {
      const base = primaryHsl || secondaryHsl || accentHsl
      if (!base) return

      const secondaryBase = secondaryHsl || base
      const isDark = root.classList.contains('dark')

      if (isDark) {
        const sidebarBackground = setLightness(base, 12)
        const sidebarAccent = setLightness(base, 20)
        const sidebarBorder = setLightness(base, 22)

        root.style.setProperty('--sidebar-background', `${sidebarBackground.h} ${sidebarBackground.s}% ${sidebarBackground.l}%`)
        root.style.setProperty('--sidebar-foreground', '0 0% 98%')
        root.style.setProperty('--sidebar-accent', `${sidebarAccent.h} ${sidebarAccent.s}% ${sidebarAccent.l}%`)
        root.style.setProperty('--sidebar-accent-foreground', '0 0% 98%')
        root.style.setProperty('--sidebar-border', `${sidebarBorder.h} ${sidebarBorder.s}% ${sidebarBorder.l}%`)
        root.style.setProperty('--sidebar-ring', `${base.h} ${base.s}% ${base.l}%`)
      } else {
        const sidebarBackground = setLightness(secondaryBase, 97)
        const sidebarAccent = setLightness(base, 90)
        const sidebarBorder = setLightness(base, 86)

        root.style.setProperty('--sidebar-background', `${sidebarBackground.h} ${sidebarBackground.s}% ${sidebarBackground.l}%`)
        root.style.setProperty('--sidebar-foreground', getForegroundForHsl(sidebarBackground))
        root.style.setProperty('--sidebar-accent', `${sidebarAccent.h} ${sidebarAccent.s}% ${sidebarAccent.l}%`)
        root.style.setProperty('--sidebar-accent-foreground', getForegroundForHsl(sidebarAccent))
        root.style.setProperty('--sidebar-border', `${sidebarBorder.h} ${sidebarBorder.s}% ${sidebarBorder.l}%`)
        root.style.setProperty('--sidebar-ring', `${base.h} ${base.s}% ${base.l}%`)
      }
    }

    applySidebarTokens()
    sidebarObserver = new MutationObserver(() => applySidebarTokens())
    sidebarObserver.observe(root, { attributes: true, attributeFilter: ['class'] })

    // Aplicar colores como variables de marca
    root.style.setProperty('--brand-primary', branding.primary_color)
    root.style.setProperty('--brand-secondary', branding.secondary_color)
    root.style.setProperty('--brand-accent', branding.accent_color)

    // Limpiar al desmontar
    return () => {
      if (sidebarObserver) sidebarObserver.disconnect()
      root.style.removeProperty('--brand-primary')
      root.style.removeProperty('--brand-secondary')
      root.style.removeProperty('--brand-accent')
      root.style.removeProperty('--primary')
      root.style.removeProperty('--primary-foreground')
      root.style.removeProperty('--sidebar-primary')
      root.style.removeProperty('--sidebar-primary-foreground')
      root.style.removeProperty('--sidebar-background')
      root.style.removeProperty('--sidebar-foreground')
      root.style.removeProperty('--sidebar-accent')
      root.style.removeProperty('--sidebar-accent-foreground')
      root.style.removeProperty('--sidebar-border')
      root.style.removeProperty('--sidebar-ring')
      root.style.removeProperty('--ring')
      root.style.removeProperty('--chart-1')
      root.style.removeProperty('--chart-2')
      root.style.removeProperty('--chart-3')
      root.style.removeProperty('--chart-4')
      root.style.removeProperty('--chart-5')
      root.style.removeProperty('--chart-6')
    }
  }, [branding.primary_color, branding.secondary_color, branding.accent_color])
}
