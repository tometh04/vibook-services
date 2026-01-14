# Resumen de Cambios - Últimas 12 Horas

**Fecha de generación:** 2026-01-14  
**Período:** Últimas 12 horas desde 2026-01-13 20:00 hasta 2026-01-14 09:15

---

## 📊 Resumen General

**Total de commits:** 14  
**Archivos modificados:** ~20+ archivos  
**Líneas agregadas/eliminadas:** ~800+ líneas

---

## 🔄 Cambios Principales por Categoría

### 1. Leads y CRM (Sales)
### 2. Aislamiento SaaS y Permisos
### 3. Suscripciones y Paywall
### 4. Gestión de Usuarios
### 5. UI/UX y Notificaciones
### 6. Correcciones de Base de Datos

---

## 📝 Detalle de Cambios por Commit

### Commit 1: `2dcdcc5` - Mejorar kanban drag-drop y mostrar leads nuevos
**Tipo:** Feature/Fix  
**Fecha:** 2026-01-14 09:14  
**Archivos:** 
- `components/sales/leads-kanban.tsx`
- `components/sales/leads-page-client.tsx`
- `components/sales/new-lead-dialog.tsx`

**Cambios:**
- Implementar actualizaciones optimistas para drag-and-drop en Kanban
- Mejorar feedback visual durante arrastre de leads
- Agregar botón "Convertir a Operación" en tarjetas de leads (estados QUOTED/WON)
- Corregir visualización de leads nuevos en Kanban (remover filtro `source=CRM`)
- Reemplazar `window.location.reload()` con callback `onRefresh()` para mejor UX
- Mejorar manejo de estados durante drag-and-drop

**Implementación:**
- Estado local `leads` para actualizaciones optimistas
- Callbacks `onRefresh` para actualizar datos sin recargar página
- Validación de estados permitidos para conversión a operación

---

### Commit 2: `56c3453` - Quitar quoted_price que no existe en tabla leads
**Tipo:** Fix  
**Fecha:** 2026-01-13 20:13  
**Archivos:** `app/api/leads/route.ts`

**Cambios:**
- Eliminar campo `quoted_price` del payload de creación de leads
- Campo no existe en el schema de la tabla `leads`

---

### Commit 3: `11b67e8` - Quitar campos deposit_* que no existen en tabla leads
**Tipo:** Fix  
**Fecha:** 2026-01-13 20:09  
**Archivos:** `app/api/leads/route.ts`

**Cambios:**
- Eliminar campos `deposit_amount`, `deposit_currency`, `deposit_method`, `deposit_date` del payload
- Estos campos no existen en el schema de la tabla `leads`
- Cambiar `source` por defecto de "Other" a "CRM"

---

### Commit 4: `9e62e7d` - Usar API route con admin client para obtener suscripciones (bypass RLS)
**Tipo:** Fix (CRÍTICO)  
**Fecha:** 2026-01-13 20:02  
**Archivos:**
- `app/api/subscription/route.ts` (NUEVO)
- `hooks/use-subscription.ts`

**Cambios:**
- **Problema:** RLS (Row Level Security) bloqueaba acceso a datos de suscripciones desde el frontend
- **Solución:** Crear API route `/api/subscription` que usa Supabase admin client (bypass RLS)
- Hook `useSubscription` ahora consume la nueva API en lugar de consultar directamente Supabase
- Agregar logging extensivo para debugging de suscripciones y acceso a features
- Verificar suscripción en todas las agencias del usuario

**Impacto:**
- CRM y features premium ahora funcionan correctamente
- Paywall se aplica correctamente según plan de suscripción

---

### Commit 5: `718de97` - Aislamiento SaaS completo - vendedores y suscripciones
**Tipo:** Fix (CRÍTICO - Seguridad SaaS)  
**Fecha:** 2026-01-13 19:32  
**Archivos:**
- `app/(dashboard)/operations/page.tsx`
- `app/(dashboard)/sales/leads/page.tsx`
- `app/api/users/route.ts`
- `components/operations/operations-table.tsx`
- `hooks/use-subscription.ts`
- `supabase/migrations/015_update_user_limits.sql` (NUEVO)

**Cambios:**
- **Aislamiento SaaS:** Corregir filtro de vendedores por agencia en operaciones y leads
- **Herencia de suscripción:** Usuarios invitados heredan suscripción de la agencia del admin
- **Límites de usuarios:** Implementar límites según plan:
  - Starter: 5 usuarios máximo
  - Pro: 15 usuarios máximo
  - Business: usuarios ilimitados
- **Filtrado de vendedores:** Solo mostrar vendedores de las agencias del usuario actual
- **Migración:** Agregar columnas `max_users`, `max_operations_per_month`, `max_integrations` a `subscription_plans`

**Impacto:**
- Usuarios solo ven datos de sus propias agencias
- Límites de plan se aplican correctamente
- Seguridad multi-tenant mejorada

---

### Commit 6: `1dc1983` - Quitar default_commission_percentage que no existe en tabla users
**Tipo:** Fix  
**Fecha:** 2026-01-13 18:54  
**Archivos:** `app/api/settings/users/invite/route.ts`

**Cambios:**
- Eliminar campo `default_commission_percentage` del payload de creación de usuarios
- Campo no existe en el schema de la tabla `users`

---

### Commit 7: `cd9e353` - Agregar Toaster de sonner para mostrar notificaciones
**Tipo:** Feature  
**Fecha:** 2026-01-13 18:39  
**Archivos:** `app/layout.tsx`

**Cambios:**
- Agregar componente `Toaster` de `sonner` al layout raíz
- Permite mostrar notificaciones toast en toda la aplicación
- Mejora feedback visual para acciones del usuario

---

### Commit 8: `44709eb` - Envolver useSearchParams en Suspense boundary
**Tipo:** Fix  
**Fecha:** 2026-01-13 18:35  
**Archivos:** `app/(auth)/auth/accept-invite/page.tsx`

**Cambios:**
- Envolver componente que usa `useSearchParams` en `<Suspense>` boundary
- Requerido por Next.js para evitar errores de build
- Agregar fallback de loading durante suspense

---

### Commit 9: `65e500c` - Crear página /auth/accept-invite para aceptar invitaciones
**Tipo:** Feature  
**Fecha:** 2026-01-13 18:28  
**Archivos:** `app/(auth)/auth/accept-invite/page.tsx`

**Cambios:**
- Crear página completa para que usuarios invitados establezcan su contraseña
- Validación de fortaleza de contraseña
- Manejo de errores y estados de carga
- UI mejorada para flujo de aceptación de invitación

---

### Commit 10: `1e84383` - Arreglar endpoint /api/agencies - quitar cache que causaba error con cookies
**Tipo:** Fix  
**Fecha:** 2026-01-13 18:19  
**Archivos:** `app/api/agencies/route.ts`

**Cambios:**
- Eliminar wrapper `getCachedAgencies` que usaba `unstable_cache`
- El cache causaba conflictos con `cookies()` de Next.js
- Hacer query directo a Supabase sin cache
- Resolver problema de agencias vacías en formularios

---

### Commit 11: `01205b8` - Crear página /settings/users para gestión de usuarios de agencia
**Tipo:** Feature  
**Fecha:** 2026-01-13 18:14  
**Archivos:** `app/(dashboard)/settings/users/page.tsx` (NUEVO)

**Cambios:**
- Crear página para gestión de usuarios de agencia
- Permite crear usuarios con roles SELLER, ADMIN, etc.
- Integra componente `UsersSettings` existente
- Resolver error 404 en ruta `/settings/users`

---

### Commit 12: `0bd11da` - Configuración de clientes - manejo de valores null/undefined
**Tipo:** Fix  
**Fecha:** 2026-01-13 18:10  
**Archivos:** `components/customers/customers-settings-page-client.tsx`

**Cambios:**
- Fusionar datos de la API con valores por defecto
- Evitar errores de `.map()` en campos `undefined` o `null`
- Inicializar arrays `custom_fields` y `notifications` con valores por defecto

---

### Commit 13: `8ec4414` - Arreglar statistics de clientes y mejorar logs de filtrado de usuarios
**Tipo:** Fix  
**Fecha:** 2026-01-13 18:06  
**Archivos:**
- `app/api/customers/statistics/route.ts`
- `app/api/users/route.ts`

**Cambios:**
- Corregir orden de query: `.select()` ANTES de `.in()`
- Agregar logs detallados para debugging del aislamiento SaaS
- Verificar que usuarios solo vean usuarios de sus propias agencias
- Mejorar filtrado por agencias en endpoint de usuarios

---

### Commit 14: `93f2d40` - Orden correcto - .select() ANTES de .in()
**Tipo:** Fix  
**Fecha:** 2026-01-13 17:47  
**Archivos:** `app/api/customers/route.ts`

**Cambios:**
- Corregir orden de métodos en query de Supabase
- `.select()` debe llamarse ANTES de `.in()` o `.eq()`
- Resolver errores de query builder

---

## 📋 Resumen por Módulo

### Módulo: Leads y CRM
- ✅ Mejora de drag-and-drop en Kanban con actualizaciones optimistas
- ✅ Botón "Convertir a Operación" en leads QUOTED/WON
- ✅ Corrección de visualización de leads nuevos
- ✅ Eliminación de campos inexistentes (`quoted_price`, `deposit_*`)

### Módulo: Aislamiento SaaS
- ✅ Filtrado correcto de vendedores por agencia
- ✅ Usuarios solo ven datos de sus propias agencias
- ✅ Corrección de queries Supabase (orden `.select()` y `.in()`)

### Módulo: Suscripciones
- ✅ API route para bypass RLS en suscripciones
- ✅ Herencia de suscripción para usuarios invitados
- ✅ Límites de usuarios según plan (Starter/Pro/Business)
- ✅ Paywall funciona correctamente

### Módulo: Gestión de Usuarios
- ✅ Página `/settings/users` para gestión de usuarios
- ✅ Página `/auth/accept-invite` para aceptar invitaciones
- ✅ Corrección de campos inexistentes en creación de usuarios

### Módulo: UI/UX
- ✅ Toaster de notificaciones (sonner)
- ✅ Mejoras en feedback visual (drag-drop, notificaciones)
- ✅ Suspense boundaries para Next.js

### Módulo: Correcciones de Base de Datos
- ✅ Eliminación de campos inexistentes en schemas
- ✅ Migración de límites de usuarios
- ✅ Corrección de queries Supabase

---

## 🎯 Cambios Críticos (Requieren Atención Especial)

1. **Aislamiento SaaS** - Cambio importante en seguridad multi-tenant
2. **Suscripciones con bypass RLS** - Nueva API route crítica para paywall
3. **Límites de usuarios** - Migración de base de datos requerida
4. **Filtrado de vendedores** - Afecta todas las vistas de operaciones y leads

---

## 🔧 Dependencias Nuevas

- `sonner` - Ya estaba en el proyecto, se agregó al layout
- No hay nuevas dependencias de npm

---

## 📊 Estadísticas

- **Commits:** 14
- **Features:** 4
- **Fixes:** 10
- **Archivos nuevos:** 2 (API subscription, Migración)
- **Migraciones de DB:** 1

---

## 🔍 Cambios Técnicos Importantes

### 1. Patrón de Query Supabase
```typescript
// ❌ INCORRECTO
query.in("agency_id", agencyIds).select("*")

// ✅ CORRECTO
query.select("*").in("agency_id", agencyIds)
```

### 2. Bypass RLS para Suscripciones
```typescript
// Nueva API route usa admin client
const supabase = createClient(url, serviceRoleKey)
```

### 3. Actualizaciones Optimistas
```typescript
// Actualizar UI inmediatamente, luego sincronizar con servidor
setLeads(updatedLeads)
await updateLeadStatus(leadId, newStatus)
```

---

**Fin del resumen**
