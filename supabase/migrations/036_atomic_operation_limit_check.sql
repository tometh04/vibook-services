-- =====================================================
-- MIGRACIÓN 036: Transacciones Atómicas para Límites
-- =====================================================
-- Previene race conditions al verificar e incrementar límites

-- 1. Función para verificar e incrementar límite de operaciones de forma atómica
CREATE OR REPLACE FUNCTION check_and_increment_operation_limit(
  agency_id_param UUID,
  limit_type_param TEXT DEFAULT 'operations'
)
RETURNS JSONB AS $$
DECLARE
  subscription_record RECORD;
  plan_record RECORD;
  current_month_start DATE;
  usage_record RECORD;
  current_count INTEGER;
  limit_value INTEGER;
  limit_reached BOOLEAN;
  result JSONB;
BEGIN
  -- Obtener primer día del mes actual
  current_month_start := DATE_TRUNC('month', CURRENT_DATE)::DATE;
  
  -- Obtener suscripción con plan
  SELECT s.*, sp.*
  INTO subscription_record
  FROM subscriptions s
  INNER JOIN subscription_plans sp ON s.plan_id = sp.id
  WHERE s.agency_id = agency_id_param
  ORDER BY s.created_at DESC
  LIMIT 1;
  
  -- Si no hay suscripción, bloquear
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'limit_reached', true,
      'message', 'No tenés una suscripción activa. Por favor, elegí un plan para continuar.'
    );
  END IF;
  
  -- Plan TESTER tiene acceso completo
  IF subscription_record.name = 'TESTER' THEN
    RETURN jsonb_build_object(
      'allowed', true,
      'limit_reached', false,
      'limit', NULL,
      'current', 0
    );
  END IF;
  
  -- Verificar status de suscripción
  IF subscription_record.status NOT IN ('TRIAL', 'ACTIVE') THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'limit_reached', true,
      'message', 'Tu suscripción no está activa. Por favor, actualizá tu plan para continuar.'
    );
  END IF;
  
  -- Obtener límite según tipo
  CASE limit_type_param
    WHEN 'operations' THEN
      limit_value := subscription_record.max_operations_per_month;
    WHEN 'users' THEN
      limit_value := subscription_record.max_users;
    WHEN 'integrations' THEN
      limit_value := subscription_record.max_integrations;
    ELSE
      limit_value := NULL;
  END CASE;
  
  -- Si no hay límite (ilimitado), permitir
  IF limit_value IS NULL THEN
    RETURN jsonb_build_object(
      'allowed', true,
      'limit_reached', false,
      'limit', NULL,
      'current', 0
    );
  END IF;
  
  -- Obtener o crear registro de uso del mes actual
  SELECT * INTO usage_record
  FROM usage_metrics
  WHERE agency_id = agency_id_param
    AND period_start = current_month_start;
  
  -- Si no existe, crear con count = 0
  IF NOT FOUND THEN
    INSERT INTO usage_metrics (
      agency_id,
      period_start,
      period_end,
      operations_count,
      users_count,
      integrations_count
    ) VALUES (
      agency_id_param,
      current_month_start,
      (current_month_start + INTERVAL '1 month - 1 day')::DATE,
      CASE WHEN limit_type_param = 'operations' THEN 0 ELSE 0 END,
      CASE WHEN limit_type_param = 'users' THEN 0 ELSE 0 END,
      CASE WHEN limit_type_param = 'integrations' THEN 0 ELSE 0 END
    )
    RETURNING * INTO usage_record;
  END IF;
  
  -- Obtener count actual según tipo
  CASE limit_type_param
    WHEN 'operations' THEN
      current_count := COALESCE(usage_record.operations_count, 0);
    WHEN 'users' THEN
      current_count := COALESCE(usage_record.users_count, 0);
    WHEN 'integrations' THEN
      current_count := COALESCE(usage_record.integrations_count, 0);
    ELSE
      current_count := 0;
  END CASE;
  
  -- Verificar si se alcanzó el límite
  limit_reached := current_count >= limit_value;
  
  -- Si se alcanzó, bloquear
  IF limit_reached THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'limit_reached', true,
      'limit', limit_value,
      'current', current_count,
      'message', format('Has alcanzado el límite de %s %s de tu plan. Actualizá tu plan para continuar.', 
        limit_value, 
        CASE limit_type_param 
          WHEN 'operations' THEN 'operaciones por mes'
          WHEN 'users' THEN 'usuarios'
          WHEN 'integrations' THEN 'integraciones'
          ELSE 'recursos'
        END
      )
    );
  END IF;
  
  -- Incrementar contador de forma atómica
  CASE limit_type_param
    WHEN 'operations' THEN
      UPDATE usage_metrics
      SET operations_count = operations_count + 1,
          updated_at = NOW()
      WHERE agency_id = agency_id_param
        AND period_start = current_month_start
      RETURNING operations_count INTO current_count;
    WHEN 'users' THEN
      UPDATE usage_metrics
      SET users_count = users_count + 1,
          updated_at = NOW()
      WHERE agency_id = agency_id_param
        AND period_start = current_month_start
      RETURNING users_count INTO current_count;
    WHEN 'integrations' THEN
      UPDATE usage_metrics
      SET integrations_count = integrations_count + 1,
          updated_at = NOW()
      WHERE agency_id = agency_id_param
        AND period_start = current_month_start
      RETURNING integrations_count INTO current_count;
  END CASE;
  
  -- Retornar éxito
  RETURN jsonb_build_object(
    'allowed', true,
    'limit_reached', false,
    'limit', limit_value,
    'current', current_count,
    'remaining', limit_value - current_count
  );
  
EXCEPTION
  WHEN OTHERS THEN
    -- En caso de error, bloquear por seguridad
    RETURN jsonb_build_object(
      'allowed', false,
      'limit_reached', true,
      'error', SQLERRM,
      'message', 'Error al verificar límite. Por favor, intentá nuevamente.'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Función para incrementar contador de usuarios (después de crear usuario)
CREATE OR REPLACE FUNCTION increment_user_count(
  agency_id_param UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  current_month_start DATE;
BEGIN
  current_month_start := DATE_TRUNC('month', CURRENT_DATE)::DATE;
  
  -- Insertar o actualizar contador de usuarios
  INSERT INTO usage_metrics (
    agency_id,
    period_start,
    period_end,
    users_count
  )
  VALUES (
    agency_id_param,
    current_month_start,
    (current_month_start + INTERVAL '1 month - 1 day')::DATE,
    1
  )
  ON CONFLICT (agency_id, period_start)
  DO UPDATE SET
    users_count = usage_metrics.users_count + 1,
    updated_at = NOW();
  
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Función para decrementar contador (rollback si falla la creación)
CREATE OR REPLACE FUNCTION decrement_usage_count(
  agency_id_param UUID,
  limit_type_param TEXT,
  period_start_param DATE
)
RETURNS BOOLEAN AS $$
BEGIN
  CASE limit_type_param
    WHEN 'operations' THEN
      UPDATE usage_metrics
      SET operations_count = GREATEST(0, operations_count - 1),
          updated_at = NOW()
      WHERE agency_id = agency_id_param
        AND period_start = period_start_param;
    WHEN 'users' THEN
      UPDATE usage_metrics
      SET users_count = GREATEST(0, users_count - 1),
          updated_at = NOW()
      WHERE agency_id = agency_id_param
        AND period_start = period_start_param;
    WHEN 'integrations' THEN
      UPDATE usage_metrics
      SET integrations_count = GREATEST(0, integrations_count - 1),
          updated_at = NOW()
      WHERE agency_id = agency_id_param
        AND period_start = period_start_param;
  END CASE;
  
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Comentarios
COMMENT ON FUNCTION check_and_increment_operation_limit() IS 'Verifica e incrementa límite de forma atómica para prevenir race conditions';
COMMENT ON FUNCTION increment_user_count() IS 'Incrementa contador de usuarios después de crear usuario';
COMMENT ON FUNCTION decrement_usage_count() IS 'Decrementa contador para rollback si falla la creación del recurso';
