-- =====================================================
-- MIGRACIÓN 059: Grace period en función RPC de límites
-- =====================================================
-- Permite que suscripciones CANCELED con current_period_end > NOW()
-- sigan funcionando (grace period hasta fin del período pagado)

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
  -- Permitir TRIAL, ACTIVE, y CANCELED con grace period (current_period_end > NOW)
  IF subscription_record.status NOT IN ('TRIAL', 'ACTIVE') THEN
    -- Grace period: si está CANCELED pero aún dentro del período pagado, permitir
    IF subscription_record.status = 'CANCELED'
       AND subscription_record.current_period_end IS NOT NULL
       AND subscription_record.current_period_end > NOW() THEN
      -- Permitir acceso durante grace period (continuar con verificación de límites)
      NULL; -- no hacer nada, continuar
    ELSE
      RETURN jsonb_build_object(
        'allowed', false,
        'limit_reached', true,
        'message', 'Tu suscripción no está activa. Por favor, actualizá tu plan para continuar.'
      );
    END IF;
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

COMMENT ON FUNCTION check_and_increment_operation_limit(UUID, TEXT) IS 'Verifica e incrementa límite de forma atómica - soporta grace period para CANCELED con current_period_end vigente';
