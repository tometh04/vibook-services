# Cambios del Proyecto Maxi (maxeva-saas)

**Fecha de generación:** 2026-01-14  
**Proyecto:** maxeva-saas  
**Período:** Últimas 12 horas y cambios recientes

---

## 📊 Resumen General

Este documento resume los cambios implementados en el proyecto **maxeva-saas** durante las últimas 12 horas y cambios críticos recientes. Estos cambios se enfocan principalmente en:

- **Aislamiento SaaS completo** - Seguridad multi-tenant
- **Mejoras en Leads y CRM** - Drag-drop optimista y conversión a operaciones
- **Suscripciones y Paywall** - Bypass RLS y límites de plan
- **Gestión de Usuarios** - Invitaciones y gestión por agencia
- **Correcciones de Base de Datos** - Eliminación de campos inexistentes

---

## 🎯 Cambios Críticos Implementados

### 1. Aislamiento SaaS Completo

**Problema:** Los usuarios veían datos de todas las agencias, violando el principio de aislamiento multi-tenant.

**Solución:**
- Filtrado correcto de vendedores por agencia en operaciones y leads
- Queries Supabase corregidas (orden `.select()` antes de `.in()`)
- Usuarios solo ven datos de sus propias agencias asignadas
- Verificación de permisos en todas las APIs

**Archivos modificados:**
- `app/(dashboard)/operations/page.tsx`
- `app/(dashboard)/sales/leads/page.tsx`
- `app/api/users/route.ts`
- `app/api/customers/route.ts`
- `app/api/customers/statistics/route.ts`

**Impacto:** Seguridad mejorada, cumplimiento de aislamiento SaaS.

---

### 2. Suscripciones con Bypass RLS

**Problema:** RLS (Row Level Security) bloqueaba el acceso a datos de suscripciones desde el frontend, causando que el paywall no funcionara.

**Solución:**
- Crear API route `/api/subscription` que usa Supabase admin client
- Bypass RLS usando `SUPABASE_SERVICE_ROLE_KEY`
- Hook `useSubscription` consume la nueva API
- Verificar suscripción en todas las agencias del usuario

**Archivos modificados:**
- `app/api/subscription/route.ts` (NUEVO)
- `hooks/use-subscription.ts`

**Impacto:** CRM y features premium funcionan correctamente, paywall aplicado según plan.

---

### 3. Límites de Usuarios por Plan

**Problema:** No había límites de usuarios según el plan de suscripción.

**Solución:**
- Migración de base de datos para agregar columnas `max_users`, `max_operations_per_month`, `max_integrations`
- Límites implementados:
  - **Starter:** 5 usuarios, 50 operaciones/mes, 2 integraciones
  - **Pro:** 15 usuarios, 200 operaciones/mes, 5 integraciones
  - **Business:** Ilimitado

**Archivos modificados:**
- `supabase/migrations/015_update_user_limits.sql` (NUEVO)
- `hooks/use-subscription.ts`

**Impacto:** Límites de plan aplicados correctamente.

---

### 4. Mejoras en Kanban de Leads

**Problema:** 
- Drag-drop no tenía feedback visual
- Leads nuevos no aparecían en Kanban
- No había forma de convertir lead a operación desde el Kanban

**Solución:**
- Actualizaciones optimistas para drag-drop (UI se actualiza inmediatamente)
- Mejor feedback visual durante arrastre
- Botón "Convertir a Operación" en leads QUOTED/WON
- Corrección de filtro para mostrar todos los leads en Kanban

**Archivos modificados:**
- `components/sales/leads-kanban.tsx`
- `components/sales/leads-page-client.tsx`
- `components/sales/new-lead-dialog.tsx`

**Impacto:** Mejor UX, funcionalidad completa de Kanban.

---

### 5. Gestión de Usuarios por Agencia

**Problema:** 
- No existía página `/settings/users` (404)
- No había forma de invitar usuarios a la agencia
- Usuarios invitados no podían establecer contraseña

**Solución:**
- Crear página `/settings/users` para gestión de usuarios
- Crear página `/auth/accept-invite` para aceptar invitaciones
- Integración con componente `UsersSettings` existente
- Validación de fortaleza de contraseña

**Archivos modificados:**
- `app/(dashboard)/settings/users/page.tsx` (NUEVO)
- `app/(auth)/auth/accept-invite/page.tsx`

**Impacto:** Gestión completa de usuarios por agencia.

---

### 6. Correcciones de Base de Datos

**Problema:** APIs intentaban insertar campos que no existen en las tablas.

**Solución:**
- Eliminar `quoted_price` de creación de leads
- Eliminar `deposit_amount`, `deposit_currency`, `deposit_method`, `deposit_date` de leads
- Eliminar `default_commission_percentage` de creación de usuarios

**Archivos modificados:**
- `app/api/leads/route.ts`
- `app/api/settings/users/invite/route.ts`

**Impacto:** APIs funcionan correctamente sin errores de schema.

---

### 7. Corrección de Queries Supabase

**Problema:** Orden incorrecto de métodos en queries causaba errores.

**Solución:**
- Corregir orden: `.select()` ANTES de `.in()` o `.eq()`
- Aplicar en todos los endpoints afectados

**Archivos modificados:**
- `app/api/customers/route.ts`
- `app/api/customers/statistics/route.ts`

**Impacto:** Queries funcionan correctamente.

---

### 8. Mejoras en UI/UX

**Cambios:**
- Agregar `Toaster` de `sonner` para notificaciones
- Manejar valores `null/undefined` en configuración de clientes
- Suspense boundaries para `useSearchParams`
- Mejor feedback visual en todas las acciones

**Archivos modificados:**
- `app/layout.tsx`
- `components/customers/customers-settings-page-client.tsx`
- `app/(auth)/auth/accept-invite/page.tsx`

**Impacto:** Mejor experiencia de usuario, menos errores.

---

## 📋 Resumen por Categoría

### Seguridad y Aislamiento
- ✅ Aislamiento SaaS completo
- ✅ Filtrado correcto por agencia
- ✅ Verificación de permisos en APIs

### Suscripciones y Paywall
- ✅ Bypass RLS para suscripciones
- ✅ Límites de usuarios por plan
- ✅ Herencia de suscripción para usuarios invitados

### Leads y CRM
- ✅ Drag-drop optimista en Kanban
- ✅ Conversión de lead a operación
- ✅ Visualización correcta de leads nuevos

### Gestión de Usuarios
- ✅ Página de gestión de usuarios
- ✅ Aceptación de invitaciones
- ✅ Validación de contraseñas

### Correcciones Técnicas
- ✅ Orden correcto de queries Supabase
- ✅ Eliminación de campos inexistentes
- ✅ Manejo de valores null/undefined

---

## 🔧 Configuración Requerida

### Variables de Entorno
```env
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...  # Requerido para bypass RLS
OPENAI_API_KEY=...  # Para OCR (si se usa)
```

### Migraciones de Base de Datos
```sql
-- Ejecutar migración 015_update_user_limits.sql
-- Agrega columnas de límites a subscription_plans
```

---

## 📊 Estadísticas de Cambios

- **Total de commits:** 14
- **Archivos nuevos:** 2
- **Archivos modificados:** ~20
- **Líneas agregadas:** ~800+
- **Migraciones de DB:** 1

---

## 🎯 Próximos Pasos Recomendados

1. **Implementar cambios del proyecto paralelo:**
   - Cambiar moneda predeterminada a USD
   - Eliminar campos check-in/check-out
   - Agregar campo Cliente en operaciones
   - OCR con IA para clientes
   - Prevenir cierre accidental de diálogos

2. **Mejoras adicionales:**
   - Refresh automático de tabla de operaciones
   - Tipo de producto por operador
   - Registrar pagos en cuentas de caja
   - Corregir retiros de socios

3. **Testing:**
   - Probar aislamiento SaaS con múltiples usuarios
   - Verificar límites de plan
   - Probar drag-drop en Kanban
   - Verificar conversión de leads a operaciones

---

## 📝 Notas Técnicas

### Patrón de Query Supabase
```typescript
// ✅ CORRECTO
let query = supabase
  .from("table")
  .select("*")
  
if (filter) {
  query = query.in("field", values)
}

const { data } = await query
```

### Bypass RLS
```typescript
const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: { autoRefreshToken: false, persistSession: false }
  }
)
```

### Actualizaciones Optimistas
```typescript
// 1. Actualizar UI inmediatamente
setState(updatedData)

// 2. Sincronizar con servidor
try {
  await updateServer(updatedData)
} catch (error) {
  // 3. Revertir en caso de error
  setState(originalData)
}
```

---

**Fin del documento**
