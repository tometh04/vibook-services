import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import { canPerformAction } from '@/lib/permissions-api'

export async function GET(request: Request) {
  try {
    const { user } = await getCurrentUser()
    const supabase = await createServerClient()
    const { searchParams } = new URL(request.url)

    const agencyId = searchParams.get('agencyId')

    if (!agencyId) {
      return NextResponse.json({ error: 'agencyId es requerido' }, { status: 400 })
    }

    // Verificar que el usuario pertenece a la agencia
    const { data: userAgency } = await supabase
      .from('user_agencies')
      .select('agency_id')
      .eq('user_id', user.id)
      .eq('agency_id', agencyId)
      .maybeSingle()

    if (!userAgency && user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'No tienes acceso a esta agencia' }, { status: 403 })
    }

    // @ts-ignore - tenant_branding no está en los tipos aún, pero existe en la BD
    const { data: branding, error } = await supabase
      .from('tenant_branding')
      .select('*')
      .eq('agency_id', agencyId)
      .maybeSingle()

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching branding:', error)
      return NextResponse.json({ error: 'Error al obtener branding' }, { status: 500 })
    }

    // Si no existe, retornar defaults
    if (!branding) {
      return NextResponse.json({
        branding: {
          agency_id: agencyId,
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
      })
    }

    const normalizedBranding = {
      ...branding,
      app_name: (branding as any).app_name || (branding as any).brand_name || 'Vibook Gestión',
      email_from_name: (branding as any).email_from_name || (branding as any).brand_name || 'Vibook Gestión',
      palette_id: (branding as any).palette_id || 'vibook',
      instagram_url: (branding as any).instagram_url || (branding as any).social_instagram || null,
      facebook_url: (branding as any).facebook_url || (branding as any).social_facebook || null,
      support_whatsapp: (branding as any).support_whatsapp || (branding as any).social_whatsapp || null,
    }

    return NextResponse.json({ branding: normalizedBranding })
  } catch (error) {
    console.error('Error in GET /api/settings/branding:', error)
    return NextResponse.json({ error: 'Error al obtener branding' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const { user } = await getCurrentUser()
    
    // Solo admins pueden modificar branding
    if (!canPerformAction(user, 'settings', 'write')) {
      return NextResponse.json({ error: 'No tiene permiso para modificar branding' }, { status: 403 })
    }

    const supabase = await createServerClient()
    const body = await request.json()

    const { agency_id, ...brandingData } = body

    if (!agency_id) {
      return NextResponse.json({ error: 'agency_id es requerido' }, { status: 400 })
    }

    // Verificar que el usuario puede administrar esta agencia
    const { data: userAgency } = await supabase
      .from('user_agencies')
      .select('agency_id')
      .eq('user_id', user.id)
      .eq('agency_id', agency_id)
      .maybeSingle()

    if (!userAgency && user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'No tienes acceso a esta agencia' }, { status: 403 })
    }

    // Validar colores HEX
    const hexColorRegex = /^#[0-9A-Fa-f]{6}$/
    if (brandingData.primary_color && !hexColorRegex.test(brandingData.primary_color)) {
      return NextResponse.json({ error: 'primary_color debe ser un color HEX válido' }, { status: 400 })
    }
    if (brandingData.secondary_color && !hexColorRegex.test(brandingData.secondary_color)) {
      return NextResponse.json({ error: 'secondary_color debe ser un color HEX válido' }, { status: 400 })
    }
    if (brandingData.accent_color && !hexColorRegex.test(brandingData.accent_color)) {
      return NextResponse.json({ error: 'accent_color debe ser un color HEX válido' }, { status: 400 })
    }

    // Usar upsert para insertar o actualizar
    // @ts-ignore - tenant_branding no está en los tipos aún, pero existe en la BD
    const payload = {
      agency_id,
      ...brandingData,
      brand_name: brandingData.app_name || brandingData.brand_name || undefined,
      social_instagram: brandingData.instagram_url || brandingData.social_instagram || undefined,
      social_facebook: brandingData.facebook_url || brandingData.social_facebook || undefined,
      social_whatsapp: brandingData.support_whatsapp || brandingData.social_whatsapp || undefined,
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('tenant_branding')
      .upsert(payload, {
        onConflict: 'agency_id'
      })
      .select()
      .single()

    if (error) {
      console.error('Error saving branding:', error)
      return NextResponse.json({ error: 'Error al guardar branding' }, { status: 500 })
    }

    return NextResponse.json({ branding: data })
  } catch (error) {
    console.error('Error in PUT /api/settings/branding:', error)
    return NextResponse.json({ error: 'Error al guardar branding' }, { status: 500 })
  }
}
