# 🔧 CORRECCIONES PARA CEREBRO - GUÍA RÁPIDA

## 📍 ARCHIVO A MODIFICAR
`/app/api/ai/route.ts`

---

## ✏️ CORRECCIÓN 1: Actualizar financial_accounts (Líneas 56-58)

### ANTES:
```typescript
### financial_accounts (Cuentas financieras)
- id, agency_id, name, type ('CASH_ARS','CASH_USD','SAVINGS_ARS','SAVINGS_USD','BANK_ARS','BANK_USD','MERCADOPAGO','CREDIT_CARD')
- currency ('ARS','USD'), current_balance, is_active, created_at
```

### DESPUÉS:
```typescript
### financial_accounts (Cuentas financieras)
- id, agency_id, name, type ('CASH_ARS','CASH_USD','SAVINGS_ARS','SAVINGS_USD','BANK_ARS','BANK_USD','MERCADOPAGO','CREDIT_CARD')
- currency ('ARS','USD'), initial_balance, is_active, created_at
- NOTA: Para balance actual calcular: initial_balance + SUM(cash_movements)
```

---

## ✏️ CORRECCIÓN 2: Agregar operation_customers (Después de línea 40)

### AGREGAR:
```typescript
### operation_customers (Relación operaciones-clientes) ⭐
- id, operation_id, customer_id, role ('MAIN','COMPANION')
- NOTA CRÍTICA: operations NO tiene customer_id directo, SIEMPRE usar esta tabla para relacionar
```

---

## ✏️ CORRECCIÓN 3: Actualizar operations (Línea 29-36)

### ANTES:
```typescript
### operations (Operaciones/Ventas) ⭐
- id, file_code, agency_id, seller_id, operator_id, customer_id
- type, origin, destination, departure_date, return_date, checkin_date, checkout_date
```

### DESPUÉS:
```typescript
### operations (Operaciones/Ventas) ⭐
- id, file_code, agency_id, seller_id, seller_secondary_id, operator_id
- type, origin, destination, departure_date, return_date, checkin_date, checkout_date
- NOTA: NO hay customer_id directo, usar JOIN con operation_customers
```

---

## ✏️ CORRECCIÓN 4: Actualizar leads (Línea 25-28)

### ANTES:
```typescript
### leads (Consultas)
- id, agency_id, source, status ('NEW','IN_PROGRESS','QUOTED','WON','LOST'), region, destination
- contact_name, contact_phone, contact_email, assigned_seller_id, travel_date, return_date, loss_reason, created_at
```

### DESPUÉS:
```typescript
### leads (Consultas)
- id, agency_id, source, status ('NEW','IN_PROGRESS','QUOTED','WON','LOST'), region, destination
- contact_name, contact_phone, contact_email, assigned_seller_id
- estimated_departure_date, estimated_checkin_date, follow_up_date, loss_reason, created_at
- NOTA: NO hay travel_date ni return_date, usar estimated_departure_date y estimated_checkin_date
```

---

## ✏️ CORRECCIÓN 5: Actualizar ejemplos de queries (Línea 155-196)

### AGREGAR estos ejemplos DESPUÉS de línea 184:

```typescript
-- Balance de cuentas financieras (CON CÁLCULO CORRECTO)
SELECT fa.name, fa.currency, fa.initial_balance,
  (fa.initial_balance + COALESCE(SUM(CASE
    WHEN cm.type = 'INCOME' THEN cm.amount
    ELSE -cm.amount
  END), 0)) as balance_actual
FROM financial_accounts fa
LEFT JOIN cash_movements cm ON cm.financial_account_id = fa.id
WHERE fa.is_active = true
GROUP BY fa.id, fa.name, fa.currency, fa.initial_balance
ORDER BY balance_actual DESC

-- Clientes con deuda (CON RELACIÓN CORRECTA via operation_customers)
SELECT c.first_name, c.last_name, c.phone,
  SUM(o.sale_amount_total) as total_vendido,
  COALESCE(SUM(p.amount), 0) as pagado,
  (SUM(o.sale_amount_total) - COALESCE(SUM(p.amount), 0)) as deuda
FROM operations o
JOIN operation_customers oc ON oc.operation_id = o.id AND oc.role = 'MAIN'
JOIN customers c ON c.id = oc.customer_id
LEFT JOIN payments p ON p.operation_id = o.id
  AND p.direction = 'INCOME'
  AND p.status = 'PAID'
WHERE o.status NOT IN ('CANCELLED')
GROUP BY c.id, c.first_name, c.last_name, c.phone
HAVING SUM(o.sale_amount_total) > COALESCE(SUM(p.amount), 0)
ORDER BY deuda DESC
LIMIT 10

-- Destino más vendido (CON COUNT y SUM)
SELECT destination,
  COUNT(*) as cantidad_operaciones,
  SUM(sale_amount_total) as total_vendido,
  AVG(sale_amount_total) as ticket_promedio
FROM operations
WHERE status NOT IN ('CANCELLED')
GROUP BY destination
ORDER BY cantidad_operaciones DESC
LIMIT 5

-- Leads con fechas correctas
SELECT id, contact_name, destination,
  estimated_departure_date, estimated_checkin_date, status
FROM leads
WHERE status = 'WON'
ORDER BY estimated_departure_date DESC NULLS LAST
LIMIT 10
```

---

## ✏️ CORRECCIÓN 6: Actualizar nota sobre financial_accounts (Línea 159-163)

### ANTES:
```typescript
-- Balance de cuentas financieras
SELECT name, currency, current_balance
FROM financial_accounts
WHERE is_active = true
ORDER BY current_balance DESC
```

### DESPUÉS:
```typescript
-- Balance de cuentas financieras (SIN cálculo de movimientos)
SELECT name, currency, initial_balance
FROM financial_accounts
WHERE is_active = true
ORDER BY initial_balance DESC

-- Balance de cuentas financieras (CON cálculo de movimientos - MÁS PRECISO)
SELECT fa.name, fa.currency, fa.initial_balance,
  (fa.initial_balance + COALESCE(SUM(CASE
    WHEN cm.type = 'INCOME' THEN cm.amount
    ELSE -cm.amount
  END), 0)) as balance_actual
FROM financial_accounts fa
LEFT JOIN cash_movements cm ON cm.financial_account_id = fa.id
WHERE fa.is_active = true
GROUP BY fa.id, fa.name, fa.currency, fa.initial_balance
ORDER BY balance_actual DESC
```

---

## ✏️ CORRECCIÓN 7: Actualizar ejemplo de deudores (Línea 186-196)

### ANTES:
```typescript
-- Deudores por ventas (clientes que deben)
SELECT c.first_name, c.last_name, o.file_code, o.sale_amount_total,
  COALESCE(SUM(p.amount), 0) as pagado
FROM operations o
JOIN customers c ON c.id = o.customer_id
LEFT JOIN payments p ON p.operation_id = o.id AND p.direction = 'INCOME' AND p.status = 'PAID'
WHERE o.status NOT IN ('CANCELLED')
GROUP BY c.id, c.first_name, c.last_name, o.id, o.file_code, o.sale_amount_total
HAVING o.sale_amount_total > COALESCE(SUM(p.amount), 0)
LIMIT 20
```

### DESPUÉS:
```typescript
-- Deudores por ventas (clientes que deben) - CON RELACIÓN CORRECTA
SELECT c.first_name, c.last_name, o.file_code, o.sale_amount_total,
  COALESCE(SUM(p.amount), 0) as pagado,
  (o.sale_amount_total - COALESCE(SUM(p.amount), 0)) as deuda
FROM operations o
JOIN operation_customers oc ON oc.operation_id = o.id AND oc.role = 'MAIN'
JOIN customers c ON c.id = oc.customer_id
LEFT JOIN payments p ON p.operation_id = o.id
  AND p.direction = 'INCOME'
  AND p.status = 'PAID'
WHERE o.status NOT IN ('CANCELLED')
GROUP BY c.id, c.first_name, c.last_name, o.id, o.file_code, o.sale_amount_total
HAVING o.sale_amount_total > COALESCE(SUM(p.amount), 0)
ORDER BY deuda DESC
LIMIT 20
```

---

## ✏️ CORRECCIÓN 8: Actualizar NOTAS IMPORTANTES (Línea 112-122)

### AGREGAR estas notas:
```typescript
### NOTAS IMPORTANTES:
- Fechas: usar CURRENT_DATE, date_trunc('month', CURRENT_DATE), etc.
- En payments la fecha de vencimiento es "date_due" (NO "due_date")
- En operator_payments la fecha es "due_date" (NO "date_due")
- En leads usar estimated_departure_date (NO travel_date)
- En operations NO hay customer_id directo, usar JOIN con operation_customers
- En financial_accounts NO hay current_balance, calcular con initial_balance + cash_movements
- Para deudores: sale_amount_total - COALESCE(SUM(pagos donde direction='INCOME' AND status='PAID'), 0) = deuda cliente
- Para deuda operadores: operator_payments WHERE status IN ('PENDING','OVERDUE')
- Margen = sale_amount_total - operator_cost
- Tipos de cambio: preferir amount_usd si está disponible, sino usar exchange_rate
- Siempre filtrar por agency_id excepto para SUPER_ADMIN
- Las tablas tienen soft delete o is_active, no usar directamente IS NULL
- Para balance de cuentas usar: initial_balance + SUM(CASE WHEN type='INCOME' THEN amount ELSE -amount END)
```

---

## 🧪 TESTING DESPUÉS DE APLICAR CORRECCIONES

### 1. Ejecutar test exhaustivo
```bash
cd "/Users/tomiisanchezz/Desktop/Vibook Services/maxeva-saas"
node test-cerebro-comprehensive.mjs
```

### 2. Resultado esperado
- ✅ Básicas: 3/3 (100%)
- ✅ Ventas: 3/3 (100%)
- ✅ Pagos: 3/3 (100%)
- ✅ Viajes: 3/3 (100%)
- ✅ Finanzas: 3/3 (100%) ← DEBE MEJORAR
- ✅ Complejas: 4/5 (80%) ← DEBE MEJORAR

### 3. Objetivo
**90%+ de éxito** (18/20 preguntas)

---

## 📝 CHECKLIST DE APLICACIÓN

- [ ] Abrir `/app/api/ai/route.ts`
- [ ] Aplicar CORRECCIÓN 1 (financial_accounts)
- [ ] Aplicar CORRECCIÓN 2 (agregar operation_customers)
- [ ] Aplicar CORRECCIÓN 3 (actualizar operations)
- [ ] Aplicar CORRECCIÓN 4 (actualizar leads)
- [ ] Aplicar CORRECCIÓN 5 (agregar ejemplos)
- [ ] Aplicar CORRECCIÓN 6 (actualizar balance)
- [ ] Aplicar CORRECCIÓN 7 (actualizar deudores)
- [ ] Aplicar CORRECCIÓN 8 (actualizar notas)
- [ ] Guardar cambios
- [ ] Reiniciar servidor (Ctrl+C y npm run dev)
- [ ] Ejecutar test exhaustivo
- [ ] Verificar que pasa 90%+ de tests
- [ ] Probar manualmente en UI: http://localhost:3044/tools/cerebro

---

## ⚡ APLICACIÓN RÁPIDA (Copy-Paste)

Si querés aplicar todas las correcciones de una vez, podés usar este comando:

```bash
# Backup del archivo original
cp /Users/tomiisanchezz/Desktop/Vibook\ Services/maxeva-saas/app/api/ai/route.ts \
   /Users/tomiisanchezz/Desktop/Vibook\ Services/maxeva-saas/app/api/ai/route.ts.backup
```

Luego abrí el archivo y aplicá las correcciones manualmente una por una, verificando cada cambio.

---

## 🎯 IMPACTO ESPERADO

**ANTES:**
- 70% éxito (14/20)
- 6 queries fallan
- Problemas con finanzas y clientes

**DESPUÉS:**
- 90%+ éxito (18+/20)
- 0-2 queries fallan
- Finanzas y clientes funcionan

---

**Fin de la Guía de Correcciones**
