-- Migración para corregir roles de usuarios existentes
-- Solo admin@vibook.ai debe ser SUPER_ADMIN
-- Todos los demás usuarios que hacen signup deben ser ADMIN

-- =====================================================
-- 1. IDENTIFICAR USUARIOS QUE DEBEN SER ADMIN
-- =====================================================

-- Ver usuarios actuales con rol SUPER_ADMIN
SELECT 
  id,
  email,
  role,
  created_at
FROM users
WHERE role = 'SUPER_ADMIN'
ORDER BY created_at;

-- =====================================================
-- 2. CORREGIR ROLES: Solo admin@vibook.ai es SUPER_ADMIN
-- =====================================================

-- Cambiar todos los SUPER_ADMIN a ADMIN, EXCEPTO admin@vibook.ai
UPDATE users
SET 
  role = 'ADMIN',
  updated_at = NOW()
WHERE role = 'SUPER_ADMIN'
AND email != 'admin@vibook.ai';

-- Verificar que solo admin@vibook.ai sea SUPER_ADMIN
SELECT 
  email,
  role,
  CASE 
    WHEN email = 'admin@vibook.ai' AND role = 'SUPER_ADMIN' THEN '✅ Correcto'
    WHEN email != 'admin@vibook.ai' AND role = 'SUPER_ADMIN' THEN '❌ Debe ser ADMIN'
    WHEN email != 'admin@vibook.ai' AND role = 'ADMIN' THEN '✅ Correcto'
    ELSE '⚠️ Revisar'
  END as estado
FROM users
WHERE role IN ('SUPER_ADMIN', 'ADMIN')
ORDER BY 
  CASE WHEN email = 'admin@vibook.ai' THEN 0 ELSE 1 END,
  email;

-- =====================================================
-- 3. VERIFICAR QUE LOS USUARIOS TENGAN AGENCIAS ASIGNADAS
-- =====================================================

-- Ver usuarios sin agencias asignadas
SELECT 
  u.id,
  u.email,
  u.role,
  COUNT(ua.agency_id) as agencias_asignadas
FROM users u
LEFT JOIN user_agencies ua ON u.id = ua.user_id
WHERE u.role IN ('ADMIN', 'SUPER_ADMIN')
GROUP BY u.id, u.email, u.role
HAVING COUNT(ua.agency_id) = 0;

-- =====================================================
-- 4. VERIFICAR CLIENTES SIN agency_id O CON agency_id INCORRECTO
-- =====================================================

-- Ver clientes y sus agency_id
SELECT 
  c.id,
  c.first_name,
  c.last_name,
  c.email,
  c.agency_id,
  a.name as agency_name,
  CASE 
    WHEN c.agency_id IS NULL THEN '❌ Sin agency_id'
    WHEN a.id IS NULL THEN '❌ agency_id inválido'
    ELSE '✅ OK'
  END as estado
FROM customers c
LEFT JOIN agencies a ON c.agency_id = a.id
ORDER BY c.created_at DESC
LIMIT 20;
