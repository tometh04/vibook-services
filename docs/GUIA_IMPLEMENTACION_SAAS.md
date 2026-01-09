# Guía de Implementación - Conversión a SaaS

Este documento proporciona el código específico y los pasos para implementar los cambios necesarios para convertir MAXEVA GESTIÓN en un SaaS.

---

## 🔴 PASO 1: Corregir Vulnerabilidades de Seguridad

### 1.1 Eliminar Bypass de Autenticación

**Archivo: `middleware.ts`**
```typescript
// ELIMINAR estas líneas (15-18):
// BYPASS LOGIN EN DESARROLLO - TODO: Remover antes de producción
if (process.env.NODE_ENV === 'development' && process.env.DISABLE_AUTH === 'true') {
  return NextResponse.next()
}

// ELIMINAR estas líneas (21-27):
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder_anon_key'

if (supabaseUrl.includes('placeholder') || supabaseAnonKey.includes('placeholder')) {
  return NextResponse.next()
}
```

**REEMPLAZAR `middleware.ts` con:**
```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Rutas públicas que no requieren autenticación
const PUBLIC_ROUTES = [
  '/login',
  '/forgot-password',
  '/auth/accept-invite',
  '/api/webhooks', // Webhooks tienen su propia autenticación
]

// Rutas de API que tienen autenticación propia
const API_WITH_OWN_AUTH = [
  '/api/webhooks/manychat',
  '/api/cron/',
]

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Permitir rutas públicas
  if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // Permitir webhooks con autenticación propia
  if (API_WITH_OWN_AUTH.some(route => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // Validar variables de entorno
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing required Supabase environment variables')
    return NextResponse.json(
      { error: 'Server configuration error' },
      { status: 500 }
    )
  }

  let response = NextResponse.next({
    request: { headers: req.headers },
  })

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return req.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          req.cookies.set(name, value)
          response.cookies.set(name, value, options)
        })
      },
    },
  })

  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      // Redirigir a login si no hay sesión válida
      if (!pathname.startsWith('/api/')) {
        return NextResponse.redirect(new URL('/login', req.url))
      }
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  } catch (error) {
    console.error('Auth error:', error)
    if (!pathname.startsWith('/api/')) {
      return NextResponse.redirect(new URL('/login', req.url))
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

### 1.2 Corregir `lib/auth.ts`

**REEMPLAZAR `lib/auth.ts` con:**
```typescript
import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Database } from '@/lib/supabase/types'

type User = Database['public']['Tables']['users']['Row']

export async function getCurrentUser(): Promise<{ user: User; session: { user: any } }> {
  const supabase = await createServerClient()
  
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !authUser) {
    redirect('/login')
  }

  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('auth_id', authUser.id)
    .maybeSingle()

  if (error || !user || !(user as any).is_active) {
    redirect('/login')
  }

  return { user: user as User, session: { user: authUser } }
}

export async function getUserAgencies(userId: string): Promise<Array<{ 
  agency_id: string; 
  agencies: { name: string; city: string; timezone: string } | null 
}>> {
  const supabase = await createServerClient()
  
  const { data, error } = await supabase
    .from('user_agencies')
    .select('agency_id, agencies(*)')
    .eq('user_id', userId)

  if (error) {
    console.error('Error fetching user agencies:', error)
    return []
  }

  return (data || []) as Array<{ 
    agency_id: string; 
    agencies: { name: string; city: string; timezone: string } | null 
  }>
}

export function hasRole(userRole: string, requiredRole: string): boolean {
  const roleHierarchy: Record<string, number> = {
    VIEWER: 1,
    SELLER: 2,
    CONTABLE: 3,
    ADMIN: 4,
    SUPER_ADMIN: 5,
  }
  return (roleHierarchy[userRole] || 0) >= (roleHierarchy[requiredRole] || 0)
}
```

### 1.3 Corregir `lib/supabase/server.ts`

**REEMPLAZAR con:**
```typescript
import { createServerClient as createSupabaseServerClient } from '@supabase/ssr'
import { Database } from './types'
import { cookies } from 'next/headers'

export async function createServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing required Supabase environment variables')
  }
  
  const cookieStore = await cookies()
  
  return createSupabaseServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      set(name: string, value: string, options: any) {
        try {
          cookieStore.set({ name, value, ...options })
        } catch (error) {
          // Ignore - called from Server Component
        }
      },
      remove(name: string, options: any) {
        try {
          cookieStore.set({ name, value: '', ...options })
        } catch (error) {
          // Ignore - called from Server Component
        }
      },
    },
  })
}
```

---

## 🟠 PASO 2: Crear Sistema de Branding Dinámico

### 2.1 Nueva Tabla de Configuración de Tenant

**Archivo: `supabase/migrations/076_create_tenant_branding.sql`**
```sql
-- Configuración de branding por agencia/tenant
CREATE TABLE IF NOT EXISTS tenant_branding (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  app_name TEXT NOT NULL DEFAULT 'Vibook Gestión',
  logo_url TEXT,
  favicon_url TEXT,
  primary_color TEXT DEFAULT '#6366f1',
  secondary_color TEXT DEFAULT '#8b5cf6',
  email_from_name TEXT DEFAULT 'Vibook Gestión',
  email_from_address TEXT,
  support_email TEXT,
  support_phone TEXT,
  custom_css TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(agency_id)
);

-- Índice
CREATE INDEX IF NOT EXISTS idx_tenant_branding_agency ON tenant_branding(agency_id);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_tenant_branding_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_tenant_branding_updated_at
  BEFORE UPDATE ON tenant_branding
  FOR EACH ROW
  EXECUTE FUNCTION update_tenant_branding_updated_at();

-- RLS
ALTER TABLE tenant_branding ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their agency branding"
  ON tenant_branding FOR SELECT
  USING (
    agency_id IN (
      SELECT agency_id FROM user_agencies WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can update their agency branding"
  ON tenant_branding FOR UPDATE
  USING (
    agency_id IN (
      SELECT ua.agency_id FROM user_agencies ua
      JOIN users u ON u.id = ua.user_id
      WHERE u.auth_id = auth.uid() AND u.role IN ('ADMIN', 'SUPER_ADMIN')
    )
  );
```

### 2.2 Hook para Branding

**Archivo: `hooks/use-tenant-branding.ts`**
```typescript
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface TenantBranding {
  app_name: string
  logo_url: string | null
  favicon_url: string | null
  primary_color: string
  secondary_color: string
  email_from_name: string
  support_email: string | null
  support_phone: string | null
}

const DEFAULT_BRANDING: TenantBranding = {
  app_name: 'Vibook Gestión',
  logo_url: null,
  favicon_url: null,
  primary_color: '#6366f1',
  secondary_color: '#8b5cf6',
  email_from_name: 'Vibook Gestión',
  support_email: null,
  support_phone: null,
}

export function useTenantBranding(agencyId?: string) {
  const [branding, setBranding] = useState<TenantBranding>(DEFAULT_BRANDING)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchBranding() {
      if (!agencyId) {
        setIsLoading(false)
        return
      }

      const supabase = createClient()
      const { data, error } = await supabase
        .from('tenant_branding')
        .select('*')
        .eq('agency_id', agencyId)
        .maybeSingle()

      if (!error && data) {
        setBranding({
          app_name: data.app_name || DEFAULT_BRANDING.app_name,
          logo_url: data.logo_url,
          favicon_url: data.favicon_url,
          primary_color: data.primary_color || DEFAULT_BRANDING.primary_color,
          secondary_color: data.secondary_color || DEFAULT_BRANDING.secondary_color,
          email_from_name: data.email_from_name || DEFAULT_BRANDING.email_from_name,
          support_email: data.support_email,
          support_phone: data.support_phone,
        })
      }
      setIsLoading(false)
    }

    fetchBranding()
  }, [agencyId])

  return { branding, isLoading }
}
```

### 2.3 Actualizar Sidebar con Branding Dinámico

**Modificar `components/app-sidebar.tsx`:**
```typescript
// Agregar import del hook
import { useTenantBranding } from '@/hooks/use-tenant-branding'

// En el componente, agregar:
interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  userRole: UserRole
  user: {
    name: string
    email: string
    avatar?: string
  }
  agencyId?: string  // Agregar prop
}

export function AppSidebar({ userRole, user, agencyId, ...props }: AppSidebarProps) {
  const { branding } = useTenantBranding(agencyId)
  
  // ... resto del código

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="data-[slot=sidebar-menu-button]:!p-1.5">
              <a href="/dashboard">
                {branding.logo_url ? (
                  <img src={branding.logo_url} alt={branding.app_name} className="size-5" />
                ) : (
                  <GalleryVerticalEnd className="!size-5" />
                )}
                <span className="text-base font-semibold">{branding.app_name}</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      {/* ... resto */}
    </Sidebar>
  )
}
```

---

## 🟠 PASO 3: Sistema de Integraciones Modular

### 3.1 Crear Tabla de Integraciones

**Archivo: `supabase/migrations/077_create_integrations_system.sql`**
```sql
-- Sistema de integraciones modular
CREATE TABLE IF NOT EXISTS integration_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  integration_type TEXT NOT NULL CHECK (integration_type IN (
    'TRELLO', 'MANYCHAT', 'WHATSAPP', 'GOOGLE_CALENDAR', 
    'STRIPE', 'MERCADOPAGO', 'CUSTOM_WEBHOOK'
  )),
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT false,
  config JSONB NOT NULL DEFAULT '{}',
  webhook_url TEXT,
  webhook_secret TEXT,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  last_error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(agency_id, integration_type)
);

-- Logs de integraciones
CREATE TABLE IF NOT EXISTS integration_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  integration_id UUID NOT NULL REFERENCES integration_configs(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('SUCCESS', 'ERROR', 'WARNING')),
  request_data JSONB,
  response_data JSONB,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_integration_configs_agency ON integration_configs(agency_id);
CREATE INDEX IF NOT EXISTS idx_integration_logs_integration ON integration_logs(integration_id, created_at DESC);

-- RLS
ALTER TABLE integration_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their agency integrations"
  ON integration_configs FOR SELECT
  USING (
    agency_id IN (
      SELECT agency_id FROM user_agencies WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage their agency integrations"
  ON integration_configs FOR ALL
  USING (
    agency_id IN (
      SELECT ua.agency_id FROM user_agencies ua
      JOIN users u ON u.id = ua.user_id
      WHERE u.auth_id = auth.uid() AND u.role IN ('ADMIN', 'SUPER_ADMIN')
    )
  );
```

### 3.2 Servicio de Integraciones

**Archivo: `lib/integrations/integration-service.ts`**
```typescript
import { SupabaseClient } from '@supabase/supabase-js'

export type IntegrationType = 
  | 'TRELLO' 
  | 'MANYCHAT' 
  | 'WHATSAPP' 
  | 'GOOGLE_CALENDAR' 
  | 'STRIPE' 
  | 'MERCADOPAGO' 
  | 'CUSTOM_WEBHOOK'

export interface IntegrationConfig {
  id: string
  agency_id: string
  integration_type: IntegrationType
  name: string
  is_active: boolean
  config: Record<string, any>
  webhook_url?: string
  webhook_secret?: string
  last_sync_at?: string
  last_error?: string
}

export async function getIntegration(
  supabase: SupabaseClient,
  agencyId: string,
  type: IntegrationType
): Promise<IntegrationConfig | null> {
  const { data, error } = await supabase
    .from('integration_configs')
    .select('*')
    .eq('agency_id', agencyId)
    .eq('integration_type', type)
    .eq('is_active', true)
    .maybeSingle()

  if (error || !data) return null
  return data as IntegrationConfig
}

export async function isIntegrationEnabled(
  supabase: SupabaseClient,
  agencyId: string,
  type: IntegrationType
): Promise<boolean> {
  const integration = await getIntegration(supabase, agencyId, type)
  return integration !== null && integration.is_active
}

export async function logIntegrationEvent(
  supabase: SupabaseClient,
  integrationId: string,
  eventType: string,
  status: 'SUCCESS' | 'ERROR' | 'WARNING',
  data?: {
    request?: any
    response?: any
    error?: string
  }
) {
  await supabase.from('integration_logs').insert({
    integration_id: integrationId,
    event_type: eventType,
    status,
    request_data: data?.request,
    response_data: data?.response,
    error_message: data?.error,
  })
}
```

---

## 🟡 PASO 4: Rate Limiting con Redis

### 4.1 Instalar Dependencias
```bash
npm install @upstash/ratelimit @upstash/redis
```

### 4.2 Actualizar Rate Limiting

**Reemplazar `lib/rate-limit.ts`:**
```typescript
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Crear cliente Redis (usar variables de entorno)
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

// Rate limiters por tipo de endpoint
export const rateLimiters = {
  // AI Copilot: 10 requests por minuto por usuario
  aiCopilot: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '1 m'),
    analytics: true,
    prefix: 'ratelimit:ai',
  }),
  
  // Webhooks: 100 requests por minuto por IP
  webhook: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '1 m'),
    analytics: true,
    prefix: 'ratelimit:webhook',
  }),
  
  // APIs generales: 100 requests por minuto por usuario
  general: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '1 m'),
    analytics: true,
    prefix: 'ratelimit:general',
  }),
  
  // APIs de escritura: 30 requests por minuto
  write: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(30, '1 m'),
    analytics: true,
    prefix: 'ratelimit:write',
  }),
}

export async function checkRateLimit(
  identifier: string,
  type: keyof typeof rateLimiters = 'general'
): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> {
  const limiter = rateLimiters[type]
  const result = await limiter.limit(identifier)
  
  return {
    success: result.success,
    limit: result.limit,
    remaining: result.remaining,
    reset: result.reset,
  }
}

export async function withRateLimit(
  identifier: string,
  type: keyof typeof rateLimiters = 'general'
) {
  const result = await checkRateLimit(identifier, type)
  
  if (!result.success) {
    const error = new Error('Too many requests')
    ;(error as any).statusCode = 429
    ;(error as any).resetTime = result.reset
    throw error
  }
  
  return result
}

// Fallback para desarrollo sin Redis
export function createInMemoryRateLimiter() {
  const requests = new Map<string, { count: number; reset: number }>()
  
  return {
    async limit(identifier: string, maxRequests: number = 100, windowMs: number = 60000) {
      const now = Date.now()
      const record = requests.get(identifier)
      
      if (!record || now > record.reset) {
        requests.set(identifier, { count: 1, reset: now + windowMs })
        return { success: true, remaining: maxRequests - 1 }
      }
      
      if (record.count >= maxRequests) {
        return { success: false, remaining: 0 }
      }
      
      record.count++
      return { success: true, remaining: maxRequests - record.count }
    }
  }
}
```

---

## 📦 PASO 5: Variables de Entorno Requeridas

**Crear/actualizar `.env.example`:**
```env
# Supabase (REQUERIDO)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# OpenAI (opcional, para AI features)
OPENAI_API_KEY=your_openai_key

# Emilia/Vibook API (opcional)
EMILIA_API_KEY=wsk_xxx
EMILIA_API_URL=https://api.vibook.ai/search

# Redis/Upstash (requerido para rate limiting en producción)
UPSTASH_REDIS_REST_URL=your_upstash_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_token

# Email (Resend)
RESEND_API_KEY=your_resend_key
RESEND_FROM_EMAIL=noreply@yourdomain.com

# Webhooks (seguridad)
MANYCHAT_WEBHOOK_API_KEY=generate_secure_random_key

# Billing (futuro)
STRIPE_SECRET_KEY=sk_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# App Config
NEXT_PUBLIC_APP_URL=https://app.yourdomain.com
```

---

## ✅ Checklist de Implementación

### Seguridad
- [ ] Eliminar bypass de autenticación en `middleware.ts`
- [ ] Eliminar bypass en `lib/auth.ts`
- [ ] Eliminar placeholders de variables de entorno
- [ ] Hacer obligatoria verificación de webhooks
- [ ] Auditar RLS en todas las tablas

### Branding
- [ ] Crear tabla `tenant_branding`
- [ ] Implementar hook `useTenantBranding`
- [ ] Actualizar sidebar con branding dinámico
- [ ] Actualizar página de login
- [ ] Actualizar emails

### Integraciones
- [ ] Crear tabla `integration_configs`
- [ ] Crear servicio de integraciones
- [ ] Migrar Trello a integración opcional
- [ ] Migrar Manychat a integración opcional

### Infraestructura
- [ ] Migrar rate limiting a Redis
- [ ] Configurar variables de entorno
- [ ] Implementar logging centralizado

---

*Documento generado el: Enero 2026*
