-- =====================================================
-- MIGRACIÓN 038: Sistema de Alertas para Cambios Críticos
-- =====================================================
-- Alertas automáticas para cambios críticos (TESTER, extensiones, etc.)

-- 1. Tabla de alertas
CREATE TABLE IF NOT EXISTS security_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  title TEXT NOT NULL,
  description TEXT,
  entity_type TEXT, -- 'subscription', 'agency', 'user', etc.
  entity_id UUID,
  metadata JSONB,
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Índices
CREATE INDEX IF NOT EXISTS idx_security_alerts_type ON security_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_security_alerts_severity ON security_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_security_alerts_resolved ON security_alerts(resolved);
CREATE INDEX IF NOT EXISTS idx_security_alerts_created ON security_alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_alerts_entity ON security_alerts(entity_type, entity_id);

-- 3. Función para crear alerta
CREATE OR REPLACE FUNCTION create_security_alert(
  alert_type_param TEXT,
  severity_param TEXT,
  title_param TEXT,
  description_param TEXT DEFAULT NULL,
  entity_type_param TEXT DEFAULT NULL,
  entity_id_param UUID DEFAULT NULL,
  metadata_param JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  alert_id UUID;
BEGIN
  INSERT INTO security_alerts (
    alert_type,
    severity,
    title,
    description,
    entity_type,
    entity_id,
    metadata
  ) VALUES (
    alert_type_param,
    severity_param,
    title_param,
    description_param,
    entity_type_param,
    entity_id_param,
    metadata_param
  ) RETURNING id INTO alert_id;
  
  RETURN alert_id;
END;
$$ LANGUAGE plpgsql;

-- 4. Trigger para alertar cuando se asigna plan TESTER
CREATE OR REPLACE FUNCTION alert_on_tester_assignment()
RETURNS TRIGGER AS $$
DECLARE
  plan_name TEXT;
BEGIN
  -- Obtener nombre del plan
  SELECT name INTO plan_name
  FROM subscription_plans
  WHERE id = NEW.plan_id;
  
  -- Si se asigna plan TESTER, crear alerta
  -- En INSERT: siempre alertar si es TESTER
  -- En UPDATE: solo alertar si cambió de otro plan a TESTER
  IF plan_name = 'TESTER' THEN
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND (OLD.plan_id IS NULL OR OLD.plan_id != NEW.plan_id)) THEN
      PERFORM create_security_alert(
        'TESTER_ASSIGNED',
        'HIGH',
        'Plan TESTER asignado a agencia',
        format('Se asignó el plan TESTER a la agencia %s. Este plan otorga acceso completo sin pago.', NEW.agency_id),
        'subscription',
        NEW.id,
        jsonb_build_object(
          'agency_id', NEW.agency_id,
          'plan_id', NEW.plan_id,
          'previous_plan_id', CASE WHEN TG_OP = 'UPDATE' THEN OLD.plan_id ELSE NULL END,
          'assigned_at', NOW()
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS alert_on_tester_assignment_trigger ON subscriptions;
CREATE TRIGGER alert_on_tester_assignment_trigger
  AFTER INSERT OR UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION alert_on_tester_assignment();

-- 5. Trigger para alertar extensiones de trial
CREATE OR REPLACE FUNCTION alert_on_trial_extension()
RETURNS TRIGGER AS $$
DECLARE
  extension_days INTEGER;
BEGIN
  -- Si trial_end cambió y está en el futuro, es una extensión
  IF NEW.trial_end IS NOT NULL AND OLD.trial_end IS NOT NULL AND NEW.trial_end > OLD.trial_end THEN
    extension_days := EXTRACT(DAY FROM (NEW.trial_end - OLD.trial_end))::INTEGER;
    
    PERFORM create_security_alert(
      'TRIAL_EXTENDED',
      'MEDIUM',
      'Trial extendido manualmente',
      format('El trial de la agencia %s fue extendido %s días adicionales. Nuevo fin: %s', 
        NEW.agency_id, 
        extension_days,
        NEW.trial_end
      ),
      'subscription',
      NEW.id,
      jsonb_build_object(
        'agency_id', NEW.agency_id,
        'previous_trial_end', OLD.trial_end,
        'new_trial_end', NEW.trial_end,
        'extension_days', extension_days,
        'extended_at', NOW()
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS alert_on_trial_extension_trigger ON subscriptions;
CREATE TRIGGER alert_on_trial_extension_trigger
  AFTER UPDATE ON subscriptions
  FOR EACH ROW
  WHEN (NEW.trial_end IS DISTINCT FROM OLD.trial_end AND NEW.trial_end > OLD.trial_end)
  EXECUTE FUNCTION alert_on_trial_extension();

-- 6. Trigger para alertar cambios de status a ACTIVE sin preapproval
CREATE OR REPLACE FUNCTION alert_on_active_without_preapproval()
RETURNS TRIGGER AS $$
DECLARE
  plan_name TEXT;
BEGIN
  -- Si status cambió a ACTIVE
  IF NEW.status = 'ACTIVE' AND (OLD.status IS NULL OR OLD.status != 'ACTIVE') THEN
    -- Obtener nombre del plan
    SELECT name INTO plan_name
    FROM subscription_plans
    WHERE id = NEW.plan_id;
    
    -- Si no es TESTER y no tiene preapproval, alertar
    IF plan_name != 'TESTER' AND (NEW.mp_preapproval_id IS NULL OR NEW.mp_preapproval_id = '') THEN
      PERFORM create_security_alert(
        'ACTIVE_WITHOUT_PREAPPROVAL',
        'CRITICAL',
        'Status ACTIVE sin mp_preapproval_id',
        format('La suscripción de la agencia %s fue cambiada a ACTIVE sin mp_preapproval_id válido. Esto puede indicar un bypass del sistema de pago.', NEW.agency_id),
        'subscription',
        NEW.id,
        jsonb_build_object(
          'agency_id', NEW.agency_id,
          'plan_id', NEW.plan_id,
          'plan_name', plan_name,
          'mp_preapproval_id', NEW.mp_preapproval_id,
          'previous_status', OLD.status,
          'changed_at', NOW()
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS alert_on_active_without_preapproval_trigger ON subscriptions;
CREATE TRIGGER alert_on_active_without_preapproval_trigger
  AFTER UPDATE ON subscriptions
  FOR EACH ROW
  WHEN (NEW.status = 'ACTIVE' AND (OLD.status IS NULL OR OLD.status != 'ACTIVE'))
  EXECUTE FUNCTION alert_on_active_without_preapproval();

-- 7. Trigger para alertar cambios en has_used_trial
CREATE OR REPLACE FUNCTION alert_on_trial_reset()
RETURNS TRIGGER AS $$
BEGIN
  -- Si has_used_trial cambió de true a false, alertar
  IF OLD.has_used_trial = true AND NEW.has_used_trial = false THEN
    PERFORM create_security_alert(
      'TRIAL_RESET',
      'HIGH',
      'has_used_trial reseteado a false',
      format('El campo has_used_trial de la agencia %s fue reseteado de true a false. Esto puede permitir múltiples trials.', NEW.id),
      'agency',
      NEW.id,
      jsonb_build_object(
        'agency_id', NEW.id,
        'previous_value', OLD.has_used_trial,
        'new_value', NEW.has_used_trial,
        'changed_at', NOW()
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS alert_on_trial_reset_trigger ON agencies;
CREATE TRIGGER alert_on_trial_reset_trigger
  AFTER UPDATE ON agencies
  FOR EACH ROW
  WHEN (OLD.has_used_trial IS DISTINCT FROM NEW.has_used_trial)
  EXECUTE FUNCTION alert_on_trial_reset();

-- 8. Comentarios
COMMENT ON TABLE security_alerts IS 'Sistema de alertas para cambios críticos de seguridad';
COMMENT ON FUNCTION create_security_alert(TEXT, TEXT, TEXT, TEXT, TEXT, UUID, JSONB) IS 'Crea una alerta de seguridad';
COMMENT ON FUNCTION alert_on_tester_assignment() IS 'Alerta cuando se asigna plan TESTER';
COMMENT ON FUNCTION alert_on_trial_extension() IS 'Alerta cuando se extiende trial';
COMMENT ON FUNCTION alert_on_active_without_preapproval() IS 'Alerta cuando status ACTIVE sin preapproval';
COMMENT ON FUNCTION alert_on_trial_reset() IS 'Alerta cuando se resetea has_used_trial';
