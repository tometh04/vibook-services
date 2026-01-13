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

-- Si aún hay clientes sin agency_id, intentar asignarlos a través de cualquier agencia disponible
-- Primero intentar por la primera agencia que tenga más clientes (probablemente la correcta)
UPDATE customers c
SET agency_id = (
  SELECT a.id
  FROM agencies a
  WHERE a.id IN (
    SELECT DISTINCT o.agency_id
    FROM operations o
    JOIN operation_customers oc ON o.id = oc.operation_id
    WHERE oc.customer_id = c.id
    LIMIT 1
  )
  LIMIT 1
)
WHERE c.agency_id IS NULL
AND EXISTS (
  SELECT 1
  FROM operations o
  JOIN operation_customers oc ON o.id = oc.operation_id
  WHERE oc.customer_id = c.id
);

-- Si aún hay clientes sin agency_id, asignarlos a la primera agencia disponible
-- (esto es un fallback - idealmente todos deberían tener agency_id asignado)
UPDATE customers c
SET agency_id = (
  SELECT id
  FROM agencies
  ORDER BY created_at ASC
  LIMIT 1
)
WHERE c.agency_id IS NULL
AND EXISTS (
  SELECT 1
  FROM agencies
  LIMIT 1
);

-- Si AÚN hay clientes sin agency_id después de todos los intentos, 
-- mostrar un mensaje de error claro
DO $$
DECLARE
  remaining_nulls INTEGER;
BEGIN
  SELECT COUNT(*) INTO remaining_nulls
  FROM customers
  WHERE agency_id IS NULL;
  
  IF remaining_nulls > 0 THEN
    RAISE WARNING '⚠️  Aún hay % clientes sin agency_id después de intentar asignarlos automáticamente. Revisa manualmente estos registros.', remaining_nulls;
  END IF;
END $$;

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

-- IMPORTANTE: Solo agregar NOT NULL si NO hay valores NULL
-- Si hay valores NULL después de los UPDATEs, mostrar warning pero continuar

-- Verificar y agregar constraints
DO $$
DECLARE
  customers_nulls INTEGER;
  operations_nulls INTEGER;
  leads_nulls INTEGER;
BEGIN
  -- Contar NULLs después de los UPDATEs
  SELECT COUNT(*) INTO customers_nulls FROM customers WHERE agency_id IS NULL;
  SELECT COUNT(*) INTO operations_nulls FROM operations WHERE agency_id IS NULL;
  SELECT COUNT(*) INTO leads_nulls FROM leads WHERE agency_id IS NULL;
  
  -- Si hay NULLs, mostrar warning pero NO fallar
  -- (ya intentamos corregirlos, si aún hay NULLs es porque no hay forma de inferirlos)
  IF customers_nulls > 0 THEN
    RAISE WARNING '⚠️  Hay % clientes sin agency_id. No se puede agregar constraint NOT NULL. Revisa manualmente.', customers_nulls;
  ELSE
    -- Solo agregar constraint si NO hay NULLs
    ALTER TABLE customers ALTER COLUMN agency_id SET NOT NULL;
    RAISE NOTICE '✅ Constraint NOT NULL agregado a customers.agency_id';
  END IF;
  
  IF operations_nulls > 0 THEN
    RAISE WARNING '⚠️  Hay % operaciones sin agency_id. No se puede agregar constraint NOT NULL. Revisa manualmente.', operations_nulls;
  ELSE
    ALTER TABLE operations ALTER COLUMN agency_id SET NOT NULL;
    RAISE NOTICE '✅ Constraint NOT NULL agregado a operations.agency_id';
  END IF;
  
  IF leads_nulls > 0 THEN
    RAISE WARNING '⚠️  Hay % leads sin agency_id. No se puede agregar constraint NOT NULL. Revisa manualmente.', leads_nulls;
  ELSE
    ALTER TABLE leads ALTER COLUMN agency_id SET NOT NULL;
    RAISE NOTICE '✅ Constraint NOT NULL agregado a leads.agency_id';
  END IF;
END $$;

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
