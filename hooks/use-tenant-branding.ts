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
}

const DEFAULT_BRANDING: TenantBranding = {
  id: '',
  agency_id: '',
  app_name: 'Vibook Gestión',
  logo_url: null,
  logo_dark_url: null,
  favicon_url: null,
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
      const { data, error: fetchError } = await supabase
        .from('tenant_branding')
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
        setBranding({
          id: data.id,
          agency_id: data.agency_id,
          app_name: data.app_name || DEFAULT_BRANDING.app_name,
          logo_url: data.logo_url,
          logo_dark_url: data.logo_dark_url,
          favicon_url: data.favicon_url,
          primary_color: data.primary_color || DEFAULT_BRANDING.primary_color,
          secondary_color: data.secondary_color || DEFAULT_BRANDING.secondary_color,
          accent_color: data.accent_color || DEFAULT_BRANDING.accent_color,
          email_from_name: data.email_from_name || DEFAULT_BRANDING.email_from_name,
          email_from_address: data.email_from_address,
          support_email: data.support_email,
          support_phone: data.support_phone,
          support_whatsapp: data.support_whatsapp,
          website_url: data.website_url,
          instagram_url: data.instagram_url,
          facebook_url: data.facebook_url,
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
      
      // Intentar actualizar primero
      const { error: updateError } = await supabase
        .from('tenant_branding')
        .update(updates)
        .eq('agency_id', agencyId)

      if (updateError) {
        // Si no existe, insertar
        if (updateError.code === 'PGRST116') {
          const { error: insertError } = await supabase
            .from('tenant_branding')
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

    // Aplicar colores como variables CSS
    root.style.setProperty('--brand-primary', branding.primary_color)
    root.style.setProperty('--brand-secondary', branding.secondary_color)
    root.style.setProperty('--brand-accent', branding.accent_color)

    // Limpiar al desmontar
    return () => {
      root.style.removeProperty('--brand-primary')
      root.style.removeProperty('--brand-secondary')
      root.style.removeProperty('--brand-accent')
    }
  }, [branding.primary_color, branding.secondary_color, branding.accent_color])
}
