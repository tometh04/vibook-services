# Guía Detallada para Replicar Cambios - Últimas 12 Horas

**Fecha:** 2026-01-14  
**Proyecto:** maxeva-saas  
**Período:** Últimas 12 horas (14 commits)

---

## 📋 Índice

1. [Cambios en Leads y CRM](#cambios-en-leads-y-crm)
2. [Cambios en Aislamiento SaaS](#cambios-en-aislamiento-saas)
3. [Cambios en Suscripciones](#cambios-en-suscripciones)
4. [Cambios en Gestión de Usuarios](#cambios-en-gestión-de-usuarios)
5. [Cambios en UI/UX](#cambios-en-uiux)
6. [Correcciones de Base de Datos](#correcciones-de-base-de-datos)
7. [Migraciones de Base de Datos](#migraciones-de-base-de-datos)
8. [Checklist de Replicación](#checklist-de-replicación)

---

## 1. Cambios en Leads y CRM

### 1.1. Mejorar kanban drag-drop con actualizaciones optimistas

**Archivos afectados:**
- `components/sales/leads-kanban.tsx`
- `components/sales/leads-page-client.tsx`
- `components/sales/new-lead-dialog.tsx`

**Cambios a realizar:**

1. **En `leads-kanban.tsx`:**
   ```typescript
   // Agregar estado local para actualizaciones optimistas
   const [leads, setLeads] = useState<Lead[]>(initialLeads)
   
   // Actualizar estado cuando cambian initialLeads
   useEffect(() => {
     setLeads(initialLeads)
   }, [initialLeads])
   
   // En handleDrop, actualizar optimistamente
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
       onRefresh?.() // Callback para refrescar datos
     } catch (error) {
       toast.error("Error al actualizar estado")
     }
   }
   ```

2. **Agregar botón "Convertir a Operación":**
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

3. **En `leads-page-client.tsx`:**
   ```typescript
   // Remover filtro source=CRM al cargar leads
   const loadLeads = async (agencyId: string) => {
     const url = new URL("/api/leads", window.location.origin)
     url.searchParams.set("agencyId", agencyId)
     // NO agregar source=CRM aquí
     
     const response = await fetch(url.toString())
     // ...
   }
   
   // En Realtime subscription, solo agregar si source es CRM
   if (payload.eventType === 'INSERT') {
     const newLead = payload.new as Lead
     const shouldAdd = 
       (selectedAgencyId === "ALL" || newLead.agency_id === selectedAgencyId) &&
       newLead.source === 'CRM' // Solo leads del CRM
     
     if (shouldAdd) {
       setLeads((prev) => [newLead, ...prev])
     }
   }
   ```

---

### 1.2. Eliminar campos inexistentes en creación de leads

**Archivos afectados:**
- `app/api/leads/route.ts`

**Cambios a realizar:**

```typescript
// ELIMINAR estos campos del payload:
// - quoted_price
// - deposit_amount
// - deposit_currency
// - deposit_method
// - deposit_date

// En POST handler:
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
  agency_id,
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
  agency_id,
}
```

---

## 2. Cambios en Aislamiento SaaS

### 2.1. Filtrar vendedores por agencia

**Archivos afectados:**
- `app/(dashboard)/operations/page.tsx`
- `app/(dashboard)/sales/leads/page.tsx`
- `app/api/users/route.ts`

**Cambios a realizar:**

1. **En `operations/page.tsx`:**
   ```typescript
   // Obtener vendedores de las agencias del usuario
   const sellersQuery = supabase
     .from("user_agencies")
     .select("user_id")
     .in("agency_id", userAgencyIds)
   
   const { data: userAgenciesData } = await sellersQuery
   const userIds = Array.from(
     new Set((userAgenciesData || []).map((ua: any) => ua.user_id))
   )
   
   // Filtrar usuarios por esos IDs y rol SELLER
   const { data: sellersData } = await supabase
     .from("users")
     .select("id, name, email")
     .in("id", userIds.length > 0 ? userIds : ["00000000-0000-0000-0000-000000000000"])
     .in("role", ["SELLER", "ADMIN"])
   
   const sellers = (sellersData || []).map((u: any) => ({
     id: u.id,
     name: u.name || u.email,
   }))
   ```

2. **En `leads/page.tsx` (similar):**
   ```typescript
   // Mismo patrón que operations/page.tsx
   // Filtrar sellers por agencyIds del usuario
   ```

3. **En `app/api/users/route.ts`:**
   ```typescript
   // Obtener agencias del usuario actual
   const { data: userAgencies } = await supabase
     .from("user_agencies")
     .select("agency_id")
     .eq("user_id", user.id)
   
   const agencyIds = (userAgencies || []).map((ua: any) => ua.agency_id)
   
   // Filtrar usuarios por esas agencias
   let query = supabase
     .from("users")
     .select(`
       id, name, email, role, created_at,
       user_agencies(agency_id, agencies(id, name))
     `)
   
   if (user.role !== "SUPER_ADMIN" && agencyIds.length > 0) {
     query = query.in("id", 
       supabase
         .from("user_agencies")
         .select("user_id")
         .in("agency_id", agencyIds)
     )
   }
   ```

---

### 2.2. Corregir orden de queries Supabase

**Archivos afectados:**
- `app/api/customers/route.ts`
- `app/api/customers/statistics/route.ts`

**Cambios a realizar:**

```typescript
// ❌ INCORRECTO
let query = supabase.from("customers")
query = query.in("agency_id", agencyIds)
const { data } = await query.select("*")

// ✅ CORRECTO
let query = supabase
  .from("customers")
  .select("*")
  
if (agencyIds.length > 0) {
  query = query.in("agency_id", agencyIds)
}

const { data } = await query
```

**Regla:** Siempre llamar `.select()` ANTES de `.in()`, `.eq()`, `.gte()`, etc.

---

## 3. Cambios en Suscripciones

### 3.1. Crear API route para bypass RLS

**Archivos afectados:**
- `app/api/subscription/route.ts` (NUEVO)
- `hooks/use-subscription.ts`

**Cambios a realizar:**

1. **Crear `app/api/subscription/route.ts`:**
   ```typescript
   import { NextResponse } from "next/server"
   import { createServerClient } from "@/lib/supabase/server"
   import { getCurrentUser } from "@/lib/auth"
   import { createClient } from "@supabase/supabase-js"
   
   export async function GET(request: Request) {
     try {
       const { user } = await getCurrentUser()
       const supabase = await createServerClient()
       
       // Obtener agencias del usuario
       const { data: userAgencies } = await supabase
         .from("user_agencies")
         .select("agency_id")
         .eq("user_id", user.id)
       
       const agencyIds = (userAgencies || []).map((ua: any) => ua.agency_id)
       
       if (agencyIds.length === 0) {
         return NextResponse.json({ subscription: null })
       }
       
       // Usar admin client para bypass RLS
       const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
       const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
       
       if (!supabaseUrl || !supabaseServiceKey) {
         return NextResponse.json({ error: "Configuración faltante" }, { status: 500 })
       }
       
       const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
         auth: { autoRefreshToken: false, persistSession: false }
       })
       
       // Buscar suscripción activa en cualquiera de las agencias
       const { data: subscriptions } = await adminClient
         .from("subscriptions")
         .select(`
           *,
           subscription_plans(
             id, name, price, currency,
             max_users, max_operations_per_month, max_integrations
           )
         `)
         .in("agency_id", agencyIds)
         .eq("status", "active")
         .order("created_at", { ascending: false })
         .limit(1)
       
       return NextResponse.json({ 
         subscription: subscriptions?.[0] || null 
       })
     } catch (error: any) {
       console.error("Error fetching subscription:", error)
       return NextResponse.json({ error: error.message }, { status: 500 })
     }
   }
   ```

2. **Actualizar `hooks/use-subscription.ts`:**
   ```typescript
   // Cambiar de:
   const { data } = await supabase
     .from("subscriptions")
     .select(...)
   
   // A:
   const response = await fetch("/api/subscription")
   const { subscription } = await response.json()
   ```

---

### 3.2. Implementar límites de usuarios según plan

**Archivos afectados:**
- `supabase/migrations/015_update_user_limits.sql` (NUEVO)
- `hooks/use-subscription.ts`

**Cambios a realizar:**

1. **Crear migración `015_update_user_limits.sql`:**
   ```sql
   -- Agregar columnas de límites a subscription_plans
   ALTER TABLE subscription_plans
   ADD COLUMN IF NOT EXISTS max_users INTEGER,
   ADD COLUMN IF NOT EXISTS max_operations_per_month INTEGER,
   ADD COLUMN IF NOT EXISTS max_integrations INTEGER;
   
   -- Actualizar límites según plan
   UPDATE subscription_plans
   SET 
     max_users = CASE 
       WHEN name = 'Starter' THEN 5
       WHEN name = 'Pro' THEN 15
       WHEN name = 'Business' THEN NULL -- Ilimitado
       ELSE 5
     END,
     max_operations_per_month = CASE
       WHEN name = 'Starter' THEN 50
       WHEN name = 'Pro' THEN 200
       WHEN name = 'Business' THEN NULL -- Ilimitado
       ELSE 50
     END,
     max_integrations = CASE
       WHEN name = 'Starter' THEN 2
       WHEN name = 'Pro' THEN 5
       WHEN name = 'Business' THEN NULL -- Ilimitado
       ELSE 2
     END;
   ```

2. **En `use-subscription.ts`, verificar límites:**
   ```typescript
   const checkUserLimit = () => {
     if (!subscription?.subscription_plans?.max_users) return true
     
     const currentUsers = userCount // Obtener de API
     return currentUsers < subscription.subscription_plans.max_users
   }
   ```

---

## 4. Cambios en Gestión de Usuarios

### 4.1. Crear página /settings/users

**Archivos afectados:**
- `app/(dashboard)/settings/users/page.tsx` (NUEVO)

**Cambios a realizar:**

```typescript
import { UsersSettings } from "@/components/settings/users-settings"

export default function UsersSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Usuarios</h1>
        <p className="text-muted-foreground">
          Gestiona los usuarios de tu agencia
        </p>
      </div>
      <UsersSettings />
    </div>
  )
}
```

---

### 4.2. Crear página /auth/accept-invite

**Archivos afectados:**
- `app/(auth)/auth/accept-invite/page.tsx`

**Cambios a realizar:**

```typescript
import { Suspense } from "react"
import { AcceptInviteClient } from "./accept-invite-client"

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <AcceptInviteClient />
    </Suspense>
  )
}
```

Y en `accept-invite-client.tsx`, usar `useSearchParams()` normalmente.

---

### 4.3. Eliminar campos inexistentes en creación de usuarios

**Archivos afectados:**
- `app/api/settings/users/invite/route.ts`

**Cambios a realizar:**

```typescript
// ELIMINAR:
default_commission_percentage: body.default_commission_percentage || null,

// Este campo no existe en la tabla users
```

---

## 5. Cambios en UI/UX

### 5.1. Agregar Toaster de notificaciones

**Archivos afectados:**
- `app/layout.tsx`

**Cambios a realizar:**

```typescript
import { Toaster } from "sonner"

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  )
}
```

---

### 5.2. Manejar valores null/undefined en configuración

**Archivos afectados:**
- `components/customers/customers-settings-page-client.tsx`

**Cambios a realizar:**

```typescript
// Fusionar con valores por defecto
const mergedSettings = {
  ...settings,
  custom_fields: settings.custom_fields || [],
  notifications: settings.notifications || [],
}

// Usar mergedSettings en lugar de settings directamente
```

---

## 6. Correcciones de Base de Datos

### 6.1. Corregir endpoint /api/agencies

**Archivos afectados:**
- `app/api/agencies/route.ts`

**Cambios a realizar:**

```typescript
// ELIMINAR wrapper getCachedAgencies que usa unstable_cache
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

## 7. Migraciones de Base de Datos

### 7.1. Límites de usuarios

**Archivo:** `supabase/migrations/015_update_user_limits.sql`

Ver sección 3.2 para el SQL completo.

---

## 8. Checklist de Replicación

### ✅ Pre-requisitos
- [ ] Base de datos con estructura similar
- [ ] Variables de entorno configuradas (SUPABASE_SERVICE_ROLE_KEY)
- [ ] Componentes UI disponibles (sonner, shadcn/ui)

### ✅ Cambios en Leads
- [ ] Implementar actualizaciones optimistas en Kanban
- [ ] Agregar botón "Convertir a Operación"
- [ ] Eliminar campos inexistentes del API
- [ ] Corregir filtro de leads nuevos

### ✅ Cambios en Aislamiento SaaS
- [ ] Filtrar vendedores por agencia
- [ ] Corregir orden de queries Supabase
- [ ] Verificar que usuarios solo ven sus agencias

### ✅ Cambios en Suscripciones
- [ ] Crear API route /api/subscription
- [ ] Actualizar hook useSubscription
- [ ] Aplicar migración de límites

### ✅ Cambios en Usuarios
- [ ] Crear página /settings/users
- [ ] Crear página /auth/accept-invite
- [ ] Eliminar campos inexistentes

### ✅ Cambios en UI/UX
- [ ] Agregar Toaster
- [ ] Manejar valores null/undefined

### ✅ Migraciones
- [ ] Ejecutar migración 015_update_user_limits.sql

### ✅ Testing
- [ ] Probar drag-drop en Kanban
- [ ] Probar conversión de lead a operación
- [ ] Verificar aislamiento SaaS
- [ ] Verificar suscripciones y paywall
- [ ] Probar creación de usuarios

---

## 📝 Notas Importantes

1. **Orden de queries Supabase:** Siempre `.select()` antes de filtros
2. **RLS y suscripciones:** Usar admin client en API route
3. **Actualizaciones optimistas:** Revertir en caso de error
4. **Aislamiento SaaS:** Crítico para seguridad multi-tenant

---

**Fin de la guía**
