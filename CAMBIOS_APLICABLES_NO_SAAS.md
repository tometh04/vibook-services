# Cambios Aplicables a Proyecto No-SaaS

**Fecha de generación:** 2026-01-14  
**Proyecto:** maxeva-saas (filtrado para proyecto no-SaaS)  
**Nota:** Este documento contiene SOLO los cambios que aplican a proyectos que NO son SaaS (sin paywall, sin multi-tenant, sin suscripciones)

---

## 📊 Resumen General

**Total de cambios aplicables:** 10  
**Archivos modificados:** ~12 archivos  
**Categorías:** Leads/CRM, UI/UX, Gestión de Usuarios, Correcciones de Base de Datos

---

## 🔄 Cambios Principales por Categoría

### 1. Leads y CRM (Sales)
### 2. Gestión de Usuarios
### 3. UI/UX y Notificaciones
### 4. Correcciones de Base de Datos

---

## 📝 Detalle de Cambios

### 1. Mejorar kanban drag-drop y mostrar leads nuevos

**Tipo:** Feature/Fix  
**Archivos:** 
- `components/sales/leads-kanban.tsx`
- `components/sales/leads-page-client.tsx`
- `components/sales/new-lead-dialog.tsx`

**Cambios:**
- Implementar actualizaciones optimistas para drag-and-drop en Kanban
- Mejorar feedback visual durante arrastre de leads
- Agregar botón "Convertir a Operación" en tarjetas de leads (estados QUOTED/WON)
- Corregir visualización de leads nuevos en Kanban (remover filtro `source=CRM` innecesario)
- Reemplazar `window.location.reload()` con callback `onRefresh()` para mejor UX
- Mejorar manejo de estados durante drag-and-drop

**Implementación:**
```typescript
// En leads-kanban.tsx
const [leads, setLeads] = useState<Lead[]>(initialLeads)

useEffect(() => {
  setLeads(initialLeads)
}, [initialLeads])

const handleDrop = async (e: React.DragEvent, targetStatus: string) => {
  e.preventDefault()
  const leadId = e.dataTransfer.getData("text/plain")
  const lead = leads.find(l => l.id === leadId)
  
  if (!lead || lead.status === targetStatus) return
  
  // Actualización optimista
  const updatedLeads = leads.map(l => 
    l.id === leadId ? { ...l, status: targetStatus } : l
  )
  setLeads(updatedLeads)
  
  try {
    const response = await fetch(`/api/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: targetStatus }),
    })
    
    if (!response.ok) {
      // Revertir en caso de error
      setLeads(leads)
      throw new Error("Error al actualizar lead")
    }
    
    toast.success("Estado actualizado")
    onRefresh?.()
  } catch (error) {
    toast.error("Error al actualizar estado")
  }
}
```

**Agregar botón "Convertir a Operación":**
```typescript
// En la tarjeta del lead (solo para QUOTED o WON)
{(lead.status === "QUOTED" || lead.status === "WON") && (
  <Button
    size="sm"
    variant="outline"
    onClick={() => handleConvertToOperation(lead.id)}
    className="mt-2 w-full"
  >
    <ArrowRight className="h-4 w-4 mr-2" />
    Convertir a Operación
  </Button>
)}
```

**En leads-page-client.tsx:**
```typescript
// Remover filtro source=CRM al cargar leads (mostrar todos)
const loadLeads = async () => {
  const url = new URL("/api/leads", window.location.origin)
  // NO agregar source=CRM aquí
  
  const response = await fetch(url.toString())
  const data = await response.json()
  setLeads(data.leads || [])
}

// En Realtime subscription, agregar todos los leads nuevos
if (payload.eventType === 'INSERT') {
  const newLead = payload.new as Lead
  setLeads((prev) => {
    if (prev.some(l => l.id === newLead.id)) return prev
    toast.success(`🆕 Nuevo lead: ${newLead.contact_name}`)
    return [newLead, ...prev]
  })
}
```

---

### 2. Eliminar campos inexistentes en creación de leads

**Tipo:** Fix  
**Archivos:** `app/api/leads/route.ts`

**Cambios:**
- Eliminar campo `quoted_price` del payload de creación de leads
- Eliminar campos `deposit_amount`, `deposit_currency`, `deposit_method`, `deposit_date`
- Cambiar `source` por defecto de "Other" a "CRM"

**Implementación:**
```typescript
// En POST handler de /api/leads/route.ts
const {
  contact_name,
  contact_phone,
  contact_email,
  contact_instagram,
  destination,
  region,
  status,
  source,
  notes,
  assigned_seller_id,
  // NO incluir: quoted_price, deposit_amount, deposit_currency, deposit_method, deposit_date
} = body

const leadData = {
  contact_name,
  contact_phone,
  contact_email: contact_email || null,
  contact_instagram: contact_instagram || null,
  destination,
  region,
  status: status || "NEW",
  source: source || "CRM", // Cambiar de "Other" a "CRM"
  notes: notes || null,
  assigned_seller_id: assigned_seller_id || null,
}
```

---

### 3. Agregar Toaster de sonner para mostrar notificaciones

**Tipo:** Feature  
**Archivos:** `app/layout.tsx`

**Cambios:**
- Agregar componente `Toaster` de `sonner` al layout raíz
- Permite mostrar notificaciones toast en toda la aplicación
- Mejora feedback visual para acciones del usuario

**Implementación:**
```typescript
// En app/layout.tsx
import { Toaster } from "sonner"

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  )
}
```

---

### 4. Envolver useSearchParams en Suspense boundary

**Tipo:** Fix  
**Archivos:** `app/(auth)/auth/accept-invite/page.tsx`

**Cambios:**
- Envolver componente que usa `useSearchParams` en `<Suspense>` boundary
- Requerido por Next.js para evitar errores de build
- Agregar fallback de loading durante suspense

**Implementación:**
```typescript
// En app/(auth)/auth/accept-invite/page.tsx
import { Suspense } from "react"
import { AcceptInviteClient } from "./accept-invite-client"

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <AcceptInviteClient />
    </Suspense>
  )
}

// En accept-invite-client.tsx, usar useSearchParams normalmente
"use client"
import { useSearchParams } from "next/navigation"

export function AcceptInviteClient() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  // ...
}
```

---

### 5. Crear página /auth/accept-invite para aceptar invitaciones

**Tipo:** Feature  
**Archivos:** `app/(auth)/auth/accept-invite/page.tsx`

**Cambios:**
- Crear página completa para que usuarios invitados establezcan su contraseña
- Validación de fortaleza de contraseña
- Manejo de errores y estados de carga
- UI mejorada para flujo de aceptación de invitación

**Implementación:**
```typescript
// Estructura básica de la página
export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <AcceptInviteClient />
    </Suspense>
  )
}

// En el cliente, implementar:
// - Validación de token
// - Formulario de contraseña
// - Validación de fortaleza
// - Manejo de errores
// - Redirección después de éxito
```

---

### 6. Crear página /settings/users para gestión de usuarios

**Tipo:** Feature  
**Archivos:** `app/(dashboard)/settings/users/page.tsx` (NUEVO)

**Cambios:**
- Crear página para gestión de usuarios
- Permite crear usuarios con roles SELLER, ADMIN, etc.
- Integra componente `UsersSettings` existente
- Resolver error 404 en ruta `/settings/users`

**Implementación:**
```typescript
// En app/(dashboard)/settings/users/page.tsx
import { UsersSettings } from "@/components/settings/users-settings"

export default function UsersSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Usuarios</h1>
        <p className="text-muted-foreground">
          Gestiona los usuarios del sistema
        </p>
      </div>
      <UsersSettings />
    </div>
  )
}
```

---

### 7. Eliminar campos inexistentes en creación de usuarios

**Tipo:** Fix  
**Archivos:** `app/api/settings/users/invite/route.ts`

**Cambios:**
- Eliminar campo `default_commission_percentage` del payload de creación de usuarios
- Campo no existe en el schema de la tabla `users`

**Implementación:**
```typescript
// En POST handler de /api/settings/users/invite/route.ts
const userInsertData = {
  email: body.email,
  name: body.name,
  role: body.role,
  // NO incluir: default_commission_percentage
  // Este campo no existe en la tabla users
}
```

---

### 8. Configuración de clientes - manejo de valores null/undefined

**Tipo:** Fix  
**Archivos:** `components/customers/customers-settings-page-client.tsx`

**Cambios:**
- Fusionar datos de la API con valores por defecto
- Evitar errores de `.map()` en campos `undefined` o `null`
- Inicializar arrays `custom_fields` y `notifications` con valores por defecto

**Implementación:**
```typescript
// En customers-settings-page-client.tsx
const [settings, setSettings] = useState<CustomerSettings | null>(null)

useEffect(() => {
  const loadSettings = async () => {
    const response = await fetch("/api/customers/settings")
    const data = await response.json()
    
    // Fusionar con valores por defecto
    const mergedSettings = {
      ...data.settings,
      custom_fields: data.settings?.custom_fields || [],
      notifications: data.settings?.notifications || [],
    }
    
    setSettings(mergedSettings)
  }
  loadSettings()
}, [])

// Usar mergedSettings en lugar de settings directamente
{settings?.custom_fields?.map((field) => (
  // ...
))}
```

---

### 9. Corregir orden de queries Supabase

**Tipo:** Fix  
**Archivos:**
- `app/api/customers/route.ts`
- `app/api/customers/statistics/route.ts`

**Cambios:**
- Corregir orden de métodos en query de Supabase
- `.select()` debe llamarse ANTES de `.in()` o `.eq()`
- Resolver errores de query builder

**Implementación:**
```typescript
// ❌ INCORRECTO
let query = supabase.from("customers")
query = query.in("id", ids)
const { data } = await query.select("*")

// ✅ CORRECTO
let query = supabase
  .from("customers")
  .select("*")
  
if (ids.length > 0) {
  query = query.in("id", ids)
}

const { data } = await query
```

**Regla importante:** Siempre llamar `.select()` ANTES de `.in()`, `.eq()`, `.gte()`, etc.

---

### 10. Corregir endpoint /api/agencies (si aplica)

**Tipo:** Fix  
**Archivos:** `app/api/agencies/route.ts`

**Cambios:**
- Eliminar wrapper `getCachedAgencies` que usaba `unstable_cache`
- El cache causaba conflictos con `cookies()` de Next.js
- Hacer query directo a Supabase sin cache

**Nota:** Solo aplicar si el proyecto tiene múltiples agencias. Si es un proyecto single-tenant, este cambio puede no ser necesario.

**Implementación:**
```typescript
// ELIMINAR wrapper con unstable_cache
// Hacer query directo:

export async function GET() {
  const supabase = await createServerClient()
  const { user } = await getCurrentUser()
  
  const { data: agencies } = await supabase
    .from("agencies")
    .select("*")
    .order("name")
  
  return NextResponse.json({ agencies: agencies || [] })
}
```

---

## 📋 Resumen por Módulo

### Módulo: Leads y CRM
- ✅ Mejora de drag-and-drop en Kanban con actualizaciones optimistas
- ✅ Botón "Convertir a Operación" en leads QUOTED/WON
- ✅ Corrección de visualización de leads nuevos
- ✅ Eliminación de campos inexistentes (`quoted_price`, `deposit_*`)

### Módulo: Gestión de Usuarios
- ✅ Página `/settings/users` para gestión de usuarios
- ✅ Página `/auth/accept-invite` para aceptar invitaciones
- ✅ Corrección de campos inexistentes en creación de usuarios

### Módulo: UI/UX
- ✅ Toaster de notificaciones (sonner)
- ✅ Mejoras en feedback visual (drag-drop, notificaciones)
- ✅ Suspense boundaries para Next.js
- ✅ Manejo de valores null/undefined

### Módulo: Correcciones de Base de Datos
- ✅ Eliminación de campos inexistentes en schemas
- ✅ Corrección de queries Supabase (orden `.select()` y `.in()`)

---

## 🎯 Cambios Críticos

1. **Orden de queries Supabase** - Crítico para que las queries funcionen
2. **Actualizaciones optimistas** - Mejora significativa en UX
3. **Eliminación de campos inexistentes** - Evita errores en runtime

---

## 🔧 Dependencias

- `sonner` - Ya debería estar en el proyecto, solo agregar al layout
- No hay nuevas dependencias de npm

---

## 📊 Estadísticas

- **Cambios aplicables:** 10
- **Features:** 4
- **Fixes:** 6
- **Archivos nuevos:** 2 (páginas)
- **Migraciones de DB:** 0 (no se requieren)

---

## 🔍 Cambios Técnicos Importantes

### 1. Patrón de Query Supabase
```typescript
// ❌ INCORRECTO
query.in("field", values).select("*")

// ✅ CORRECTO
query.select("*").in("field", values)
```

### 2. Actualizaciones Optimistas
```typescript
// Actualizar UI inmediatamente, luego sincronizar con servidor
setLeads(updatedLeads)
await updateLeadStatus(leadId, newStatus)
// Si falla, revertir: setLeads(originalLeads)
```

### 3. Manejo de Valores Null/Undefined
```typescript
// Fusionar con valores por defecto
const merged = {
  ...data,
  arrayField: data.arrayField || [],
  objectField: data.objectField || {},
}
```

---

## ✅ Checklist de Implementación

### Pre-requisitos
- [ ] Base de datos con estructura similar
- [ ] Componentes UI disponibles (sonner, shadcn/ui)
- [ ] Next.js 13+ con App Router

### Cambios en Leads
- [ ] Implementar actualizaciones optimistas en Kanban
- [ ] Agregar botón "Convertir a Operación"
- [ ] Eliminar campos inexistentes del API
- [ ] Corregir filtro de leads nuevos

### Cambios en Usuarios
- [ ] Crear página /settings/users
- [ ] Crear página /auth/accept-invite
- [ ] Eliminar campos inexistentes

### Cambios en UI/UX
- [ ] Agregar Toaster al layout
- [ ] Manejar valores null/undefined en configuración
- [ ] Agregar Suspense boundaries

### Correcciones Técnicas
- [ ] Corregir orden de queries Supabase
- [ ] Verificar que no hay campos inexistentes en APIs

### Testing
- [ ] Probar drag-drop en Kanban
- [ ] Probar conversión de lead a operación
- [ ] Probar creación de usuarios
- [ ] Verificar notificaciones toast
- [ ] Verificar que no hay errores de campos inexistentes

---

## 📝 Notas Importantes

1. **Orden de queries Supabase:** Siempre `.select()` antes de filtros
2. **Actualizaciones optimistas:** Revertir en caso de error
3. **Campos inexistentes:** Verificar schema de base de datos antes de usar campos
4. **Suspense boundaries:** Requerido por Next.js para `useSearchParams`

---

## 🚫 Cambios NO Aplicables (SaaS Only)

Los siguientes cambios NO aplican a proyectos no-SaaS y deben ser ignorados:

- ❌ Aislamiento SaaS multi-tenant
- ❌ Filtrado de vendedores por agencia
- ❌ Suscripciones y paywall
- ❌ Bypass RLS para suscripciones
- ❌ Límites de usuarios por plan
- ❌ Herencia de suscripción
- ❌ Migración de límites de usuarios

---

**Fin del documento**
