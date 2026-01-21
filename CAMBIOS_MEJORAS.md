# Documentación de Cambios y Mejoras - Vibook Services

Este documento registra todas las mejoras, nuevas funcionalidades, correcciones y cambios realizados en la aplicación. Está diseñado para ser actualizado continuamente a medida que se implementan nuevas características o se solucionan problemas.

**Última actualización:** 2025-01-21 (Múltiples mejoras de ERP LOZADA)

---

## 📋 Índice

1. [Mejoras Implementadas](#mejoras-implementadas)
2. [Nuevas Funcionalidades](#nuevas-funcionalidades)
3. [Correcciones de Errores](#correcciones-de-errores)
4. [Cambios Técnicos](#cambios-técnicos)
5. [Migraciones de Base de Datos](#migraciones-de-base-de-datos)
6. [Pendientes / Roadmap](#pendientes--roadmap)

---

## Mejoras Implementadas

### 1. Búsqueda Global (Command Menu / Lupa)

**Fecha:** 2025-01-21 (Mejorado)

**Descripción:**
Se implementó una funcionalidad de búsqueda global accesible desde cualquier página de la aplicación mediante:
- Botón de búsqueda (lupa) en el header
- Atajo de teclado: `⌘K` (Mac) o `Ctrl+K` (Windows/Linux)

**Funcionalidades:**
- Búsqueda en tiempo real con debounce de 300ms
- Búsqueda simultánea en:
  - Clientes (por nombre, email, teléfono)
  - Operaciones (por código, destino, códigos de reserva)
  - Operadores (por nombre, email)
  - Leads (por nombre, destino)
- Navegación rápida a resultados
- Navegación rápida a secciones principales
- Acciones rápidas (Nueva Operación, Nuevo Cliente, Nuevo Lead)
- **Badges de tipo** en cada resultado (Cliente, Operación, Operador, Lead) con colores distintivos
- **Redirección corregida** de leads a `/sales/leads?leadId=` para abrir el dialog automáticamente

**Archivos modificados:**
- `components/command-menu.tsx` - Agregados badges de tipo, corregida ruta de leads
- `components/site-header.tsx` - Botón de búsqueda
- `app/api/search/route.ts` - Endpoint de búsqueda
- `components/sales/leads-page-client.tsx` - Manejo de `leadId` en query params
- `components/sales/leads-kanban.tsx` - Apertura automática de dialog con `initialLeadId`

---

### 2. Unificación de Diálogos de Operación

**Fecha:** Anterior (documentado previamente)

**Descripción:**
Se unificaron los diálogos `NewOperationDialog` y `ConvertLeadDialog` en uno solo, eliminando más de 1000 líneas de código duplicado.

**Archivos:**
- `components/operations/new-operation-dialog.tsx` - Acepta prop opcional `lead`
- `components/sales/convert-lead-dialog.tsx` - Simplificado (usa NewOperationDialog)

---

### 3. Mejoras de UI - Fondos Opacos

**Fecha:** Anterior (documentado previamente)

**Descripción:**
Se aumentó la opacidad de todos los elementos desplegables a 95% y se agregó `backdrop-blur-sm` para mejor legibilidad.

**Componentes modificados:**
- `dropdown-menu.tsx`, `select.tsx`, `popover.tsx`, `command.tsx`, `dialog.tsx`
- `menubar.tsx`, `context-menu.tsx`, `hover-card.tsx`, `navigation-menu.tsx`, `tooltip.tsx`

---

### 4. Filtros Avanzados para Cuentas por Pagar a Operadores

**Fecha:** 2025-01-21

**Descripción:**
Se implementaron filtros avanzados en la página de "Pagos a Operadores" para búsquedas más específicas.

**Funcionalidades:**
- **Filtro por Operador:** Selector dropdown con lista de todos los operadores
- **Filtro por Fecha de Vencimiento:** Selector de rango de fechas (desde/hasta)
- **Filtro por Rango de Montos:** Campos para monto mínimo y máximo
- **Búsqueda de Operación:** Campo de texto para buscar por código o destino
- **Botón "Limpiar filtros"** cuando hay filtros activos
- **Exportación a Excel** con dos hojas:
  - Resumen por Operador (total, pagado, pendiente, cantidad, vencidos)
  - Detalle de Pagos (información completa de cada pago)

**Archivos modificados:**
- `components/accounting/operator-payments-page-client.tsx` - Filtros y exportación Excel
- `app/api/accounting/operator-payments/route.ts` - Soporte para filtros de fecha
- `app/(dashboard)/accounting/operator-payments/page.tsx` - Pasa lista de operadores

**Dependencias utilizadas:**
- `xlsx` - Para generación de archivos Excel

---

### 5. Mejora de Interfaz del Sidebar

**Fecha:** 2025-01-21

**Descripción:**
Se mejoró la legibilidad del sidebar aumentando el ancho y reduciendo el espaciado de los submenús.

**Cambios:**
- Ancho del sidebar aumentado de 16rem a 18rem
- Espaciado reducido en `SidebarMenuSub`: `mx-1`, `px-1.5` (antes `mx-3.5`, `px-2.5`)
- Padding reducido en `SidebarMenuSubButton`: `px-2` (antes `px-3`)

**Archivos modificados:**
- `components/ui/sidebar.tsx`

---

### 6. Tooltips Explicativos en Todo el Sistema

**Fecha:** 2025-01-21

**Descripción:**
Se agregaron tooltips explicativos con icono `HelpCircle` en las secciones principales del sistema para mejorar la comprensión del usuario.

**Secciones con tooltips:**
- ✅ **Clientes** - Explica gestión de clientes y uso de OCR
- ✅ **Operaciones** - Explica qué representa cada operación
- ✅ **Leads/Ventas** - Explica el flujo de leads y conversión
- ✅ **Pagos a Operadores** - Explica cómo gestionar cuentas por pagar

**Patrón implementado:**
```tsx
<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <HelpCircle className="h-5 w-5 text-muted-foreground cursor-help" />
    </TooltipTrigger>
    <TooltipContent className="max-w-xs">
      <p className="font-medium mb-1">¿Cómo funciona?</p>
      <p className="text-xs">Explicación...</p>
    </TooltipContent>
  </Tooltip>
</TooltipProvider>
```

**Archivos modificados:**
- `components/customers/customers-page-client.tsx`
- `components/operations/operations-page-client.tsx`
- `components/sales/leads-page-client.tsx`
- `components/accounting/operator-payments-page-client.tsx`

---

### 7. Eliminación de Operaciones

**Fecha:** 2025-01-21

**Descripción:**
Se implementó la funcionalidad completa para eliminar operaciones desde la tabla, con confirmación detallada y eliminación en cascada.

**Funcionalidades:**
- Botón "Eliminar" en el dropdown de acciones (solo para ADMIN/SUPER_ADMIN)
- Diálogo de confirmación que muestra claramente qué se eliminará:
  - ✅ Todos los pagos y cobranzas
  - ✅ Movimientos contables
  - ✅ Pagos a operadores pendientes
  - ✅ Alertas y documentos
  - ✅ Comisiones calculadas
  - ⚠️ El cliente NO se elimina
- Toast de confirmación/error
- Recarga automática de la tabla

**Archivos modificados:**
- `components/operations/operations-table.tsx` - Botón, diálogo y lógica de eliminación

---

### 8. Selector de Clientes Mejorado

**Fecha:** Anterior (documentado previamente)

**Descripción:**
Se reemplazó el Select simple por un Combobox con búsqueda integrada.

**Funcionalidades:**
- Campo de búsqueda en tiempo real
- Máximo 5 clientes visibles inicialmente con scroll
- Indicador cuando hay más resultados
- Botón + para crear nuevo cliente
- Manejo robusto de errores

---

## Nuevas Funcionalidades

### Exportación a Excel en Pagos a Operadores

**Fecha:** 2025-01-21

**Descripción:**
Botón "Exportar Excel" que genera un archivo con dos hojas:

1. **Resumen por Operador:**
   - Operador, Total a Pagar, Moneda, Pagado, Pendiente, Cantidad Pagos, Vencidos

2. **Detalle Pagos:**
   - Código, Destino, Operador, Monto Total, Moneda, Pagado, Pendiente, Fecha Vencimiento, Estado, Fecha Pago, Parcial

**Archivo generado:** `cuentas-por-pagar-YYYY-MM-DD.xlsx`

---

## Correcciones de Errores

### Ruta de Leads desde Búsqueda Global

**Problema:** Al buscar un lead y hacer click, la aplicación navegaba a `/sales?lead=...` que no abría el lead.

**Solución:** 
- Cambiada ruta a `/sales/leads?leadId=${id}`
- Agregado manejo de `leadId` en query params en `leads-page-client.tsx`
- Agregado prop `initialLeadId` a `LeadsKanban` para abrir dialog automáticamente
- Limpieza automática de query params después de abrir el dialog

---

## Cambios Técnicos

### Dependencias Utilizadas

- `xlsx` - Generación de archivos Excel
- `date-fns` - Formateo de fechas
- `sonner` - Notificaciones toast
- `lucide-react` - Iconos (HelpCircle, Trash2, Download, etc.)

### Componentes UI Creados/Modificados

- `DateInputWithCalendar` - Input de fecha con calendario
- `AlertDialog` - Diálogos de confirmación
- `Tooltip` - Tooltips informativos

---

## Pendientes / Roadmap

### Mejoras Pendientes (del documento ERP LOZADA)

- [ ] Sistema de Pagos con Tipo de Cambio Obligatorio
- [ ] Sistema de Pago Masivo a Operadores (bulk payment)
- [ ] Posición Contable Mensual profesional (Balance General)
- [ ] Filtros de fecha con presets (Hoy, Esta semana, Este mes)
- [ ] División de Caja en 3 secciones (Resumen, USD, ARS)
- [ ] Códigos de Reserva en Operaciones (aéreo y hotel)
- [ ] Número de Trámite en Clientes (para DNI/Pasaporte)
- [ ] Soporte para PDF en OCR

### Funcionalidades Futuras

- [ ] Facturación AFIP integrada (ver PLAN_INTEGRACION_AFIP_SDK.md)
- [ ] Distribución de Ganancias a Socios
- [ ] Conversor de Moneda en todas las secciones

---

## 📝 Notas para Desarrollo

### Convenciones

- Usar prefijos descriptivos en commits: `feat:`, `fix:`, `docs:`, `refactor:`
- Tooltips siempre con `max-w-xs` para limitar ancho
- Badges de tipo con colores distintivos por categoría
- Diálogos de confirmación para acciones destructivas

### Testing

- Probar búsqueda global con diferentes tipos de resultados
- Verificar que leads se abran correctamente desde búsqueda
- Probar filtros avanzados con combinaciones múltiples
- Verificar exportación Excel con datos filtrados
- Probar eliminación de operaciones con todos los datos relacionados

---

## Historial de Versiones

### v2025.01.21
- Búsqueda global con badges de tipo
- Filtros avanzados + exportación Excel para pagos a operadores
- Mejora de interfaz del sidebar
- Tooltips explicativos
- Eliminación de operaciones con confirmación

### v2024.12.XX (Anterior)
- Unificación de diálogos de operación
- Mejoras de UI (fondos opacos)
- Selector de clientes mejorado
- Branding y temas
- Limpieza de código (Trello/ManyChat)

---

*Mantenido por: Equipo de Desarrollo Vibook*
