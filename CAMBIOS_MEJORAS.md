# Documentación de Mejoras y Cambios - Vibook Services

Este documento registra todas las mejoras, nuevas funcionalidades, correcciones y cambios realizados en la aplicación. Está diseñado para ser actualizado continuamente a medida que se implementan nuevas características o se solucionan problemas.

**Última actualización:** 2025-01-21 (Migración completa de mejoras ERP LOZADA)

---

## Índice

1. [Mejoras Implementadas](#mejoras-implementadas)
2. [Nuevas Funcionalidades](#nuevas-funcionalidades)
3. [Correcciones de Errores](#correcciones-de-errores)
4. [Cambios Técnicos](#cambios-técnicos)
5. [Migraciones de Base de Datos](#migraciones-de-base-de-datos)
6. [Pendientes / Roadmap](#pendientes--roadmap)

---

## Mejoras Implementadas

### 1. Búsqueda Global (Command Menu / Lupa)

**Fecha:** 2025-01-21 (Implementado)

**Estado:** ✅ IMPLEMENTADO

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
- **Badges de tipo** en cada resultado (Cliente, Operación, Operador, Lead)
- **Redirección automática** de `/sales?lead=` a `/sales/leads?leadId=`

**Mejoras implementadas (2025-01-21):**
- Agregados badges visuales que indican el tipo de cada resultado
- Corrección de ruta para leads: ahora navega a `/sales/leads?leadId=` en lugar de `/sales?lead=`
- El dialog de lead se abre automáticamente cuando se navega con `leadId` en query params
- Limpieza automática de query params después de abrir el dialog

**Archivos modificados:**
- `components/command-menu.tsx` - Componente principal de búsqueda (agregados badges de tipo)
- `components/site-header.tsx` - Agregado botón de búsqueda
- `app/api/search/route.ts` - Endpoint de búsqueda
- `components/ui/command.tsx` - Componente base (deshabilitado filtrado interno)
- `components/sales/leads-page-client.tsx` - Manejo de `leadId` en query params
- `components/sales/leads-kanban.tsx` - Apertura automática de dialog con `initialLeadId`

**Detalles técnicos:**
- Uso de `cmdk` para el Command Palette
- Búsqueda con debounce para optimizar rendimiento
- Filtrado deshabilitado en `cmdk` (`shouldFilter={false}`) para permitir búsqueda personalizada
- Reset de estado cuando el dialog se cierra para mantener estado limpio
- Badges de tipo con colores distintivos para mejor UX
- `useSearchParams` y `useRouter` para manejo de query params en client components

---

### 2. Códigos de Reserva en Operaciones

**Fecha:** 2025-01-21 (Implementado)

**Estado:** ✅ IMPLEMENTADO

**Descripción:**
Se agregaron dos campos opcionales a las operaciones para registrar códigos de reserva:
- Código de Reserva Aéreo (`reservation_code_air`)
- Código de Reserva Hotel (`reservation_code_hotel`)

**Funcionalidades implementadas:**
- ✅ Campos disponibles en formularios de creación y edición de operaciones
- ✅ Visualización en tabla de operaciones con iconos (✈️ y 🏨)
- ✅ Búsqueda por códigos de reserva en búsqueda global
- ✅ Campos opcionales (no requeridos)

**Archivos modificados:**
- `components/operations/new-operation-dialog.tsx` - Formulario de creación
- `components/operations/edit-operation-dialog.tsx` - Formulario de edición
- `components/operations/operations-table.tsx` - Tabla de operaciones (columna "Reservas")
- `app/api/operations/route.ts` - API de creación
- `app/api/search/route.ts` - Búsqueda por códigos con iconos en resultados

**Migración de base de datos:**
- `supabase/migrations/016_add_reservation_codes_to_operations.sql`

```sql
ALTER TABLE operations
ADD COLUMN IF NOT EXISTS reservation_code_air TEXT,
ADD COLUMN IF NOT EXISTS reservation_code_hotel TEXT;

CREATE INDEX IF NOT EXISTS idx_operations_reservation_code_air 
  ON operations(reservation_code_air) WHERE reservation_code_air IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_operations_reservation_code_hotel 
  ON operations(reservation_code_hotel) WHERE reservation_code_hotel IS NOT NULL;
```

**Nota:** Debes ejecutar la migración SQL en Supabase para agregar las columnas a la base de datos.

---

### 3. Número de Trámite en Clientes

**Fecha:** 2025-01-21 (Implementado)

**Estado:** ✅ IMPLEMENTADO

**Descripción:**
Agregar el campo "Número de Trámite" (`procedure_number`) a los clientes, permitiendo registrar el número de trámite del documento de identidad (DNI o Pasaporte).

**Funcionalidades a implementar:**
- Extracción automática mediante OCR
- Campo disponible en formulario de creación/edición
- Reordenamiento de campos en formulario (Número de Trámite después de Número de Documento)

**Archivos a modificar:**
- `components/customers/new-customer-dialog.tsx` - Formulario con campo procedure_number
- `app/api/documents/ocr-only/route.ts` - Extracción de procedure_number en OCR
- `app/api/customers/route.ts` - API de creación
- `app/api/customers/[id]/route.ts` - API de actualización

**Migración de base de datos necesaria:**
```sql
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS procedure_number TEXT;

COMMENT ON COLUMN customers.procedure_number IS 
  'Número de trámite del documento de identidad (DNI o Pasaporte)';
```

---

### 4. Soporte para PDF en OCR

**Estado:** ⬜ PENDIENTE DE VERIFICAR

**Descripción:**
Extender la funcionalidad OCR para soportar archivos PDF además de imágenes.

**Funcionalidades:**
- Subida de archivos PDF (máximo 15MB)
- Extracción de imágenes desde PDF usando `pdf-lib`
- Fallback para búsqueda directa de imágenes en bytes del PDF
- Extracción de datos de documentos (DNI, Pasaporte) desde PDF

**Archivos a verificar/modificar:**
- `app/api/documents/ocr-only/route.ts` - Procesamiento de PDF
- `components/customers/new-customer-dialog.tsx` - Input acepta PDF
- `package.json` - Dependencia `pdf-lib` agregada

---

### 5. Sistema de Pagos con Tipo de Cambio Obligatorio

**Fecha:** 2025-01-21 (Implementado)

**Estado:** ✅ IMPLEMENTADO

**Descripción:**
Se mejoró el sistema de pagos para garantizar que todos los cálculos se realicen correctamente en USD, incluyendo conversión obligatoria de ARS a USD mediante tipo de cambio.

**Funcionalidades implementadas:**
- ✅ Campo `exchange_rate` obligatorio para pagos en ARS
- ✅ Cálculo automático de `amount_usd` para todos los pagos
- ✅ Visualización de equivalente USD en tiempo real en el formulario
- ✅ Validación que exige tipo de cambio para pagos en ARS (frontend + backend)
- ✅ Visualización de equivalente USD en tabla de pagos

**Archivos modificados:**
- `components/operations/operation-payments-section.tsx` - Campo exchange_rate, cálculo en tiempo real
- `app/api/payments/route.ts` - Validación y guardado de exchange_rate y amount_usd

**Migración de base de datos:**
- `supabase/migrations/017_add_exchange_rate_to_payments.sql`

```sql
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC(18,4);

ALTER TABLE payments
ADD COLUMN IF NOT EXISTS amount_usd NUMERIC(18,2);

COMMENT ON COLUMN payments.exchange_rate IS 'Tipo de cambio ARS/USD usado al momento del pago';
COMMENT ON COLUMN payments.amount_usd IS 'Monto equivalente en USD';

CREATE INDEX IF NOT EXISTS idx_payments_amount_usd ON payments(amount_usd) WHERE amount_usd IS NOT NULL;
```

**Nota:** Debes ejecutar la migración SQL en Supabase para agregar las columnas a la base de datos.

---

### 6. Mejora de Interfaz del Sidebar

**Fecha:** 2025-01-21 (Implementado)

**Estado:** ✅ IMPLEMENTADO

**Descripción:**
Se mejoró la legibilidad del sidebar aumentando el ancho y reduciendo el espaciado de los submenús para que los textos largos quepan mejor en una sola línea.

**Cambios realizados:**
- Ancho del sidebar aumentado de 16rem (256px) a 18rem (288px)
- Espaciado reducido en submenús (margin y padding reducidos)
- Mejor visualización de textos largos como "Cuentas Financieras" y "Pagos a Operadores"

**Archivos modificados:**
- `components/ui/sidebar.tsx` - Ancho aumentado, espaciado reducido

**Detalles técnicos:**
- `SIDEBAR_WIDTH`: `16rem` → `18rem`
- `SidebarMenuSub`: `mx-3.5` → `mx-1`, `px-2.5` → `px-1.5`
- `SidebarMenuSubButton`: `px-3` → `px-2`

---

### 7. Eliminación de Funcionalidad de Segmentos

**Estado:** ⬜ PENDIENTE DE EVALUAR

**Descripción:**
Evaluar si la funcionalidad de "Segmentos" de clientes se está utilizando. Si no, eliminarla completamente.

**Archivos a eliminar (si procede):**
- `app/(dashboard)/customers/segments/page.tsx`
- `components/customers/customer-segments-page-client.tsx`
- `app/api/customers/segments/route.ts`
- `app/api/customers/segments/[id]/route.ts`
- `app/api/customers/segments/[id]/members/route.ts`

**Archivos a modificar:**
- `components/app-sidebar.tsx` - Remover ruta "Segmentos"

---

### 8. Renombrado "Pagos Recurrentes" → "Gastos Recurrentes" y Sistema de Categorías

**Fecha:** 2025-01-21 (Parcialmente Implementado)

**Estado:** ✅ PARCIALMENTE IMPLEMENTADO (Categorías implementadas, falta renombrado UI)

**Descripción:**
Renombrar la funcionalidad "Pagos Recurrentes" a "Gastos Recurrentes" e implementar un sistema de categorías para clasificar los gastos recurrentes.

**Funcionalidades a implementar:**
- Renombrado en sidebar, títulos de página y mensajes
- Sistema de categorías predefinidas:
  - Servicios (luz, agua, gas, internet, telefonía)
  - Alquiler (oficina o espacio físico)
  - Marketing (publicidad, redes sociales, promociones)
  - Salarios (salarios y honorarios de empleados)
  - Impuestos (impuestos y contribuciones)
  - Otros (gastos varios)
- Cada categoría tiene un color asignado para gráficos
- API para gestionar categorías
- Selector de categoría en dialogs de nuevo/editar
- Filtros de fecha (mes/año)
- Gráficos de análisis por categoría (barras, líneas, torta)

**Migraciones necesarias:**
```sql
-- Tabla de categorías
CREATE TABLE IF NOT EXISTS recurring_payment_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insertar categorías predefinidas
INSERT INTO recurring_payment_categories (name, description, color) VALUES
  ('Servicios', 'Servicios básicos (luz, agua, gas, internet, telefonía)', '#3b82f6'),
  ('Alquiler', 'Alquiler de oficina o espacio físico', '#ef4444'),
  ('Marketing', 'Publicidad, redes sociales, promociones', '#10b981'),
  ('Salarios', 'Salarios y honorarios de empleados', '#f59e0b'),
  ('Impuestos', 'Impuestos y contribuciones', '#8b5cf6'),
  ('Otros', 'Gastos varios que no encajan en otras categorías', '#6b7280')
ON CONFLICT (name) DO NOTHING;

-- Relación con gastos recurrentes
ALTER TABLE recurring_payments
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES recurring_payment_categories(id) ON DELETE SET NULL;
```

---

### 9. Sistema de Pago Masivo a Operadores

**Fecha:** 2025-01-21 (Implementado)

**Estado:** ✅ IMPLEMENTADO

**Descripción:**
Sistema completo de pago masivo a operadores que permite registrar múltiples pagos en una sola transacción, con soporte para pagos parciales, conversión de moneda y desglose detallado por operación.

**Flujo de Uso (4 Pasos):**

#### Paso 1: Seleccionar Operador
- Selector dropdown con lista de todos los operadores disponibles
- Muestra confirmación visual cuando se selecciona un operador

#### Paso 2: Seleccionar Moneda
- Opciones: USD o ARS
- El sistema filtrará las deudas por la moneda seleccionada

#### Paso 3: Seleccionar Deudas a Pagar
- Tabla de deudas pendientes con:
  - Operación (código y destino)
  - Monto Total / Monto Pagado / Monto Pendiente
  - Fecha de Vencimiento
  - Monto a Pagar (editable)
- Selección múltiple con checkboxes
- Montos editables para pagos parciales
- Badges visuales: "Parcial", "Vencido"

#### Paso 4: Información del Pago
- Cuenta Financiera de Origen
- Moneda del Pago
- Tipo de Cambio (si las monedas difieren)
- Número de Comprobante
- Fecha de Pago
- Notas (opcional)
- Resumen del pago con desglose por operación

**Archivos a crear:**
- `components/accounting/bulk-payment-dialog.tsx` - Dialog completo de pago masivo
- `app/api/accounting/operator-payments/bulk/route.ts` - API de pago masivo

**Migración necesaria:**
```sql
ALTER TABLE operator_payments
ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(18,2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN operator_payments.paid_amount IS 
  'Monto parcialmente pagado. Si paid_amount >= amount, el pago es PAID.';
```

---

### 10. Posición Contable Mensual - Balance General Profesional

**Estado:** ⬜ PENDIENTE DE IMPLEMENTAR/MEJORAR

**Descripción:**
Implementar una estructura contable profesional que incluye Balance General completo y Estado de Resultados del mes, completamente integrada con el resto del sistema.

**Estructura Contable:**
```
ACTIVO (Lo que la empresa TIENE)
├── Activo Corriente (< 1 año)
│   ├── Caja y Bancos (Efectivo USD, ARS, Bancos USD, ARS)
│   └── Cuentas por Cobrar (deuda de clientes)
└── Activo No Corriente (> 1 año)
    ├── Bienes de Uso (preparado para futuro)
    └── Inversiones LP (preparado para futuro)

PASIVO (Lo que la empresa DEBE)
├── Pasivo Corriente (< 1 año)
│   ├── Cuentas por Pagar (deuda a operadores)
│   └── Gastos a Pagar (recurrentes pendientes)
└── Pasivo No Corriente (> 1 año)
    └── Deudas LP (preparado para futuro)

PATRIMONIO NETO = ACTIVO - PASIVO
└── Resultado del Ejercicio

ESTADO DE RESULTADOS DEL MES
├── Ingresos (cobros de clientes)
├── (-) Costos (pagos a operadores)
├── = Margen Bruto (%)
├── (-) Gastos Operativos
└── = RESULTADO DEL MES
```

**Funcionalidades a implementar:**
1. **Tipos de Cambio Mensuales (Independientes por Mes)**
2. **Balance General Completo**
3. **Estado de Resultados del Mes**
4. **Verificación Contable** (Activo = Pasivo + PN)
5. **Conversión de Moneda (USD ↔ ARS)**
6. **Filtros y Navegación**

**Migración necesaria:**
```sql
CREATE TABLE IF NOT EXISTS monthly_exchange_rates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  usd_to_ars_rate NUMERIC(18,4) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(year, month)
);
```

---

### 11. Filtros Avanzados para Cuentas por Pagar a Proveedores

**Fecha:** 2025-01-21 (Implementado)

**Estado:** ✅ IMPLEMENTADO

**Descripción:**
Se implementaron filtros avanzados en la página de "Pagos a Operadores" para permitir búsquedas y filtrado más específico.

**Filtros Implementados:**
1. **Filtro por Operador:** Selector dropdown con lista de todos los operadores
2. **Filtro por Fecha de Vencimiento:** Selector de rango de fechas (desde/hasta)
3. **Filtro por Rango de Montos:** Campo monto mínimo y máximo
4. **Búsqueda de Operación:** Campo de texto para buscar por código o destino
5. **Filtro por Agencia:** Selector dropdown
6. **Filtro por Estado:** Todos, Pendientes, Vencidos, Pagados

**UI/UX:**
- Grid responsive con 4 columnas en pantallas grandes
- Botón "Limpiar filtros" que aparece cuando hay filtros activos
- Los filtros se aplican automáticamente en tiempo real

**Archivos modificados:**
- `components/accounting/operator-payments-page-client.tsx` - Filtros avanzados completos
- `app/api/accounting/operator-payments/route.ts` - Soporte para filtros de fecha
- `app/(dashboard)/accounting/operator-payments/page.tsx` - Carga de operadores

---

### 11.1. Exportación a Excel para Cuentas por Pagar a Proveedores

**Fecha:** 2025-01-21 (Implementado)

**Estado:** ✅ IMPLEMENTADO

**Descripción:**
Se implementó la funcionalidad de exportación a Excel para la página de "Pagos a Operadores".

**Funcionalidades:**
- Botón "Exportar Excel" en la página principal
- Genera archivo Excel con nombre: `cuentas-por-pagar-YYYY-MM-DD.xlsx`
- Dos hojas en el archivo:
  1. **"Resumen por Operador":** Operador, Total a Pagar, Moneda, Pagado, Pendiente, Cantidad Pagos, Vencidos
  2. **"Detalle Pagos":** Código Operación, Destino, Operador, Monto Total, Moneda, Monto Pagado, Pendiente, Fecha Vencimiento, Estado, Fecha Pago, Parcial

**Dependencia utilizada:**
- `xlsx` - Biblioteca para generación de archivos Excel

---

### 12. Eliminación de Operaciones

**Fecha:** 2025-01-21 (Implementado)

**Estado:** ✅ IMPLEMENTADO

**Descripción:**
Se implementó la funcionalidad completa para eliminar operaciones desde la tabla de operaciones, con confirmación y eliminación en cascada de todos los datos relacionados, excepto el cliente asociado.

**Funcionalidades:**
- Botón "Eliminar" en el dropdown de acciones de cada operación
- Solo visible para usuarios con rol `ADMIN` o `SUPER_ADMIN`
- Diálogo de confirmación que muestra claramente qué se eliminará:
  - ✅ Todos los pagos y cobranzas
  - ✅ Movimientos contables (libro mayor, caja)
  - ✅ Pagos a operadores pendientes
  - ✅ Alertas y documentos
  - ✅ Comisiones calculadas
  - ⚠️ **El cliente asociado NO se elimina**
- Eliminación en cascada de todos los datos relacionados
- Toast de confirmación al eliminar exitosamente
- Refresco automático de la tabla después de eliminar

**Archivos Modificados:**
- `components/operations/operations-table.tsx`
  - Agregado import de `Trash2` icon y `AlertDialog` components
  - Agregado estados para eliminación
  - Agregado `handleDeleteClick` y `handleDeleteConfirm`
  - Agregado `AlertDialog` con confirmación detallada

**UI/UX:**
- Botón "Eliminar" aparece en rojo en el dropdown
- Icono de basura (Trash2) para identificación visual
- Diálogo modal con título, descripción detallada y lista de items
- Botones: "Cancelar" (gris) y "Eliminar operación" (rojo)
- Estado de carga durante eliminación ("Eliminando...")

---

### 13. Limpieza de Configuración de Operaciones

**Estado:** ⬜ PENDIENTE DE EVALUAR

**Descripción:**
Evaluar si es necesario eliminar tabs de configuración innecesarios en "Configuración de Operaciones".

**Funcionalidades a evaluar:**
1. **Tab "Estados" (statuses):** ¿Se usa? Si no, eliminar
2. **Tab "Flujos de Trabajo":** ¿Se usa? Si no, eliminar
3. **Tab "Integraciones":** Forzar valores a `true` siempre activos
4. **Card duplicado de Alertas:** Eliminar duplicados

---

### 14. Eliminación de Configuración de Clientes

**Estado:** ⬜ PENDIENTE DE EVALUAR

**Descripción:**
Evaluar si la página de "Configuración de Clientes" se está utilizando. Si no, eliminarla completamente.

---

### 15. Reorganización del Sidebar y Eliminación de Notas

**Estado:** ⬜ PENDIENTE DE EVALUAR

**Descripción:**
Reorganizar la sección "Recursos" del sidebar y evaluar si la funcionalidad de "Notas" se utiliza.

---

### 16. Corrección de KPIs de Deudores y Deuda en Dashboard

**Fecha:** 2025-01-21 (Implementado)

**Estado:** ✅ IMPLEMENTADO

**Descripción:**
Corregir los textos y el cálculo de los KPIs de "Deudores por Ventas" y "Deuda a Operadores" en el dashboard principal.

**Problema Identificado:**
- Los cards mostraban "$0K" en ambos KPIs
- El endpoint calculaba desde las cuentas financieras, no desde las fuentes de datos reales

**Solución a implementar:**
1. **Corrección de Textos:**
   - "Pendientes Clientes" → "Deudores por Ventas"
   - "Pendientes Operadores" → "Deuda a Operadores"

2. **Reescritura del Endpoint `/api/analytics/pending-balances`:**
   - Deudores por Ventas: misma lógica que `/api/accounting/debts-sales`
   - Deuda a Operadores: misma lógica que `/api/accounting/operator-payments`

---

### 17. Tooltips Explicativos en Todo el Sistema

**Fecha:** 2025-01-21 (Implementado parcialmente)

**Estado:** ✅ PARCIALMENTE IMPLEMENTADO

**Descripción:**
Se agregaron tooltips explicativos con icono `HelpCircle` en las secciones principales del sistema.

**Secciones con tooltips implementados:**
- ✅ **Clientes** (`customers-page-client.tsx`)
- ✅ **Operaciones** (`operations-page-client.tsx`)
- ✅ **Leads/Ventas** (`leads-page-client.tsx`)
- ✅ **Pagos a Operadores** (`operator-payments-page-client.tsx`)

**Secciones pendientes:**
- ⬜ Reportes
- ⬜ Estadísticas de Clientes
- ⬜ Estadísticas de Operaciones
- ⬜ Estadísticas de Ventas
- ⬜ Operadores
- ⬜ Libro Mayor
- ⬜ Cuentas Financieras
- ⬜ Gastos Recurrentes

**Patrón de Tooltip:**
```tsx
<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <HelpCircle className="h-5 w-5 text-muted-foreground cursor-help" />
    </TooltipTrigger>
    <TooltipContent className="max-w-xs">
      <p className="font-medium mb-1">¿Cómo funciona?</p>
      <p className="text-xs">Explicación corta y clara de la funcionalidad</p>
    </TooltipContent>
  </Tooltip>
</TooltipProvider>
```

---

### 18. Mejora de Alineación de Filtros en Todo el Sistema

**Fecha:** 2025-01-21 (Implementado)

**Estado:** ✅ IMPLEMENTADO

**Descripción:**
Refactorizar todos los componentes de filtros en el sistema para lograr una alineación consistente, diseño compacto y uniformidad visual.

**Solución a implementar:**
1. Separar campos de fecha en columnas individuales del grid
2. Usar `items-end` en todos los grids para alinear por la parte inferior
3. Labels unificados con `text-xs` y `space-y-1.5`
4. Grids configurados para 1-2 líneas máximo

**Archivos a modificar:**
- `components/dashboard/dashboard-filters.tsx`
- `components/accounting/debts-sales-page-client.tsx`
- `components/accounting/operator-payments-page-client.tsx`
- `components/operations/operations-filters.tsx`
- `components/accounting/ledger-filters.tsx`
- `components/cash/cash-filters.tsx`
- `components/alerts/alerts-filters.tsx`
- `components/reports/reports-filters.tsx`

---

### 19. Reemplazo de Inputs type="date" por DatePicker

**Fecha:** 2025-01-21 (Parcialmente implementado)

**Estado:** ✅ PARCIALMENTE IMPLEMENTADO

**Descripción:**
Reemplazar todos los inputs nativos `type="date"` por el componente personalizado `DateInputWithCalendar` para consistencia visual y mejor UX.

---

### 20. Mejora de Deudores por Ventas (Vendedor y Cobranza)

**Fecha:** 2025-01-21 (Implementado)

**Estado:** ✅ IMPLEMENTADO

**Descripción:**
Sección completa de "Deudores por Ventas" con filtro de vendedor, búsqueda, exportación Excel y vista expandible con detalle de operaciones.

**Funcionalidades a implementar:**
1. **Filtro de Vendedor:** Selector dropdown para filtrar por vendedor
2. **Columna Vendedor en Tabla:** Mostrar vendedor en tabla expandida
3. **Exportación a Excel con Vendedor**
4. **Corrección de Bug: Cuenta Receptiva en Transferencias**

---

### 21. Corrección de Conversión de Moneda en Pago a Operadores

**Fecha:** 2025-01-21 (Implementado)

**Estado:** ✅ IMPLEMENTADO (incluido en bulk-payment-dialog)

**Descripción:**
Corregir la funcionalidad de conversión de moneda en el dialog de "Cargar Pago Masivo" para detectar automáticamente cuando la cuenta seleccionada tiene una moneda diferente a la de las deudas.

**Implementación:** El bulk-payment-dialog ya incluye:
- Selección de moneda de deuda (USD/ARS)
- Selección de moneda de pago
- Campo de tipo de cambio obligatorio cuando difieren las monedas
- Cálculo automático de equivalencias

---

### 22. División de Caja en 3 Secciones (Resumen, Caja USD, Caja ARS)

**Fecha:** 2025-01-21 (Implementado)

**Estado:** ✅ IMPLEMENTADO

**Descripción:**
Reestructurar la página de Caja para dividirla en 3 secciones usando tabs:
1. **Resumen:** Todas las cuentas con saldos
2. **Caja USD:** Cuentas individuales USD con movimientos
3. **Caja ARS:** Cuentas individuales ARS con movimientos

---

### 23. Sistema de Distribución de Ganancias a Socios

**Estado:** ⬜ PENDIENTE DE IMPLEMENTAR

**Descripción:**
Implementar un sistema completo para distribuir ganancias mensuales entre socios según porcentajes asignados y rastrear las deudas de socios que gastaron más de lo asignado.

**Funcionalidades:**
1. Campo de porcentaje en socios (`profit_percentage`)
2. Botón "Distribuir a Socios" en Posición Mensual
3. Dialog de distribución con vista previa
4. Tracking de deuda de socios

---

### 24. Conversión de Moneda USD a ARS en Facturación AFIP

**Estado:** ⬜ PENDIENTE DE IMPLEMENTAR (relacionado con integración AFIP)

**Descripción:**
Implementar funcionalidad para facturar en pesos argentinos operaciones que están en dólares, cumpliendo con normativa AFIP/ARCA.

---

### 25. Agregar Clientes con OCR a Operaciones

**Fecha:** 2025-01-21 (Implementado)

**Estado:** ✅ IMPLEMENTADO

**Descripción:**
Implementar funcionalidad para agregar clientes a operaciones usando el dialog de OCR existente, perfecto para viajes grupales.

**Funcionalidades:**
- Reemplazar tabla simple de clientes por `PassengersSection` completo
- Botón "Crear Cliente Nuevo (OCR)" en dialog de agregar pasajero
- El cliente creado se agrega automáticamente a la operación

---

### 26. Mejora de Gráficos de Gastos Recurrentes

**Fecha:** 2025-01-21 (Implementado)

**Estado:** ✅ IMPLEMENTADO

**Descripción:**
Mejorar los gráficos de Gastos Recurrentes usando UI moderna con diseño compacto.

**Funcionalidades:**
- Gráfico de barras: Gastos por categoría
- Gráfico de torta: Distribución por categoría
- Gráfico de líneas: Evolución por categoría
- Estadísticas adicionales: Gastos Activos, Vencen Esta Semana, Vencidos, En USD

---

### 27. Pagos Manuales en Deudores por Ventas y Pagos a Operadores

**Fecha:** 2025-01-21 (Implementado)

**Estado:** ✅ IMPLEMENTADO

**Descripción:**
Implementar funcionalidad para crear deudas manuales sin operación asociada.

**Funcionalidades:**
1. **Cuentas por Cobrar Manuales:** Botón "Nueva Cuenta por Cobrar" en Deudores por Ventas
2. **Deudas Manuales a Operadores:** Botón "Nueva Deuda Manual" en Pagos a Operadores

**Importante:** Estas funcionalidades crean DEUDAS/CUENTAS PENDIENTES (status: PENDING), no pagos ya realizados.

---

### 28. Ordenamiento de Cuentas por Saldo en Caja

**Fecha:** 2025-01-21 (Implementado)

**Estado:** ✅ IMPLEMENTADO

**Descripción:**
Implementar ordenamiento automático de cuentas financieras por saldo descendente en los tabs "Caja USD" y "Caja ARS".

---

### 29. Actualización de Cerebro - Esquema de Base de Datos

**Fecha:** 2025-01-21 (Implementado)

**Estado:** ✅ IMPLEMENTADO

**Descripción:**
Actualizar el esquema de base de datos en "Cerebro" (asistente AI) con todas las tablas, relaciones, campos y métricas del sistema.

**Cambios realizados:**
- Documentadas nuevas tablas: operation_customers, operator_payments, financial_accounts, ledger_movements, recurring_payments, recurring_payment_categories, alerts
- Campos nuevos: procedure_number, exchange_rate, amount_usd, paid_amount
- Queries de ejemplo actualizadas para deudores, gastos recurrentes, etc.

---

## Correcciones de Errores

### Error: Ruta de Leads desde Búsqueda Global (CORREGIDO)

**Estado:** ✅ CORREGIDO

**Problema:** Al buscar un lead y hacer click, navegaba a `/sales?lead=...` que no abría el lead.

**Solución:** 
- Cambiada ruta a `/sales/leads?leadId=${id}`
- Agregado manejo de `leadId` en query params
- El dialog de lead se abre automáticamente

---

### Error: SelectItem sin value (A VERIFICAR)

**Estado:** ⬜ PENDIENTE DE VERIFICAR

**Problema:**
React Select no permite `value=""` en `SelectItem`, causando error: "A <Select.Item /> must have a value prop that is not an empty string"

**Solución si aplica:**
- Cambiar `value=""` a `value="ALL"` o `value="none"`
- Actualizar lógica de filtrado para manejar estos valores

---

### Error: Pagos no impactaban en la caja (A VERIFICAR)

**Estado:** ⬜ PENDIENTE DE VERIFICAR

**Problema:**
- Los pagos se registraban en RESULTADO pero NO en CAJA
- El balance de efectivo no se actualizaba

**Solución si aplica:**
- Agregar creación de `ledger_movement` en cuenta de CAJA además del de RESULTADO

---

### Error: KPI de pagos sumaba incorrectamente monedas (A VERIFICAR)

**Estado:** ⬜ PENDIENTE DE VERIFICAR

**Problema:**
- El KPI sumaba `amount` directamente sin convertir ARS a USD
- Ejemplo: 150,000 ARS se sumaba como 150,000 USD (incorrecto)

**Solución si aplica:**
- KPI debe calcular totales EN USD usando `amount_usd`
- Si no hay `amount_usd`, calcular: USD = amount, ARS = amount / exchange_rate

---

## Cambios Técnicos

### Dependencias Utilizadas/Requeridas

- `xlsx` - Para generación de archivos Excel ✅ (ya está)
- `pdf-lib` - Para procesamiento de PDF en OCR (verificar si está)
- `cmdk` - Para Command Palette ✅ (ya está)

### Componentes UI Utilizados

- `DateInputWithCalendar` - Input de fecha con calendario ✅
- `AlertDialog` - Diálogos de confirmación ✅
- `Tooltip` - Tooltips informativos ✅
- `Badge` - Badges de estado ✅

---

## Migraciones de Base de Datos Pendientes

### Migración: Códigos de Reserva en Operaciones
```sql
ALTER TABLE operations
ADD COLUMN IF NOT EXISTS reservation_code_air TEXT,
ADD COLUMN IF NOT EXISTS reservation_code_hotel TEXT;

CREATE INDEX IF NOT EXISTS idx_operations_reservation_code_air 
  ON operations(reservation_code_air) WHERE reservation_code_air IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_operations_reservation_code_hotel 
  ON operations(reservation_code_hotel) WHERE reservation_code_hotel IS NOT NULL;
```

### Migración: Número de Trámite en Clientes
```sql
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS procedure_number TEXT;
```

### Migración: Tipo de Cambio y Monto USD en Pagos
```sql
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC(18,4);
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS amount_usd NUMERIC(18,2);
```

### Migración: Pagos Parciales en Operator Payments
```sql
ALTER TABLE operator_payments
ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(18,2) NOT NULL DEFAULT 0;
```

### Migración: Categorías de Gastos Recurrentes
```sql
CREATE TABLE IF NOT EXISTS recurring_payment_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE recurring_payments
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES recurring_payment_categories(id) ON DELETE SET NULL;
```

### Migración: Tipos de Cambio Mensuales
```sql
CREATE TABLE IF NOT EXISTS monthly_exchange_rates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  usd_to_ars_rate NUMERIC(18,4) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(year, month)
);
```

### Migración: Distribución de Ganancias a Socios
```sql
ALTER TABLE partner_accounts
ADD COLUMN IF NOT EXISTS profit_percentage NUMERIC(5,2) DEFAULT 0;

CREATE TABLE IF NOT EXISTS partner_profit_allocations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  partner_id UUID NOT NULL REFERENCES partner_accounts(id),
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  profit_amount NUMERIC(18,2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  exchange_rate NUMERIC(18,4),
  status VARCHAR(20) NOT NULL DEFAULT 'ALLOCATED',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(partner_id, year, month)
);
```

---

## Pendientes / Roadmap

### Prioridad Alta
- [ ] Sistema de Pagos con Tipo de Cambio Obligatorio
- [ ] Sistema de Pago Masivo a Operadores
- [ ] Posición Contable Mensual profesional
- [ ] División de Caja en 3 secciones

### Prioridad Media
- [ ] Códigos de Reserva en Operaciones
- [ ] Número de Trámite en Clientes
- [ ] Renombrado a "Gastos Recurrentes" con Categorías
- [ ] Mejora de Deudores por Ventas (Vendedor)
- [ ] Corrección de KPIs del Dashboard

### Prioridad Baja
- [ ] Tooltips en todas las secciones restantes
- [ ] Mejora de alineación de filtros
- [ ] Reemplazo de inputs date
- [ ] Mejora de gráficos de Gastos Recurrentes
- [ ] Pagos manuales sin operación
- [ ] Ordenamiento de cuentas por saldo

### Mejoras Completadas ✅
- [x] Búsqueda Global con badges de tipo
- [x] Corrección de ruta de leads
- [x] Filtros avanzados para Pagos a Operadores
- [x] Exportación a Excel de Pagos a Operadores
- [x] Eliminación de operaciones con confirmación
- [x] Mejora de interfaz del sidebar
- [x] Tooltips en secciones principales

---

## Notas para Desarrollo

### Convenciones de Commits
- Usar prefijos descriptivos: `feat:`, `fix:`, `docs:`, `refactor:`, etc.
- Incluir detalles en el cuerpo del commit cuando sea necesario

### Testing
- Probar búsqueda global en diferentes escenarios
- Verificar filtros con combinaciones múltiples
- Probar exportación Excel con datos filtrados
- Probar eliminación de operaciones con todos los datos relacionados

### Documentación
- Actualizar este documento cada vez que se implemente una mejora o se corrija un error
- Marcar items como ✅ IMPLEMENTADO cuando estén completos
- Mantener la estructura clara y organizada

---

*Última actualización: 2025-01-21*
*Mantenido por: Equipo de Desarrollo Vibook*