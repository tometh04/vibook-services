# Documentación de Cambios y Mejoras - Vibook Services

Este documento detalla todos los cambios y mejoras realizados en el sistema para poder replicarlos en el sistema de Maxeva.

---

## 📋 Índice

1. [Unificación de Diálogos de Operación](#1-unificación-de-diálogos-de-operación)
2. [Mejoras de UI - Fondos Opacos](#2-mejoras-de-ui---fondos-opacos)
3. [Mejora del Selector de Clientes](#3-mejora-del-selector-de-clientes)
4. [Branding y Temas](#4-branding-y-temas)
5. [Limpieza de Código](#5-limpieza-de-código)

---

## 1. Unificación de Diálogos de Operación

### Problema
Existían dos diálogos diferentes para crear operaciones:
- `NewOperationDialog`: Para crear operaciones manualmente
- `ConvertLeadDialog`: Para convertir leads a operaciones

Ambos tenían código duplicado (más de 1000 líneas) y funcionalidad similar pero con diferencias.

### Solución
Se unificaron ambos diálogos en uno solo (`NewOperationDialog`) que acepta un prop opcional `lead` para precargar datos cuando viene de un lead.

### Cambios Técnicos

#### 1.1. Modificación de `NewOperationDialog`

**Archivo:** `components/operations/new-operation-dialog.tsx`

**Cambios:**
- Agregado prop opcional `lead?: LeadData` a la interfaz `NewOperationDialogProps`
- Agregada función `handleLeadPreload` con `useCallback` que:
  - Busca cliente existente por email o teléfono
  - Si no existe, crea un nuevo cliente con los datos del lead
  - Precarga campos del formulario: `agency_id`, `seller_id`, `customer_id`, `destination`, `notes`
- Agregada función `cleanDestination` para limpiar destinos inválidos del lead
- Título dinámico: "Convertir Lead a Operación" vs "Nueva Operación"
- Incluye `lead_id` en el request cuando se crea la operación desde un lead

**Código clave:**
```typescript
interface LeadData {
  id: string
  contact_name: string
  contact_email?: string | null
  contact_phone?: string | null
  destination: string
  agency_id?: string
  assigned_seller_id?: string | null
  notes?: string | null
}

interface NewOperationDialogProps {
  // ... props existentes
  lead?: LeadData // ← NUEVO
}
```

#### 1.2. Simplificación de `ConvertLeadDialog`

**Archivo:** `components/sales/convert-lead-dialog.tsx`

**Cambios:**
- Eliminado todo el código duplicado (más de 1000 líneas)
- Ahora simplemente renderiza `NewOperationDialog` pasando el lead como prop

**Código resultante:**
```typescript
export function ConvertLeadDialog({ lead, agencies, sellers, operators, open, onOpenChange, onSuccess }: ConvertLeadDialogProps) {
  return (
    <NewOperationDialog
      open={open}
      onOpenChange={onOpenChange}
      onSuccess={onSuccess}
      agencies={agencies}
      sellers={sellers}
      operators={operators}
      defaultAgencyId={lead.agency_id}
      defaultSellerId={lead.assigned_seller_id || undefined}
      lead={lead}
    />
  )
}
```

### Beneficios
- ✅ Eliminación de más de 1000 líneas de código duplicado
- ✅ Mantenimiento más simple: un solo lugar para actualizar
- ✅ Experiencia de usuario consistente
- ✅ Precarga automática de datos del lead (cliente, destino, agencia, vendedor)

---

## 2. Mejoras de UI - Fondos Opacos

### Problema
Los elementos desplegables (dropdowns, selects, popovers, commands) y el overlay de diálogos tenían fondos transparentes que hacían difícil leer el contenido. El problema afectaba a TODOS los componentes desplegables del sistema.

### Solución
Se aumentó la opacidad de los fondos a 95% y se agregó `backdrop-blur-sm` para mejor legibilidad en TODOS los componentes desplegables.

### Cambios Técnicos

#### 2.1. Dropdown Menu

**Archivo:** `components/ui/dropdown-menu.tsx`

**Cambios:**
- `bg-popover` → `bg-popover/95 backdrop-blur-sm` en `DropdownMenuContent`
- `bg-popover` → `bg-popover/95 backdrop-blur-sm` en `DropdownMenuSubContent`

**Antes:**
```typescript
"z-50 ... bg-popover ..."
```

**Después:**
```typescript
"z-50 ... bg-popover/95 backdrop-blur-sm ..."
```

#### 2.2. Select

**Archivo:** `components/ui/select.tsx`

**Cambios:**
- `bg-popover` → `bg-popover/95 backdrop-blur-sm` en `SelectContent`

#### 2.3. Popover

**Archivo:** `components/ui/popover.tsx`

**Cambios:**
- `bg-popover` → `bg-popover/95 backdrop-blur-sm` en `PopoverContent`

**IMPORTANTE:** Este componente es usado por el selector de clientes, por lo que es crítico para la legibilidad.

#### 2.4. Command

**Archivo:** `components/ui/command.tsx`

**Cambios:**
- `bg-popover` → `bg-popover/95 backdrop-blur-sm` en `Command`

**IMPORTANTE:** Este componente es usado por el selector de clientes con búsqueda.

#### 2.5. Dialog Overlay

**Archivo:** `components/ui/dialog.tsx`

**Cambios:**
- `bg-background/80` → `bg-background/95` en `DialogOverlay`

**Antes:**
```typescript
"fixed inset-0 z-50 bg-background/80 backdrop-blur-sm ..."
```

**Después:**
```typescript
"fixed inset-0 z-50 bg-background/95 backdrop-blur-sm ..."
```

#### 2.6. Otros Componentes Desplegables

También se corrigieron:
- **Menubar** (`components/ui/menubar.tsx`): `MenubarContent` y `MenubarSubContent`
- **Context Menu** (`components/ui/context-menu.tsx`): `ContextMenuContent` y `ContextMenuSubContent`
- **Hover Card** (`components/ui/hover-card.tsx`): `HoverCardContent`
- **Navigation Menu** (`components/ui/navigation-menu.tsx`): `NavigationMenuViewport`
- **Tooltip** (`components/ui/tooltip.tsx`): `TooltipContent`

**Patrón aplicado en todos:**
```typescript
// Antes
"bg-popover"

// Después
"bg-popover/95 backdrop-blur-sm"
```

### Beneficios
- ✅ Mejor legibilidad de TODOS los menús desplegables
- ✅ Overlay más visible y profesional
- ✅ Mejor contraste en modo claro y oscuro
- ✅ Consistencia visual en todo el sistema

---

## 3. Mejora del Selector de Clientes

### Problema
El selector de clientes en el diálogo de nueva operación:
- No tenía búsqueda
- Mostraba todos los clientes sin límite
- No tenía scroll visible

### Solución
Se reemplazó el `Select` simple por un `Combobox` con:
- Campo de búsqueda integrado
- Máximo 5 clientes visibles con scroll
- Indicador cuando hay más resultados

### Cambios Técnicos

**Archivo:** `components/operations/new-operation-dialog.tsx`

**Cambios:**
1. Agregados imports:
```typescript
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Check, ChevronsUpDown } from "lucide-react"
```

2. Agregados estados:
```typescript
const [customerSearchOpen, setCustomerSearchOpen] = useState(false)
const [customerSearchQuery, setCustomerSearchQuery] = useState("")
```

3. Reemplazado `Select` por `Popover` + `Command`:
```typescript
<Popover open={customerSearchOpen} onOpenChange={setCustomerSearchOpen}>
  <PopoverTrigger asChild>
    <Button variant="outline" role="combobox" className="w-full justify-between">
      {selectedCustomer ? `${selectedCustomer.first_name} ${selectedCustomer.last_name}` : "Seleccionar cliente"}
      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
    </Button>
  </PopoverTrigger>
  <PopoverContent className="w-full p-0">
    <Command>
      <CommandInput placeholder="Buscar cliente..." value={customerSearchQuery} onValueChange={setCustomerSearchQuery} />
      <CommandList>
        <CommandEmpty>No se encontraron clientes</CommandEmpty>
        <CommandGroup>
          {displayCustomers.slice(0, 5).map((customer) => (
            <CommandItem key={customer.id} value={customer.id} onSelect={() => { /* ... */ }}>
              <Check className={cn("mr-2 h-4 w-4", field.value === customer.id ? "opacity-100" : "opacity-0")} />
              {customer.first_name} {customer.last_name}
            </CommandItem>
          ))}
          {filteredCustomers.length > 5 && (
            <div className="px-2 py-1.5 text-xs text-muted-foreground text-center border-t">
              Mostrando 5 de {filteredCustomers.length} clientes. Usa la búsqueda para filtrar.
            </div>
          )}
        </CommandGroup>
      </CommandList>
    </Command>
  </PopoverContent>
</Popover>
```

### Funcionalidad
- ✅ Búsqueda en tiempo real mientras se escribe
- ✅ Máximo 5 clientes visibles inicialmente
- ✅ Scroll automático si hay más resultados
- ✅ Indicador cuando hay más clientes disponibles
- ✅ Botón + para crear nuevo cliente (sin cambios)
- ✅ Manejo robusto de errores con mensajes informativos
- ✅ Indicador de carga con spinner
- ✅ Mensajes claros cuando no hay clientes

### Correcciones Aplicadas

**Problema encontrado:** El campo de búsqueda no se mostraba correctamente y había problemas de filtrado.

**Solución:**
1. Agregado `shouldFilter={false}` al componente `Command` para control manual del filtrado
2. Cambiado el `value` del `CommandItem` de `customer.id` a `${customer.first_name} ${customer.last_name}` para que el filtrado funcione correctamente
3. Ajustado el ancho del `PopoverContent` para que coincida con el trigger: `w-[var(--radix-popover-trigger-width)]`
4. Mejorado el manejo de estados vacíos y carga
5. Agregado `max-h-[200px]` al `CommandList` para mejor control del scroll

**Código corregido:**
```typescript
<PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
  <Command shouldFilter={false}>
    <CommandInput 
      placeholder="Buscar cliente..." 
      value={customerSearchQuery}
      onValueChange={setCustomerSearchQuery}
    />
    <CommandList className="max-h-[200px]">
      {loadingCustomers ? (
        <div className="p-4 text-center text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin inline-block mr-2" />
          Cargando clientes...
        </div>
      ) : customers.length === 0 ? (
        <CommandEmpty>
          <div className="p-4 text-center text-sm text-muted-foreground">
            No hay clientes disponibles. Usa el botón + para crear uno nuevo.
          </div>
        </CommandEmpty>
      ) : (
        <CommandGroup>
          {displayCustomers.map((customer) => (
            <CommandItem
              key={customer.id}
              value={`${customer.first_name} ${customer.last_name}`} // ← Cambiado de customer.id
              onSelect={() => {
                field.onChange(customer.id)
                setCustomerSearchOpen(false)
                setCustomerSearchQuery("")
              }}
            >
              {/* ... */}
            </CommandItem>
          ))}
        </CommandGroup>
      )}
    </CommandList>
  </Command>
</PopoverContent>
```

**Función loadCustomers mejorada (con useCallback):**
```typescript
const loadCustomers = useCallback(async () => {
  setLoadingCustomers(true)
  try {
    const response = await fetch('/api/customers?limit=200', {
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }))
      console.error('Error loading customers:', response.status, errorData)
      toast({
        title: "Error al cargar clientes",
        description: errorData.error || `Error ${response.status}: ${response.statusText}`,
        variant: "destructive",
      })
      setCustomers([])
      return
    }
    
    const data = await response.json()
    const customersList = (data.customers || []).map((c: any) => ({
      id: c.id,
      first_name: c.first_name || '',
      last_name: c.last_name || '',
    }))
    
    setCustomers(customersList)
    console.log(`[NewOperationDialog] Loaded ${customersList.length} customers`)
  } catch (error) {
    console.error('Error loading customers:', error)
    toast({
      title: "Error al cargar clientes",
      description: error instanceof Error ? error.message : "Error desconocido al cargar clientes",
      variant: "destructive",
    })
    setCustomers([])
  } finally {
    setLoadingCustomers(false)
  }
}, [toast]) // ← Dependencia: toast
```

### Problema de Variables de Entorno de Supabase

**Error en logs de Vercel:**
```
Missing required Supabase environment variables
500 Internal Server Error
```

**Causa:**
Las variables de entorno `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` no están configuradas en Vercel.

**Solución:**
1. Ir a Vercel Dashboard → Proyecto → Settings → Environment Variables
2. Agregar:
   - `NEXT_PUBLIC_SUPABASE_URL` = URL de tu proyecto Supabase
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = Anon key de Supabase
3. Seleccionar **Production**, **Preview**, y **Development**
4. Hacer redeploy después de agregar las variables

**Nota:** El código en `lib/supabase/server.ts` ya maneja la ausencia de variables de forma segura durante el build, pero en runtime (producción) estas variables son necesarias para que las APIs funcionen.

### Errores de Compilación Corregidos

**Errores encontrados:**
1. `react/no-unescaped-entities`: Comillas sin escapar en JSX
2. `react-hooks/exhaustive-deps`: Funciones no envueltas en useCallback

**Soluciones aplicadas:**
1. **Comillas en JSX:** Usar `&quot;` en lugar de `"` dentro de strings
2. **cleanDestination:** Envolver en `useCallback` con dependencias vacías `[]`
3. **loadCustomers:** Envolver en `useCallback` con dependencia `[toast]`
4. **useEffect:** Agregar todas las funciones a las dependencias

**Código final:**
```typescript
// ✅ Todas las funciones en useCallback
const cleanDestination = useCallback((destination: string): string => {
  // ... lógica
}, [])

const loadCustomers = useCallback(async () => {
  // ... lógica
}, [toast])

const handleLeadPreload = useCallback(async () => {
  // ... usa cleanDestination
}, [lead, form, cleanDestination])

// ✅ useEffect con todas las dependencias
useEffect(() => {
  if (open) {
    loadSettings()
    loadCustomers()
    if (lead) {
      handleLeadPreload()
    }
  }
}, [open, lead, handleLeadPreload, loadCustomers])

// ✅ Comillas escapadas en JSX
<div>No se encontraron clientes que coincidan con &quot;{query}&quot;</div>
```

### Beneficios
- ✅ Mejor UX: búsqueda rápida de clientes
- ✅ Mejor rendimiento: no carga todos los clientes a la vez
- ✅ Interfaz más limpia y profesional

---

## 4. Branding y Temas

### Cambios Realizados

#### 4.1. Login Page
- Reemplazado fondo con imagen por gradientes animados y grid pattern
- Actualizado texto: "El sistema de gestión definitivo para **AGENCIAS** de viajes"
- Logo centrado sin texto
- Tipografía Inter para consistencia con landing

#### 4.2. Sistema de Temas
- Integrado `next-themes` para switch claro/oscuro funcional
- Eliminados hardcoded dark mode
- Variables CSS para colores consistentes
- Mejor contraste en modo oscuro

#### 4.3. Kanban de Leads
- Colores de columnas cambiados a escala de azules (branding)
- Eliminado badge "En vivo"
- Eliminado botón "Actualizar Leads"

### Archivos Modificados
- `app/(auth)/login/page.tsx`
- `app/layout.tsx`
- `app/globals.css`
- `components/sales/leads-kanban.tsx`
- `components/sales/leads-page-client.tsx`

---

## 5. Limpieza de Código

### Eliminaciones

#### 5.1. Integraciones Removidas
- **Trello**: Eliminada toda la integración
  - `app/api/settings/trello/route.ts`
  - `lib/trello/sync.ts`
  - `lib/trello/constants.ts`
  - `components/sales/leads-kanban-trello.tsx`
  - `components/settings/trello-settings.tsx`

- **ManyChat**: Eliminada toda la integración
  - `app/api/manychat/*`
  - `lib/manychat/sync.ts`
  - `components/sales/leads-kanban-manychat.tsx`

#### 5.2. Funcionalidad Realtime
- Eliminado Supabase Realtime de leads
- Eliminado badge "En vivo"
- Simplificada carga de leads

### Beneficios
- ✅ Código más simple y mantenible
- ✅ Mejor rendimiento (sin sincronizaciones innecesarias)
- ✅ Menos dependencias externas

---

## 📝 Resumen de Archivos Modificados

### Componentes UI
- `components/ui/dropdown-menu.tsx` - Fondos opacos
- `components/ui/select.tsx` - Fondos opacos
- `components/ui/dialog.tsx` - Overlay más opaco

### Componentes de Operaciones
- `components/operations/new-operation-dialog.tsx` - Unificación, precarga de leads, selector de clientes mejorado
- `components/sales/convert-lead-dialog.tsx` - Simplificado (ahora usa NewOperationDialog)

### Componentes de Leads
- `components/sales/leads-page-client.tsx` - Eliminado Realtime, agregado handleRefresh
- `components/sales/leads-kanban.tsx` - Colores branding, eliminado onRefresh

### Otros
- `app/(auth)/login/page.tsx` - Branding nuevo
- `app/layout.tsx` - Theme provider
- `app/globals.css` - Variables de tema

---

## 🔄 Pasos para Replicar en Maxeva

### 1. Unificación de Diálogos
1. Modificar `NewOperationDialog` para aceptar prop `lead` opcional
2. Agregar función `handleLeadPreload` con lógica de precarga
3. Simplificar `ConvertLeadDialog` para usar `NewOperationDialog`
4. Probar precarga de datos desde lead

### 2. Fondos Opacos
**IMPORTANTE:** Aplicar a TODOS los componentes desplegables:

1. `dropdown-menu.tsx`: `DropdownMenuContent` y `DropdownMenuSubContent`
2. `select.tsx`: `SelectContent`
3. `popover.tsx`: `PopoverContent` ⚠️ **CRÍTICO para selector de clientes**
4. `command.tsx`: `Command` ⚠️ **CRÍTICO para selector de clientes**
5. `dialog.tsx`: `DialogOverlay`
6. `menubar.tsx`: `MenubarContent` y `MenubarSubContent`
7. `context-menu.tsx`: `ContextMenuContent` y `ContextMenuSubContent`
8. `hover-card.tsx`: `HoverCardContent`
9. `navigation-menu.tsx`: `NavigationMenuViewport`
10. `tooltip.tsx`: `TooltipContent`

**Patrón a aplicar:**
```typescript
// Buscar todas las instancias de:
"bg-popover"

// Reemplazar por:
"bg-popover/95 backdrop-blur-sm"
```

### 3. Selector de Clientes
1. Reemplazar `Select` por `Popover` + `Command`
2. Agregar estados para búsqueda (`customerSearchOpen`, `customerSearchQuery`)
3. Implementar filtrado manual (usar `shouldFilter={false}` en `Command`)
4. Límite de 5 resultados visibles con scroll
5. Agregar indicador de más resultados
6. **CRÍTICO:** Usar `value={`${customer.first_name} ${customer.last_name}`}` en `CommandItem` (no `customer.id`) para que el filtrado funcione
7. **CRÍTICO:** Ajustar ancho del `PopoverContent` con `w-[var(--radix-popover-trigger-width)]`
8. Agregar `max-h-[200px]` al `CommandList` para control de scroll

### 4. Testing
- Probar creación de operación normal
- Probar conversión de lead a operación
- Verificar precarga de datos
- Verificar búsqueda de clientes
- Verificar fondos opacos en todos los modos

---

## 📌 Notas Importantes

1. **Orden de Declaraciones**: `handleLeadPreload` debe estar después de la declaración de `form` para evitar errores de "variable used before declaration"

2. **Dependencias de useCallback**: Incluir todas las dependencias necesarias (`lead`, `form`, `cleanDestination`)

3. **Límite de Clientes**: El límite de 5 es visual, la búsqueda filtra de toda la lista cargada

4. **Compatibilidad**: Todos los cambios son retrocompatibles, no rompen funcionalidad existente

---

## 🎯 Resultados

- ✅ **-1000+ líneas** de código duplicado
- ✅ **Mejor UX** con búsqueda y precarga automática
- ✅ **Mejor legibilidad** con fondos opacos
- ✅ **Código más mantenible** y simple
- ✅ **Branding consistente** en todo el sistema

---

## 6. Solución de Problemas Comunes

### 6.1. Error: "Missing required Supabase environment variables"

**Síntoma:**
- Errores 500 en los logs de Vercel
- APIs no responden correctamente
- Los clientes no se cargan en el selector

**Causa:**
Las variables de entorno de Supabase no están configuradas en Vercel.

**Solución:**
1. Ir a [Vercel Dashboard](https://vercel.com/dashboard)
2. Seleccionar el proyecto `vibook-services`
3. Ir a **Settings** → **Environment Variables**
4. Agregar las siguientes variables:
   - **Name:** `NEXT_PUBLIC_SUPABASE_URL`
     **Value:** `https://[tu-proyecto].supabase.co`
   - **Name:** `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     **Value:** `[tu-anon-key]` (obtener de Supabase Dashboard → Settings → API)
5. Seleccionar **Production**, **Preview**, y **Development**
6. Guardar
7. Hacer **Redeploy** del proyecto

**Verificación:**
- Los logs de Vercel no deberían mostrar errores de variables faltantes
- Las APIs deberían responder correctamente
- Los clientes deberían cargarse en el selector

### 6.2. Clientes no se cargan en el selector

**Síntoma:**
- El selector muestra "Cargando..." indefinidamente
- No aparecen clientes en la lista

**Posibles causas y soluciones:**

1. **Variables de entorno faltantes** (ver 6.1)
2. **Error en la API:** Revisar logs de Vercel para ver errores específicos
3. **Permisos:** Verificar que el usuario tenga permisos para ver clientes
4. **Agencias:** Verificar que el usuario tenga agencias asignadas

**Debugging:**
- Abrir DevTools → Console
- Buscar logs que empiecen con `[NewOperationDialog]` o `[Customers API]`
- Verificar respuesta de `/api/customers` en Network tab

**Código de debugging agregado:**
```typescript
console.log(`[NewOperationDialog] Loaded ${customersList.length} customers`)
```

### 6.3. Fondos transparentes en desplegables

**Síntoma:**
- Los menús desplegables tienen fondos muy transparentes
- Difícil leer el contenido

**Solución:**
Aplicar `bg-popover/95 backdrop-blur-sm` a todos los componentes desplegables (ver sección 2).

---

*Última actualización: Diciembre 2024*
