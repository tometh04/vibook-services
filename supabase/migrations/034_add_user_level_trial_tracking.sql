-- =====================================================
-- MIGRACIÓN 034: Tracking de Trial a Nivel de Usuario
-- =====================================================
-- Previene múltiples trials mediante múltiples agencias

-- 1. Agregar campo has_used_trial a tabla users
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS has_used_trial BOOLEAN DEFAULT false;

-- 2. Función para verificar si un usuario ha usado trial en cualquier agencia
CREATE OR REPLACE FUNCTION user_has_used_trial(user_id_param UUID)
RETURNS BOOLEAN AS $$
DECLARE
  has_trial BOOLEAN;
BEGIN
  -- Verificar si el usuario tiene has_used_trial = true
  SELECT has_used_trial INTO has_trial
  FROM users
  WHERE id = user_id_param;
  
  -- Si no se encuentra el usuario, retornar false
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Si has_used_trial es true, retornar true
  IF has_trial = true THEN
    RETURN true;
  END IF;
  
  -- Verificar si alguna agencia del usuario tiene has_used_trial = true
  SELECT EXISTS(
    SELECT 1
    FROM user_agencies ua
    INNER JOIN agencies a ON ua.agency_id = a.id
    WHERE ua.user_id = user_id_param
      AND a.has_used_trial = true
  ) INTO has_trial;
  
  RETURN COALESCE(has_trial, false);
END;
$$ LANGUAGE plpgsql;

-- 3. Función para sincronizar has_used_trial desde agencies a users
CREATE OR REPLACE FUNCTION sync_user_trial_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Si una agencia cambia has_used_trial a true, actualizar el usuario
  IF NEW.has_used_trial = true THEN
    UPDATE users
    SET has_used_trial = true
    WHERE id IN (
      SELECT user_id
      FROM user_agencies
      WHERE agency_id = NEW.id
    )
    AND has_used_trial = false; -- Solo actualizar si aún no está en true
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Trigger para sincronizar automáticamente
DROP TRIGGER IF EXISTS sync_user_trial_status_trigger ON agencies;
CREATE TRIGGER sync_user_trial_status_trigger
  AFTER UPDATE OF has_used_trial ON agencies
  FOR EACH ROW
  WHEN (NEW.has_used_trial = true AND OLD.has_used_trial = false)
  EXECUTE FUNCTION sync_user_trial_status();

-- 5. Migración inicial: actualizar users basado en agencies existentes
UPDATE users
SET has_used_trial = true
WHERE id IN (
  SELECT DISTINCT ua.user_id
  FROM user_agencies ua
  INNER JOIN agencies a ON ua.agency_id = a.id
  WHERE a.has_used_trial = true
)
AND has_used_trial = false;

-- 6. Índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_users_has_used_trial ON users(has_used_trial);

-- 7. Comentarios
COMMENT ON COLUMN users.has_used_trial IS 'Indica si el usuario ha usado un trial en cualquier agencia';
COMMENT ON FUNCTION user_has_used_trial(UUID) IS 'Verifica si un usuario ha usado trial en cualquier agencia';
COMMENT ON FUNCTION sync_user_trial_status() IS 'Sincroniza has_used_trial desde agencies a users automáticamente';
