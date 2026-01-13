-- Migración para asegurar que todos los clientes, operaciones y leads tengan agency_id
-- Esto corrige datos existentes que pueden no tener agency_id asignado

-- =====================================================
-- 1. VERIFICAR Y CORREGIR CLIENTES SIN agency_id
-- =====================================================

-- Ver cuántos clientes no tienen agency_id
SELECT COUNT(*) as customers_sin_agency_id
FROM customers
WHERE agency_id IS NULL;

-- Si hay clientes sin agency_id, intentar asignarlos a través de operaciones
-- (solo si tienen operaciones asociadas)
UPDATE customers c
SET agency_id = (
  SELECT o.agency_id
  FROM operation_customers oc
  JOIN operations o ON oc.operation_id = o.id
  WHERE oc.customer_id = c.id
  LIMIT 1
)
WHERE c.agency_id IS NULL
AND EXISTS (
  SELECT 1
  FROM operation_customers oc
  JOIN operations o ON oc.operation_id = o.id
  WHERE oc.customer_id = c.id
);

-- Si aún hay clientes sin agency_id, asignarlos a la primera agencia del usuario que los creó
-- (si tenemos información del usuario)
UPDATE customers c
SET agency_id = (
  SELECT ua.agency_id
  FROM users u
  JOIN user_agencies ua ON u.id = ua.user_id
  WHERE u.email = 'admin@vibook.ai'  -- O el email del usuario que creó el cliente
  LIMIT 1
)
WHERE c.agency_id IS NULL
AND EXISTS (
  SELECT 1
  FROM users u
  JOIN user_agencies ua ON u.id = ua.user_id
  WHERE u.email = 'admin@vibook.ai'
);

-- Si aún hay clientes sin agency_id, eliminarlos o asignarlos a una agencia por defecto
-- NOTA: Esto es crítico - los clientes SIN agency_id no deberían existir en un SaaS
-- Si hay clientes sin agency_id después de los updates anteriores, hay que revisarlos manualmente

-- =====================================================
-- 2. VERIFICAR OPERACIONES SIN agency_id
-- =====================================================

-- Ver cuántas operaciones no tienen agency_id
SELECT COUNT(*) as operations_sin_agency_id
FROM operations
WHERE agency_id IS NULL;

-- Las operaciones DEBEN tener agency_id siempre
-- Si hay operaciones sin agency_id, intentar asignarlas a través del seller
UPDATE operations o
SET agency_id = (
  SELECT ua.agency_id
  FROM users u
  JOIN user_agencies ua ON u.id = ua.user_id
  WHERE u.id = o.seller_id
  LIMIT 1
)
WHERE o.agency_id IS NULL
AND o.seller_id IS NOT NULL
AND EXISTS (
  SELECT 1
  FROM users u
  JOIN user_agencies ua ON u.id = ua.user_id
  WHERE u.id = o.seller_id
);

-- =====================================================
-- 3. VERIFICAR LEADS SIN agency_id
-- =====================================================

-- Ver cuántos leads no tienen agency_id
SELECT COUNT(*) as leads_sin_agency_id
FROM leads
WHERE agency_id IS NULL;

-- Si hay leads sin agency_id, intentar asignarlos a través del seller asignado
UPDATE leads l
SET agency_id = (
  SELECT ua.agency_id
  FROM users u
  JOIN user_agencies ua ON u.id = ua.user_id
  WHERE u.id = l.assigned_seller_id
  LIMIT 1
)
WHERE l.agency_id IS NULL
AND l.assigned_seller_id IS NOT NULL
AND EXISTS (
  SELECT 1
  FROM users u
  JOIN user_agencies ua ON u.id = ua.user_id
  WHERE u.id = l.assigned_seller_id
);

-- =====================================================
-- 4. AGREGAR CONSTRAINT NOT NULL A agency_id
-- =====================================================

-- Primero asegurar que no haya NULLs
-- Luego agregar constraint NOT NULL

-- Para customers
ALTER TABLE customers
ALTER COLUMN agency_id SET NOT NULL;

-- Para operations
ALTER TABLE operations
ALTER COLUMN agency_id SET NOT NULL;

-- Para leads
ALTER TABLE leads
ALTER COLUMN agency_id SET NOT NULL;

-- =====================================================
-- 5. VERIFICACIÓN FINAL
-- =====================================================

-- Verificar que no queden registros sin agency_id
SELECT 
  'customers' as tabla,
  COUNT(*) as registros_sin_agency_id
FROM customers
WHERE agency_id IS NULL
UNION ALL
SELECT 
  'operations' as tabla,
  COUNT(*) as registros_sin_agency_id
FROM operations
WHERE agency_id IS NULL
UNION ALL
SELECT 
  'leads' as tabla,
  COUNT(*) as registros_sin_agency_id
FROM leads
WHERE agency_id IS NULL;
