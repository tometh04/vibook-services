-- =====================================================
-- MIGRACIÓN 035: Auditoría Completa de Cambios Admin
-- =====================================================
-- Registra todos los cambios críticos realizados por admin

-- 1. Tabla de auditoría para cambios admin
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  reason TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Función para registrar acciones de admin
CREATE OR REPLACE FUNCTION log_admin_action(
  admin_user_id_param UUID,
  action_type_param TEXT,
  entity_type_param TEXT,
  entity_id_param UUID DEFAULT NULL,
  old_values_param JSONB DEFAULT NULL,
  new_values_param JSONB DEFAULT NULL,
  reason_param TEXT DEFAULT NULL,
  ip_address_param TEXT DEFAULT NULL,
  user_agent_param TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO admin_audit_log (
    admin_user_id,
    action_type,
    entity_type,
    entity_id,
    old_values,
    new_values,
    reason,
    ip_address,
    user_agent
  ) VALUES (
    admin_user_id_param,
    action_type_param,
    entity_type_param,
    entity_id_param,
    old_values_param,
    new_values_param,
    reason_param,
    ip_address_param,
    user_agent_param
  )
  RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$ LANGUAGE plpgsql;

-- 3. Trigger para auditar cambios en subscriptions
CREATE OR REPLACE FUNCTION audit_subscription_changes()
RETURNS TRIGGER AS $$
DECLARE
  admin_user_id UUID;
BEGIN
  -- Intentar obtener el usuario actual (puede no estar disponible en triggers)
  -- En la práctica, esto se manejará desde la aplicación
  
  -- Registrar cambios significativos
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM log_admin_action(
      NULL, -- Se llenará desde la aplicación
      'SUBSCRIPTION_STATUS_CHANGED',
      'subscription',
      NEW.id,
      jsonb_build_object('status', OLD.status),
      jsonb_build_object('status', NEW.status),
      NULL,
      NULL,
      NULL
    );
  END IF;
  
  IF OLD.plan_id IS DISTINCT FROM NEW.plan_id THEN
    PERFORM log_admin_action(
      NULL,
      'SUBSCRIPTION_PLAN_CHANGED',
      'subscription',
      NEW.id,
      jsonb_build_object('plan_id', OLD.plan_id),
      jsonb_build_object('plan_id', NEW.plan_id),
      NULL,
      NULL,
      NULL
    );
  END IF;
  
  IF OLD.trial_end IS DISTINCT FROM NEW.trial_end THEN
    PERFORM log_admin_action(
      NULL,
      'SUBSCRIPTION_TRIAL_EXTENDED',
      'subscription',
      NEW.id,
      jsonb_build_object('trial_end', OLD.trial_end),
      jsonb_build_object('trial_end', NEW.trial_end),
      NULL,
      NULL,
      NULL
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_subscription_changes_trigger
  AFTER UPDATE ON subscriptions
  FOR EACH ROW
  WHEN (
    OLD.status IS DISTINCT FROM NEW.status OR
    OLD.plan_id IS DISTINCT FROM NEW.plan_id OR
    OLD.trial_end IS DISTINCT FROM NEW.trial_end
  )
  EXECUTE FUNCTION audit_subscription_changes();

-- 4. Trigger para auditar cambios en agencies.has_used_trial
CREATE OR REPLACE FUNCTION audit_trial_status_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.has_used_trial IS DISTINCT FROM NEW.has_used_trial THEN
    PERFORM log_admin_action(
      NULL,
      'TRIAL_STATUS_CHANGED',
      'agency',
      NEW.id,
      jsonb_build_object('has_used_trial', OLD.has_used_trial),
      jsonb_build_object('has_used_trial', NEW.has_used_trial),
      NULL,
      NULL,
      NULL
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_trial_status_changes_trigger
  AFTER UPDATE OF has_used_trial ON agencies
  FOR EACH ROW
  WHEN (OLD.has_used_trial IS DISTINCT FROM NEW.has_used_trial)
  EXECUTE FUNCTION audit_trial_status_changes();

-- 5. Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_admin_user ON admin_audit_log(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_entity ON admin_audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_action ON admin_audit_log(action_type);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created ON admin_audit_log(created_at DESC);

-- 6. Comentarios
COMMENT ON TABLE admin_audit_log IS 'Registra todos los cambios críticos realizados por administradores';
COMMENT ON FUNCTION log_admin_action(UUID, TEXT, TEXT, UUID, JSONB, JSONB, TEXT, TEXT, TEXT) IS 'Registra una acción de admin en el log de auditoría';
COMMENT ON FUNCTION audit_subscription_changes() IS 'Audita cambios en suscripciones automáticamente';
COMMENT ON FUNCTION audit_trial_status_changes() IS 'Audita cambios en has_used_trial de agencies';
