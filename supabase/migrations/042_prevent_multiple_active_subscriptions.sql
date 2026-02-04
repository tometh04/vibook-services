-- =====================================================
-- MIGRACIÓN 042: Prevenir Múltiples Suscripciones Activas
-- =====================================================
-- Validación adicional para prevenir race conditions

-- 1. Función para verificar y prevenir múltiples suscripciones activas
CREATE OR REPLACE FUNCTION prevent_multiple_active_subscriptions()
RETURNS TRIGGER AS $$
DECLARE
  existing_count INTEGER;
BEGIN
  -- Contar suscripciones activas para esta agencia
  SELECT COUNT(*) INTO existing_count
  FROM subscriptions
  WHERE agency_id = NEW.agency_id
    AND status IN ('ACTIVE', 'TRIAL')
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID);
  
  -- Si ya hay una suscripción activa, bloquear
  IF existing_count > 0 THEN
    RAISE EXCEPTION 'Ya existe una suscripción activa o en trial para esta agencia. Una agencia solo puede tener una suscripción activa a la vez.';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Trigger para prevenir múltiples suscripciones activas
DROP TRIGGER IF EXISTS prevent_multiple_active_subscriptions_trigger ON subscriptions;
CREATE TRIGGER prevent_multiple_active_subscriptions_trigger
  BEFORE INSERT ON subscriptions
  FOR EACH ROW
  WHEN (NEW.status IN ('ACTIVE', 'TRIAL'))
  EXECUTE FUNCTION prevent_multiple_active_subscriptions();

-- 3. También validar en UPDATE si se cambia status a ACTIVE o TRIAL
CREATE OR REPLACE FUNCTION prevent_multiple_active_subscriptions_update()
RETURNS TRIGGER AS $$
DECLARE
  existing_count INTEGER;
BEGIN
  -- Solo validar si se está cambiando a ACTIVE o TRIAL
  IF NEW.status IN ('ACTIVE', 'TRIAL') AND (OLD.status IS NULL OR OLD.status NOT IN ('ACTIVE', 'TRIAL')) THEN
    -- Contar otras suscripciones activas para esta agencia
    SELECT COUNT(*) INTO existing_count
    FROM subscriptions
    WHERE agency_id = NEW.agency_id
      AND status IN ('ACTIVE', 'TRIAL')
      AND id != NEW.id;
    
    -- Si ya hay otra suscripción activa, bloquear
    IF existing_count > 0 THEN
      RAISE EXCEPTION 'Ya existe otra suscripción activa o en trial para esta agencia. Una agencia solo puede tener una suscripción activa a la vez.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_multiple_active_subscriptions_update_trigger ON subscriptions;
CREATE TRIGGER prevent_multiple_active_subscriptions_update_trigger
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  WHEN (NEW.status IN ('ACTIVE', 'TRIAL') AND (OLD.status IS NULL OR OLD.status NOT IN ('ACTIVE', 'TRIAL')))
  EXECUTE FUNCTION prevent_multiple_active_subscriptions_update();

-- 4. Comentarios
COMMENT ON FUNCTION prevent_multiple_active_subscriptions() IS 'Previene crear múltiples suscripciones activas para la misma agencia';
COMMENT ON FUNCTION prevent_multiple_active_subscriptions_update() IS 'Previene cambiar status a ACTIVE/TRIAL si ya existe otra suscripción activa';
