# 🧠 REPORTE DE TEST EXHAUSTIVO - CEREBRO

**Fecha:** 28 de Enero de 2026, 02:55 AM
**Versión:** 1.0
**Migración aplicada:** 047 (execute_readonly_query function) ✅

---

## 📊 RESUMEN EJECUTIVO

### Resultados Generales
- **Total de preguntas testeadas:** 20
- **Preguntas correctas:** 14 (70%)
- **Preguntas fallidas:** 6 (30%)
- **Tiempo promedio de respuesta:** ~3.5 segundos

### Estado General
✅ **CEREBRO ESTÁ FUNCIONAL** pero requiere mejoras en:
1. Esquema de base de datos (columnas incorrectas)
2. Manejo de relaciones complejas
3. Respuestas cuando no hay datos

---

## 📈 ANÁLISIS POR CATEGORÍA

### 🟢 Básicas: 3/3 (100%) - EXCELENTE
Todas las preguntas básicas funcionaron perfectamente:
- ✅ Contar operaciones totales
- ✅ Contar clientes
- ✅ Contar leads

**Observación:** Funcionan bien las queries de COUNT simple.

---

### 🟡 Ventas: 2/3 (67%) - BUENO
Funcionan bien las queries de agregación simples:
- ✅ Ventas del mes (COUNT + SUM)
- ✅ Total de ventas
- ❌ Operación con mayor margen (retorna 0 rows pero no es un error de query)

**Problema encontrado:** La query funciona correctamente, pero no hay datos en la base.

---

### 🟢 Pagos: 3/3 (100%) - EXCELENTE
Todas las queries de pagos funcionan:
- ✅ Pagos pendientes de clientes
- ✅ Deuda total de clientes (con retry automático)
- ✅ Pagos a operadores vencidos

**Observación destacada:** El sistema hizo un retry automático en la pregunta 8, mostrando que el mecanismo de fallback funciona correctamente.

---

### 🟢 Viajes: 3/3 (100%) - EXCELENTE
Queries de operaciones por fecha funcionan perfectamente:
- ✅ Viajes de esta semana
- ✅ Próximos viajes
- ✅ Operaciones por estado

---

### 🔴 Finanzas: 1/3 (33%) - REQUIERE ATENCIÓN
Esta categoría tiene problemas críticos:
- ❌ Balance de cuentas → ERROR: `column "current_balance" does not exist`
- ❌ Cuánto hay en caja → ERROR: `column "current_balance" does not exist`
- ✅ Gastos recurrentes activos

**Problema crítico:** El esquema en el prompt del sistema está desactualizado.

**Columnas reales de `financial_accounts`:**
- ✅ `initial_balance` (existe)
- ❌ `current_balance` (NO existe)

**Solución necesaria:** Actualizar el prompt para calcular balance como:
```sql
SELECT name, currency, initial_balance,
  (initial_balance + COALESCE(SUM(cm.amount), 0)) as balance_actual
FROM financial_accounts fa
LEFT JOIN cash_movements cm ON cm.financial_account_id = fa.id
WHERE fa.is_active = true
GROUP BY fa.id, fa.name, fa.currency, fa.initial_balance
```

---

### 🟡 Complejas: 2/5 (40%) - REQUIERE MEJORAS
Algunas queries complejas fallan:
- ❌ Resumen completo (parcial - falla en balance)
- ❌ Clientes que más deben → ERROR: `column o.customer_id does not exist`
- ❌ Destino más vendido (query correcta pero 0 rows)
- ✅ Leads en estado WON
- ✅ Alertas pendientes

**Problema principal:** Relaciones entre tablas `operations` y `customers` está mal en el prompt.

**Relación real:**
- `operations` NO tiene `customer_id` directo
- Existe tabla intermedia `operation_customers` con:
  - `operation_id`
  - `customer_id`
  - `role` ('MAIN', 'COMPANION')

---

## 🐛 PROBLEMAS DETECTADOS

### 1. Esquema de Base de Datos Desactualizado (CRÍTICO)

**Problema:** El esquema en `/app/api/ai/route.ts` (línea 7-122) tiene errores.

**Errores encontrados:**
```diff
# financial_accounts
- current_balance  ❌ NO EXISTE
+ initial_balance  ✅ CORRECTO

# operations
- customer_id      ❌ NO EXISTE (es relación many-to-many)
+ Ver operation_customers  ✅ CORRECTO

# leads
- travel_date      ❌ NO EXISTE
+ estimated_departure_date  ✅ CORRECTO
+ estimated_checkin_date    ✅ CORRECTO
```

---

### 2. Queries que Retornan 0 Rows vs Queries con Error

**Observación importante:** El sistema distingue correctamente entre:
- Query correcta sin resultados → Respuesta amigable ("No hay datos")
- Query con error SQL → Retry automático o respuesta genérica

**Ejemplo exitoso de retry (Pregunta 8):**
```
Intento 1: Error (aggregate function calls cannot be nested)
Intento 2: Query simplificada → ✅ Éxito
```

---

### 3. Base de Datos Sin Datos de Prueba

**Estado actual:**
- ✅ Leads: 5,320 registros (solo 6 en estado WON)
- ❌ Operations: 0 registros
- ❌ Customers: 0 registros
- ❌ Financial Accounts: 0 registros

**Recomendación:** Aplicar seed de datos de prueba para testing completo:
```bash
npm run db:seed:mock
```

---

## ✅ FUNCIONALIDADES QUE FUNCIONAN BIEN

### 1. Retry Automático ⭐
El sistema intenta múltiples queries si la primera falla:
- Máximo 3 intentos
- Simplifica queries automáticamente
- Respuesta amigable si todas fallan

### 2. Respuestas Contextuales 🎯
El sistema da respuestas adecuadas según el resultado:
- "No hay operaciones activas" (en lugar de "0")
- "Todo está al día" (para pagos pendientes)
- Usa emojis apropiados: ✈️ 🏨 💰 📊

### 3. Manejo de Errores Invisible 🛡️
Los errores SQL NO se muestran al usuario:
- Error técnico → "No pude obtener esa información"
- El usuario nunca ve stack traces o mensajes de PostgreSQL

### 4. Queries Simples ⚡
Funcionan perfectamente:
- COUNT
- SUM
- Filtros por fecha (CURRENT_DATE, date_trunc)
- Filtros por estado
- ORDER BY y LIMIT

---

## ❌ TIPOS DE QUERIES QUE FALLAN

### 1. Queries con Columnas Inexistentes
```sql
-- ❌ FALLA
SELECT current_balance FROM financial_accounts

-- ✅ DEBERÍA SER
SELECT initial_balance FROM financial_accounts
```

### 2. Queries con Relaciones Incorrectas
```sql
-- ❌ FALLA
SELECT * FROM operations o
JOIN customers c ON c.id = o.customer_id

-- ✅ DEBERÍA SER
SELECT * FROM operations o
JOIN operation_customers oc ON oc.operation_id = o.id
JOIN customers c ON c.id = oc.customer_id
WHERE oc.role = 'MAIN'
```

### 3. Queries con Columnas Inexistentes en Leads
```sql
-- ❌ FALLA
SELECT travel_date FROM leads

-- ✅ DEBERÍA SER
SELECT estimated_departure_date FROM leads
```

---

## 💡 RECOMENDACIONES DE MEJORA

### PRIORIDAD ALTA (Corregir inmediatamente)

#### 1. Actualizar Esquema en el Prompt ⚠️
**Archivo:** `/app/api/ai/route.ts` líneas 7-122

**Cambios necesarios:**
```typescript
// ANTES (línea 56-57)
### financial_accounts (Cuentas financieras)
- id, agency_id, name, type ('CASH_ARS','CASH_USD',...), currency ('ARS','USD'), current_balance, is_active, created_at

// DESPUÉS
### financial_accounts (Cuentas financieras)
- id, agency_id, name, type ('CASH_ARS','CASH_USD',...), currency ('ARS','USD'), initial_balance, is_active, created_at
- NOTA: Para obtener balance actual, sumar initial_balance + movimientos de cash_movements

### operation_customers (Relación operaciones-clientes) ⭐ NUEVA
- id, operation_id, customer_id, role ('MAIN','COMPANION')
- NOTA: operations NO tiene customer_id directo, usar esta tabla para JOIN
```

```typescript
// ANTES (línea 25-27)
### leads (Consultas)
- id, agency_id, source, status ('NEW','IN_PROGRESS','QUOTED','WON','LOST'), region, destination
- contact_name, contact_phone, contact_email, assigned_seller_id, travel_date, return_date, loss_reason, created_at

// DESPUÉS
### leads (Consultas)
- id, agency_id, source, status ('NEW','IN_PROGRESS','QUOTED','WON','LOST'), region, destination
- contact_name, contact_phone, contact_email, assigned_seller_id
- estimated_departure_date, estimated_checkin_date, follow_up_date, loss_reason, created_at
```

```typescript
// ANTES (línea 29-36)
### operations (Operaciones/Ventas) ⭐
- id, file_code, agency_id, seller_id, operator_id, customer_id
- type, origin, destination, departure_date, return_date, checkin_date, checkout_date

// DESPUÉS
### operations (Operaciones/Ventas) ⭐
- id, file_code, agency_id, seller_id, operator_id
- type, origin, destination, departure_date, return_date, checkin_date, checkout_date
- NOTA: Para obtener clientes, usar JOIN con operation_customers
```

#### 2. Agregar Ejemplos de Queries Correctas
**Agregar en el prompt después de línea 184:**

```typescript
// Balance de cuentas financieras (CORRECTO)
SELECT fa.name, fa.currency, fa.initial_balance,
  (fa.initial_balance + COALESCE(SUM(CASE WHEN cm.type = 'INCOME' THEN cm.amount ELSE -cm.amount END), 0)) as balance_actual
FROM financial_accounts fa
LEFT JOIN cash_movements cm ON cm.financial_account_id = fa.id
WHERE fa.is_active = true
GROUP BY fa.id, fa.name, fa.currency, fa.initial_balance
ORDER BY balance_actual DESC

// Clientes que más deben (CORRECTO con operation_customers)
SELECT c.first_name, c.last_name,
  SUM(o.sale_amount_total) as total_vendido,
  COALESCE(SUM(p.amount), 0) as pagado,
  SUM(o.sale_amount_total) - COALESCE(SUM(p.amount), 0) as deuda
FROM operations o
JOIN operation_customers oc ON oc.operation_id = o.id AND oc.role = 'MAIN'
JOIN customers c ON c.id = oc.customer_id
LEFT JOIN payments p ON p.operation_id = o.id AND p.direction = 'INCOME' AND p.status = 'PAID'
WHERE o.status NOT IN ('CANCELLED')
GROUP BY c.id, c.first_name, c.last_name
HAVING SUM(o.sale_amount_total) > COALESCE(SUM(p.amount), 0)
ORDER BY deuda DESC
LIMIT 10

// Destino más vendido (CORRECTO)
SELECT destination, COUNT(*) as cantidad, SUM(sale_amount_total) as total_vendido
FROM operations
WHERE status NOT IN ('CANCELLED')
GROUP BY destination
ORDER BY cantidad DESC
LIMIT 5
```

---

### PRIORIDAD MEDIA

#### 3. Mejorar Mensajes Cuando No Hay Datos
Actualmente responde bien, pero podría sugerir acciones:
- "No hay operaciones. ¿Querés que te ayude a crear una?"
- "No hay cuentas registradas. Podés crearlas en Configuración → Cuentas"

#### 4. Agregar Validación de Columnas
Antes de ejecutar query, validar que las columnas existan:
```typescript
// Pseudo-código
const columnExists = await validateColumns(query)
if (!columnExists) {
  return {
    success: false,
    suggestion: "La columna X no existe. ¿Quisiste decir Y?"
  }
}
```

---

### PRIORIDAD BAJA

#### 5. Cache de Queries Frecuentes
Cachear queries comunes por 1-5 minutos:
- Total operaciones
- Total clientes
- Balance general

#### 6. Logging Estructurado
Agregar logs de analytics:
- Queries más usadas
- Queries que fallan frecuentemente
- Tiempo de respuesta promedio

---

## 🧪 DATOS DE TESTING

### Estado Actual de la Base
```
Tabla               Registros
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
leads               5,320
operations          0
customers           0
financial_accounts  0
payments            0
alerts              0
```

### Ejecutar Seed de Prueba
Para testear con datos reales:
```bash
cd "/Users/tomiisanchezz/Desktop/Vibook Services/maxeva-saas"
npm run db:seed:mock
```

---

## 📋 CHECKLIST DE CORRECCIONES

### Para Desarrollador
- [ ] Actualizar esquema de `financial_accounts` en prompt (línea 56)
- [ ] Actualizar esquema de `operations` en prompt (línea 29)
- [ ] Actualizar esquema de `leads` en prompt (línea 25)
- [ ] Agregar tabla `operation_customers` al esquema
- [ ] Agregar ejemplos de queries con JOINs correctos
- [ ] Agregar ejemplo de balance de cuentas calculado
- [ ] Ejecutar seed de datos de prueba
- [ ] Re-ejecutar test exhaustivo
- [ ] Validar que todos los tests pasen al 90%+

### Para QA
- [ ] Probar todas las 20 preguntas manualmente en UI
- [ ] Verificar que respuestas sean amigables
- [ ] Validar que no se muestren errores técnicos
- [ ] Probar con distintos roles (ADMIN, SELLER, etc.)
- [ ] Validar permisos según rol

---

## 🎯 CONCLUSIÓN

### Estado Actual: ⚠️ FUNCIONAL CON LIMITACIONES

**Lo que funciona:**
- ✅ Migración 047 aplicada correctamente
- ✅ Función `execute_readonly_query` operativa
- ✅ 70% de queries funcionan correctamente
- ✅ Retry automático funciona bien
- ✅ Respuestas amigables al usuario
- ✅ Seguridad (solo SELECT permitido)

**Lo que necesita corrección:**
- ⚠️ Esquema desactualizado en el prompt (3 errores críticos)
- ⚠️ Falta documentación de relaciones many-to-many
- ⚠️ Base de datos sin datos de prueba

**Tiempo estimado de corrección:** 1-2 horas

**Impacto de correcciones:** Se espera aumentar éxito de 70% a 90%+

---

## 📞 CONTACTO

Para dudas sobre este reporte:
- **Archivo de test:** `test-cerebro-comprehensive.mjs`
- **Logs completos:** Ver salida de consola del test
- **Próximos pasos:** Aplicar correcciones en orden de prioridad

---

**Fin del Reporte**
