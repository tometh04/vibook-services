-- =====================================================
-- MIGRACIÓN 046: Fix Integrity Checks Duplicates
-- =====================================================
-- Agregar campo is_latest para evitar duplicados en integrity_check_results

-- 1. Agregar columna is_latest
ALTER TABLE integrity_check_results
ADD COLUMN IF NOT EXISTS is_latest BOOLEAN DEFAULT true;

-- 2. Crear índice para consultas eficientes
CREATE INDEX IF NOT EXISTS idx_integrity_check_latest
ON integrity_check_results(check_type, is_latest, checked_at DESC);

-- 3. Marcar todos los registros existentes como no-latest excepto el más reciente de cada tipo
WITH latest_checks AS (
  SELECT DISTINCT ON (check_type) id
  FROM integrity_check_results
  ORDER BY check_type, checked_at DESC
)
UPDATE integrity_check_results
SET is_latest = (id IN (SELECT id FROM latest_checks));

-- 4. Recrear función para verificar suscripciones ACTIVE sin preapproval
CREATE OR REPLACE FUNCTION check_active_without_preapproval()
RETURNS JSONB AS $$
DECLARE
  invalid_subscriptions JSONB;
  count_invalid INTEGER;
BEGIN
  -- Buscar suscripciones ACTIVE sin preapproval (excepto TESTER)
  SELECT
    jsonb_agg(
      jsonb_build_object(
        'subscription_id', s.id,
        'agency_id', s.agency_id,
        'plan_name', sp.name,
        'status', s.status,
        'mp_preapproval_id', s.mp_preapproval_id
      )
    ),
    COUNT(*)
  INTO invalid_subscriptions, count_invalid
  FROM subscriptions s
  INNER JOIN subscription_plans sp ON s.plan_id = sp.id
  WHERE s.status = 'ACTIVE'
    AND (s.mp_preapproval_id IS NULL OR s.mp_preapproval_id = '')
    AND sp.name != 'TESTER';

  -- Marcar resultados anteriores de este tipo como no-latest
  UPDATE integrity_check_results
  SET is_latest = false
  WHERE check_type = 'ACTIVE_WITHOUT_PREAPPROVAL';

  -- Registrar resultado nuevo
  INSERT INTO integrity_check_results (
    check_type,
    status,
    description,
    affected_entities,
    metadata,
    is_latest
  ) VALUES (
    'ACTIVE_WITHOUT_PREAPPROVAL',
    CASE WHEN count_invalid > 0 THEN 'FAIL' ELSE 'PASS' END,
    format('Encontradas %s suscripciones ACTIVE sin mp_preapproval_id válido', count_invalid),
    invalid_subscriptions,
    jsonb_build_object('count', count_invalid),
    true
  );

  RETURN jsonb_build_object(
    'status', CASE WHEN count_invalid > 0 THEN 'FAIL' ELSE 'PASS' END,
    'count', count_invalid,
    'subscriptions', invalid_subscriptions
  );
END;
$$ LANGUAGE plpgsql;

-- 5. Recrear función para verificar múltiples trials por usuario
CREATE OR REPLACE FUNCTION check_multiple_trials_per_user()
RETURNS JSONB AS $$
DECLARE
  users_with_multiple_trials JSONB;
  count_users INTEGER;
BEGIN
  -- Buscar usuarios que tienen has_used_trial = true en múltiples agencias
  WITH user_trial_counts AS (
    SELECT
      ua.user_id,
      COUNT(*) as trial_count,
      jsonb_agg(ua.agency_id) as agency_ids
    FROM user_agencies ua
    INNER JOIN agencies a ON ua.agency_id = a.id
    WHERE a.has_used_trial = true
    GROUP BY ua.user_id
    HAVING COUNT(*) > 1
  )
  SELECT
    jsonb_agg(
      jsonb_build_object(
        'user_id', utc.user_id,
        'trial_count', utc.trial_count,
        'agency_ids', utc.agency_ids
      )
    ),
    COUNT(*)
  INTO users_with_multiple_trials, count_users
  FROM user_trial_counts utc;

  -- Marcar resultados anteriores de este tipo como no-latest
  UPDATE integrity_check_results
  SET is_latest = false
  WHERE check_type = 'MULTIPLE_TRIALS_PER_USER';

  -- Registrar resultado nuevo
  INSERT INTO integrity_check_results (
    check_type,
    status,
    description,
    affected_entities,
    metadata,
    is_latest
  ) VALUES (
    'MULTIPLE_TRIALS_PER_USER',
    CASE WHEN count_users > 0 THEN 'WARNING' ELSE 'PASS' END,
    format('Encontrados %s usuarios con múltiples trials en diferentes agencias', count_users),
    users_with_multiple_trials,
    jsonb_build_object('count', count_users),
    true
  );

  RETURN jsonb_build_object(
    'status', CASE WHEN count_users > 0 THEN 'WARNING' ELSE 'PASS' END,
    'count', count_users,
    'users', users_with_multiple_trials
  );
END;
$$ LANGUAGE plpgsql;

-- 6. Recrear función para verificar extensiones de trial excesivas
CREATE OR REPLACE FUNCTION check_excessive_trial_extensions()
RETURNS JSONB AS $$
DECLARE
  excessive_extensions JSONB;
  count_excessive INTEGER;
BEGIN
  -- Buscar suscripciones con más de 2 extensiones o más de 21 días totales
  WITH extension_counts AS (
    SELECT
      s.id,
      s.agency_id,
      s.trial_start,
      s.trial_end,
      COUNT(be.id) as extension_count,
      EXTRACT(DAY FROM (s.trial_end - s.trial_start))::INTEGER as total_days
    FROM subscriptions s
    LEFT JOIN billing_events be ON s.id = be.subscription_id
      AND be.event_type = 'TRIAL_EXTENDED_BY_ADMIN'
    WHERE s.status = 'TRIAL'
      AND s.trial_start IS NOT NULL
      AND s.trial_end IS NOT NULL
    GROUP BY s.id, s.agency_id, s.trial_start, s.trial_end
    HAVING COUNT(be.id) > 2
       OR EXTRACT(DAY FROM (s.trial_end - s.trial_start))::INTEGER > 21
  )
  SELECT
    jsonb_agg(
      jsonb_build_object(
        'subscription_id', ec.id,
        'agency_id', ec.agency_id,
        'extension_count', ec.extension_count,
        'total_days', ec.total_days,
        'trial_start', ec.trial_start,
        'trial_end', ec.trial_end
      )
    ),
    COUNT(*)
  INTO excessive_extensions, count_excessive
  FROM extension_counts ec;

  -- Marcar resultados anteriores de este tipo como no-latest
  UPDATE integrity_check_results
  SET is_latest = false
  WHERE check_type = 'EXCESSIVE_TRIAL_EXTENSIONS';

  -- Registrar resultado nuevo
  INSERT INTO integrity_check_results (
    check_type,
    status,
    description,
    affected_entities,
    metadata,
    is_latest
  ) VALUES (
    'EXCESSIVE_TRIAL_EXTENSIONS',
    CASE WHEN count_excessive > 0 THEN 'WARNING' ELSE 'PASS' END,
    format('Encontradas %s suscripciones con extensiones de trial excesivas', count_excessive),
    excessive_extensions,
    jsonb_build_object('count', count_excessive),
    true
  );

  RETURN jsonb_build_object(
    'status', CASE WHEN count_excessive > 0 THEN 'WARNING' ELSE 'PASS' END,
    'count', count_excessive,
    'subscriptions', excessive_extensions
  );
END;
$$ LANGUAGE plpgsql;

-- 7. Recrear función para verificar inconsistencias en usage_metrics
CREATE OR REPLACE FUNCTION check_usage_metrics_integrity()
RETURNS JSONB AS $$
DECLARE
  inconsistencies JSONB;
  count_inconsistent INTEGER;
BEGIN
  -- Verificar que los contadores no sean negativos
  SELECT
    jsonb_agg(
      jsonb_build_object(
        'agency_id', um.agency_id,
        'period_start', um.period_start,
        'operations_count', um.operations_count,
        'users_count', um.users_count,
        'integrations_count', um.integrations_count
      )
    ),
    COUNT(*)
  INTO inconsistencies, count_inconsistent
  FROM usage_metrics um
  WHERE um.operations_count < 0
     OR um.users_count < 0
     OR um.integrations_count < 0;

  -- Marcar resultados anteriores de este tipo como no-latest
  UPDATE integrity_check_results
  SET is_latest = false
  WHERE check_type = 'USAGE_METRICS_NEGATIVE';

  -- Registrar resultado nuevo
  INSERT INTO integrity_check_results (
    check_type,
    status,
    description,
    affected_entities,
    metadata,
    is_latest
  ) VALUES (
    'USAGE_METRICS_NEGATIVE',
    CASE WHEN count_inconsistent > 0 THEN 'FAIL' ELSE 'PASS' END,
    format('Encontrados %s registros de usage_metrics con contadores negativos', count_inconsistent),
    inconsistencies,
    jsonb_build_object('count', count_inconsistent),
    true
  );

  RETURN jsonb_build_object(
    'status', CASE WHEN count_inconsistent > 0 THEN 'FAIL' ELSE 'PASS' END,
    'count', count_inconsistent,
    'metrics', inconsistencies
  );
END;
$$ LANGUAGE plpgsql;

-- 8. Comentarios
COMMENT ON COLUMN integrity_check_results.is_latest IS 'Marca si este es el resultado más reciente para este check_type';
