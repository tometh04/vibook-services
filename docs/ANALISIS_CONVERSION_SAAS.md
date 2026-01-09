# Análisis de Conversión a SaaS - MAXEVA GESTIÓN

## Resumen Ejecutivo

Este documento detalla el análisis completo del sistema MAXEVA GESTIÓN para su conversión en un producto SaaS multi-tenant. Se identifican vulnerabilidades de seguridad, código específico del cliente (Maxi), mejoras arquitectónicas necesarias y un plan de acción priorizado.

---

## 📊 Estado Actual del Sistema

### Stack Tecnológico
- **Frontend**: Next.js 15, React 18, TypeScript
- **UI**: shadcn/ui + TailwindCSS
- **Backend**: Next.js API Routes
- **Base de Datos**: Supabase (PostgreSQL)
- **Autenticación**: Supabase Auth

### Arquitectura Multi-Tenancy Actual
El sistema ya tiene una estructura básica de multi-tenancy a través de:
- Tabla `agencies` para organizaciones
- `agency_id` en la mayoría de tablas de datos
- Tabla `user_agencies` para relación usuarios-agencias

---

## 🚨 VULNERABILIDADES DE SEGURIDAD (CRÍTICAS)

### 1. **Bypass de Autenticación en Desarrollo** ⚠️ CRÍTICO
**Archivos afectados:**
- `middleware.ts` (líneas 15-18)
- `lib/auth.ts` (líneas 9-22)

**Problema:**
```typescript
// BYPASS LOGIN EN DESARROLLO - TODO: Remover antes de producción
if (process.env.NODE_ENV === 'development' && process.env.DISABLE_AUTH === 'true') {
  return NextResponse.next()
}
```

**Acción:**
- ✅ ELIMINAR completamente este código antes de producción
- Implementar autenticación real para entornos de desarrollo (usar cuentas de test)

### 2. **Placeholders de Variables de Entorno** ⚠️ CRÍTICO
**Archivos afectados:**
- `middleware.ts` (líneas 21-27)
- `lib/supabase/server.ts` (líneas 6-7)

**Problema:**
```typescript
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder_anon_key'
```

**Acción:**
- ELIMINAR fallbacks a placeholders
- Implementar validación estricta de variables de entorno al inicio de la app
- Lanzar error si faltan variables críticas

### 3. **Webhook de Trello Sin Verificación de Firma** ⚠️ ALTO
**Archivo:** `app/api/trello/webhook/route.ts`

**Problema:**
```typescript
function verifyTrelloWebhook(body: string, signature: string, secret: string): boolean {
  if (!secret) {
    // If no secret configured, skip verification (not recommended for production)
    return true
  }
  // ...
}
```

**Acción:**
- Hacer obligatoria la verificación de firma
- Rechazar webhooks sin firma válida

### 4. **Rate Limiting en Memoria** ⚠️ MEDIO
**Archivo:** `lib/rate-limit.ts`

**Problema:**
El rate limiting usa un Map en memoria, lo cual:
- No persiste entre reinicios del servidor
- No funciona en entornos con múltiples instancias (serverless/multi-pod)

**Acción:**
- Migrar a Redis o Upstash para rate limiting distribuido
- Considerar usar Vercel Rate Limiting para deploy en Vercel

### 5. **Ausencia de Row Level Security (RLS) Verificado**
**Problema:**
Aunque Supabase soporta RLS, las queries se hacen principalmente desde el servidor sin verificar que RLS esté configurado correctamente para cada tabla.

**Acción:**
- Auditar todas las tablas y verificar políticas RLS
- Implementar tests automatizados para verificar aislamiento de datos entre tenants

### 6. **Exposición de Datos en Filtros API**
**Problema en múltiples APIs:**
Los filtros `agency_id`, `seller_id` se reciben del frontend sin validar que el usuario tenga permiso sobre esos recursos.

**Ejemplo en `app/api/operations/route.ts`:**
```typescript
const agencyId = searchParams.get("agencyId")
if (agencyId && agencyId !== "ALL") {
  query = query.eq("agency_id", agencyId)
}
```

**Acción:**
- Validar que el usuario pertenece a la agencia antes de filtrar
- Implementar middleware de validación de permisos por recurso

---

## 🔧 CÓDIGO ESPECÍFICO DEL CLIENTE A ELIMINAR

### 1. **Integración de Trello** 🗑️
**Archivos a eliminar/modificar:**
```
lib/trello/                          # Directorio completo
app/api/trello/                      # Directorio completo (10 archivos)
components/settings/trello-*         # Componentes de configuración
supabase/migrations/002_add_webhook_fields.sql
supabase/migrations/003_add_trello_source.sql
supabase/migrations/004_add_trello_list_id.sql
supabase/migrations/022_add_trello_full_data.sql
supabase/migrations/030_add_trello_sync_checkpoint.sql
```

**Tablas a eliminar:**
- `settings_trello`
- Campos en `leads`: `trello_url`, `trello_list_id`, `trello_full_data`, `external_id` (solo si es de Trello)

**Scripts a eliminar:**
- Todos los scripts en `/scripts/` relacionados con Trello (15+ archivos)

**Acción:**
- Convertir en una **integración opcional** vía sistema de plugins/integraciones
- Mover a un paquete separado que se pueda habilitar por tenant

### 2. **Integración de Manychat** 🗑️
**Archivos a modificar:**
```
app/api/webhooks/manychat/route.ts
app/api/manychat/                    # Directorio completo
lib/manychat/                        # Si existe
supabase/migrations/057_add_manychat_source.sql
supabase/migrations/058_add_manychat_full_data.sql
supabase/migrations/060_create_manychat_list_order.sql
```

**Acción:**
- Convertir en integración opcional
- Crear sistema genérico de webhooks para CRM externos

### 3. **Branding Hardcoded "MAXEVA GESTIÓN"** 🔄
**Archivos afectados:**
```
app/(auth)/login/page.tsx            # "MAXEVA GESTION"
components/app-sidebar.tsx           # "MAXEVA GESTION"
components/site-header.tsx           # (probablemente)
lib/auth.ts                          # email: 'dev@erplozada.com'
lib/email/email-service.ts           # "Maxeva Gestión"
package.json                         # name: "erplozada"
```

**Acción:**
- Crear configuración de branding por tenant:
  - `app_name`
  - `logo_url`
  - `primary_color`
  - `email_from_name`
- Almacenar en tabla `tenant_settings` o similar

### 4. **Referencias a Agencias Específicas**
**Archivos afectados:**
```
supabase/migrations/033_seed_agencies.sql    # Seed de agencias específicas (Rosario, Madero)
scripts/setup-madero-complete.ts
scripts/sync-rosario-complete.ts
scripts/register-webhook-rosario.ts
```

**Acción:**
- Eliminar seeds específicos
- Crear sistema de onboarding para nuevos tenants

### 5. **Configuración de Puertos Hardcoded**
**Archivo:** `package.json`
```json
"dev": "next dev -p 3044",
"start": "next start -p 3005",
```

**Acción:**
- Usar variables de entorno para puertos
- `"dev": "next dev -p ${PORT:-3000}"`

---

## 🏗️ MEJORAS ARQUITECTÓNICAS NECESARIAS

### 1. **Sistema de Tenants Robusto**
**Estado actual:** Multi-agencia básico
**Necesario para SaaS:**

```typescript
// Nueva estructura propuesta
interface Tenant {
  id: string
  name: string
  slug: string              // para subdominios: {slug}.vibook.app
  plan: 'FREE' | 'PRO' | 'ENTERPRISE'
  settings: TenantSettings
  created_at: Date
  subscription_status: 'ACTIVE' | 'TRIAL' | 'SUSPENDED' | 'CANCELLED'
  trial_ends_at: Date | null
}

interface TenantSettings {
  branding: {
    name: string
    logo_url: string
    primary_color: string
    favicon_url: string
  }
  features: {
    max_users: number
    max_operations_per_month: number
    ai_enabled: boolean
    custom_integrations: boolean
  }
  integrations: {
    trello?: TrelloConfig
    manychat?: ManychatConfig
    whatsapp?: WhatsappConfig
  }
}
```

### 2. **Sistema de Suscripciones/Billing**
**Implementar:**
- Integración con Stripe o similar
- Planes de precios (Free, Pro, Enterprise)
- Límites por plan (usuarios, operaciones, storage)
- Gestión de pruebas gratuitas
- Facturación automática

### 3. **Sistema de Integraciones Modular**
**Actual:** Integraciones hardcoded
**Propuesta:**

```typescript
// Sistema de plugins/integraciones
interface Integration {
  id: string
  name: string
  type: 'CRM' | 'CALENDAR' | 'ACCOUNTING' | 'MESSAGING' | 'CUSTOM'
  tenant_id: string
  config: Record<string, any>
  is_active: boolean
  webhook_url?: string
}

// Mover Trello, Manychat, WhatsApp a este sistema
```

### 4. **Auditoría y Logs**
**Archivo existente pero incompleto:** `lib/audit-log.ts`

**Mejorar:**
- Logging de todas las acciones sensibles
- Retención configurable por tenant
- Dashboard de auditoría
- Exportación de logs

### 5. **Backups y Recuperación**
**Implementar:**
- Backups automáticos por tenant
- Exportación de datos (GDPR compliance)
- Importación de datos
- Soft deletes para recuperación

### 6. **API Rate Limiting por Tenant**
```typescript
// Límites diferenciados por plan
const RATE_LIMITS_BY_PLAN = {
  FREE: { requests_per_minute: 30, requests_per_day: 1000 },
  PRO: { requests_per_minute: 100, requests_per_day: 10000 },
  ENTERPRISE: { requests_per_minute: 500, requests_per_day: 100000 }
}
```

---

## 🗃️ MIGRACIONES DE BASE DE DATOS NECESARIAS

### Nuevas Tablas Requeridas

```sql
-- 1. Tenants (reemplaza/extiende agencies)
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  plan TEXT NOT NULL DEFAULT 'FREE',
  settings JSONB NOT NULL DEFAULT '{}',
  subscription_id TEXT,                    -- ID de Stripe/billing
  subscription_status TEXT DEFAULT 'TRIAL',
  trial_ends_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Integrations
CREATE TABLE integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  webhook_url TEXT,
  webhook_secret TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tenant_id, type)
);

-- 3. Usage Tracking
CREATE TABLE usage_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  operations_count INTEGER DEFAULT 0,
  api_calls_count INTEGER DEFAULT 0,
  storage_bytes BIGINT DEFAULT 0,
  users_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tenant_id, period_start)
);

-- 4. Audit Logs mejorado
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_audit_logs_tenant ON audit_logs(tenant_id, created_at DESC);
```

### Migraciones de Tablas Existentes

```sql
-- Agregar tenant_id a agencies (o reemplazar agencies por tenants)
ALTER TABLE agencies ADD COLUMN tenant_id UUID REFERENCES tenants(id);

-- Agregar soft deletes a tablas principales
ALTER TABLE operations ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE leads ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE customers ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;

-- Índices para soft deletes
CREATE INDEX idx_operations_not_deleted ON operations(id) WHERE deleted_at IS NULL;
```

---

## 🎨 MEJORAS DE UX/UI PARA SAAS

### 1. **Onboarding de Nuevos Tenants**
- Wizard de configuración inicial
- Importación de datos existentes
- Tour guiado del producto
- Templates pre-configurados por industria

### 2. **Panel de Administración de Tenant**
- Gestión de usuarios
- Configuración de branding
- Gestión de integraciones
- Uso y facturación
- Exportación de datos

### 3. **Subdominios por Tenant**
```
tenant-slug.vibook.app
```
O rutas:
```
app.vibook.app/tenant-slug/dashboard
```

### 4. **Página de Marketing/Landing**
- Precios
- Features
- Sign up
- Login

---

## 📋 PLAN DE ACCIÓN PRIORIZADO

### Fase 1: Seguridad (1-2 semanas) 🔴 CRÍTICO
1. [ ] Eliminar bypass de autenticación
2. [ ] Eliminar placeholders de variables de entorno
3. [ ] Implementar validación obligatoria de webhooks
4. [ ] Auditar y configurar RLS en todas las tablas
5. [ ] Implementar validación de permisos en todas las APIs

### Fase 2: Desacoplamiento de Integraciones (2-3 semanas) 🟠
1. [ ] Crear sistema modular de integraciones
2. [ ] Mover Trello a integración opcional
3. [ ] Mover Manychat a integración opcional
4. [ ] Crear webhook genérico para CRMs externos
5. [ ] Limpiar código y dependencias específicas

### Fase 3: Multi-Tenancy Robusto (2-3 semanas) 🟡
1. [ ] Crear tabla `tenants` y migraciones
2. [ ] Implementar gestión de tenants
3. [ ] Configurar branding dinámico
4. [ ] Implementar límites por plan
5. [ ] Crear panel de administración de tenant

### Fase 4: Billing y Suscripciones (2-3 semanas) 🟡
1. [ ] Integrar Stripe
2. [ ] Definir planes de precios
3. [ ] Implementar gestión de suscripciones
4. [ ] Crear página de precios
5. [ ] Implementar trials

### Fase 5: Mejoras de Infraestructura (1-2 semanas) 🟢
1. [ ] Migrar rate limiting a Redis
2. [ ] Implementar logging centralizado
3. [ ] Configurar backups automáticos
4. [ ] Implementar monitoreo (Sentry, etc.)
5. [ ] Tests de integración para multi-tenancy

### Fase 6: UX y Onboarding (2-3 semanas) 🟢
1. [ ] Crear landing page
2. [ ] Implementar flujo de sign-up
3. [ ] Crear wizard de onboarding
4. [ ] Documentación de usuario
5. [ ] Documentación de API

---

## 📁 ARCHIVOS A ELIMINAR

```bash
# Integraciones específicas del cliente
rm -rf lib/trello/
rm -rf app/api/trello/
rm -rf lib/manychat/  # si existe como directorio separado

# Scripts específicos de cliente
rm scripts/setup-madero-complete.ts
rm scripts/sync-rosario-complete.ts
rm scripts/register-webhook-rosario.ts
rm scripts/configure-trello-mapping.ts
rm scripts/reset-and-sync-trello-production.ts
rm scripts/setup-trello-complete.ts
rm scripts/fix-trello-webhook-madero.ts
rm scripts/fix-trello-webhook.ts
rm scripts/register-trello-webhook-production.ts
rm scripts/register-trello-webhooks-production.ts
rm scripts/trello-restore-integration.ts
rm scripts/trello-health-check.ts
rm scripts/map-trello-members-to-sellers.ts

# Documentación específica
rm -rf docs/trello/

# Backups específicos
rm -rf backups/
```

---

## 📊 MÉTRICAS DE ÉXITO

Para validar la conversión a SaaS exitosa:

1. **Seguridad**: 0 vulnerabilidades críticas
2. **Aislamiento**: Tests pasan al verificar que tenant A no puede ver datos de tenant B
3. **Performance**: < 200ms tiempo de respuesta promedio por API
4. **Escalabilidad**: Soportar 100+ tenants sin degradación
5. **Onboarding**: Tiempo de setup < 5 minutos para nuevo tenant
6. **Documentación**: 100% de APIs documentadas

---

## 🔗 REFERENCIAS

- [Supabase Multi-Tenancy](https://supabase.com/docs/guides/auth/multi-tenancy)
- [Next.js Multi-Tenant](https://nextjs.org/docs/app/building-your-application/routing/multi-tenant)
- [Stripe Billing](https://stripe.com/docs/billing)

---

*Documento generado el: Enero 2026*
*Versión: 1.0*
