-- =====================================================
-- MIGRACIÓN 033: Validaciones de Seguridad en BD
-- =====================================================
-- Triggers y constraints para prevenir estados inválidos
-- Prevenir manipulación directa de datos críticos

-- 1. Trigger para prevenir cambio de has_used_trial de true a false
CREATE OR REPLACE FUNCTION prevent_trial_reset()
RETURNS TRIGGER AS $$
BEGIN
  -- Si el valor anterior era true y el nuevo es false, bloquear
  IF OLD.has_used_trial = true AND NEW.has_used_trial = false THEN
    RAISE EXCEPTION 'No se puede resetear has_used_trial de true a false. Solo puede ser cambiado por proceso especial de admin.';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_trial_reset_trigger
  BEFORE UPDATE ON agencies
  FOR EACH ROW
  WHEN (OLD.has_used_trial IS DISTINCT FROM NEW.has_used_trial)
  EXECUTE FUNCTION prevent_trial_reset();

-- 2. Trigger para validar trial_end > trial_start
CREATE OR REPLACE FUNCTION validate_trial_dates()
RETURNS TRIGGER AS $$
BEGIN
  -- Si ambos están presentes, trial_end debe ser después de trial_start
  IF NEW.trial_start IS NOT NULL AND NEW.trial_end IS NOT NULL THEN
    IF NEW.trial_end <= NEW.trial_start THEN
      RAISE EXCEPTION 'trial_end debe ser posterior a trial_start';
    END IF;
    
    -- Validar que trial no exceda máximo permitido (30 días por defecto)
    IF (NEW.trial_end - NEW.trial_start) > INTERVAL '30 days' THEN
      RAISE EXCEPTION 'El período de trial no puede exceder 30 días';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_trial_dates_trigger
  BEFORE INSERT OR UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION validate_trial_dates();

-- 3. Trigger para validar que ACTIVE requiere mp_preapproval_id
CREATE OR REPLACE FUNCTION validate_active_subscription()
RETURNS TRIGGER AS $$
DECLARE
  plan_name TEXT;
BEGIN
  -- Si status es ACTIVE, debe tener mp_preapproval_id (excepto TESTER)
  IF NEW.status = 'ACTIVE' THEN
    -- Verificar si el plan es TESTER
    SELECT name INTO plan_name
    FROM subscription_plans
    WHERE id = NEW.plan_id;
    
    -- TESTER no requiere preapproval
    IF plan_name != 'TESTER' AND (NEW.mp_preapproval_id IS NULL OR NEW.mp_preapproval_id = '') THEN
      RAISE EXCEPTION 'Status ACTIVE requiere mp_preapproval_id válido (excepto plan TESTER)';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_active_subscription_trigger
  BEFORE INSERT OR UPDATE ON subscriptions
  FOR EACH ROW
  WHEN (NEW.status = 'ACTIVE')
  EXECUTE FUNCTION validate_active_subscription();

-- 4. Trigger para validar current_period_end > current_period_start
CREATE OR REPLACE FUNCTION validate_period_dates()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.current_period_end <= NEW.current_period_start THEN
    RAISE EXCEPTION 'current_period_end debe ser posterior a current_period_start';
  END IF;
  
  -- Validar que período no exceda 35 días (permite un poco de flexibilidad)
  IF (NEW.current_period_end - NEW.current_period_start) > INTERVAL '35 days' THEN
    RAISE EXCEPTION 'El período de facturación no puede exceder 35 días';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_period_dates_trigger
  BEFORE INSERT OR UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION validate_period_dates();

-- 5. Función para validar límites de extensiones de trial
CREATE OR REPLACE FUNCTION check_trial_extension_limits(
  subscription_id_param UUID,
  additional_days INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  current_trial_end TIMESTAMP WITH TIME ZONE;
  trial_start_date TIMESTAMP WITH TIME ZONE;
  total_trial_days INTEGER;
  extension_count INTEGER;
  max_extensions INTEGER := 2;
  max_total_days INTEGER := 21;
BEGIN
  -- Obtener datos de la suscripción
  SELECT trial_end, trial_start INTO current_trial_end, trial_start_date
  FROM subscriptions
  WHERE id = subscription_id_param;
  
  IF current_trial_end IS NULL OR trial_start_date IS NULL THEN
    RETURN false;
  END IF;
  
  -- Calcular días totales de trial
  total_trial_days := EXTRACT(DAY FROM (current_trial_end - trial_start_date))::INTEGER + additional_days;
  
  -- Contar extensiones previas
  SELECT COUNT(*) INTO extension_count
  FROM billing_events
  WHERE subscription_id = subscription_id_param
    AND event_type = 'TRIAL_EXTENDED_BY_ADMIN';
  
  -- Validar límites
  IF extension_count >= max_extensions THEN
    RAISE EXCEPTION 'Se alcanzó el límite máximo de extensiones de trial (%)', max_extensions;
  END IF;
  
  IF total_trial_days > max_total_days THEN
    RAISE EXCEPTION 'El trial total no puede exceder % días', max_total_days;
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- 6. Índice para búsquedas rápidas de suscripciones por status
CREATE INDEX IF NOT EXISTS idx_subscriptions_status_plan ON subscriptions(status, plan_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_agency_status ON subscriptions(agency_id, status);

-- 7. Comentarios para documentación
COMMENT ON FUNCTION prevent_trial_reset() IS 'Previene resetear has_used_trial de true a false para evitar múltiples trials';
COMMENT ON FUNCTION validate_trial_dates() IS 'Valida que trial_end sea posterior a trial_start y no exceda 30 días';
COMMENT ON FUNCTION validate_active_subscription() IS 'Valida que status ACTIVE requiera mp_preapproval_id (excepto TESTER)';
COMMENT ON FUNCTION validate_period_dates() IS 'Valida fechas de período de facturación';
COMMENT ON FUNCTION check_trial_extension_limits() IS 'Valida límites de extensiones de trial (máx 2 extensiones, máx 21 días total)';
