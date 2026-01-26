-- =====================================================
-- MIGRACIÓN 032: Eliminación Automática de Datos y Reset Mensual
-- =====================================================
-- Eliminar datos después de 30 días bloqueado
-- Resetear límites mensualmente

-- 1. Función para eliminar datos de agencias bloqueadas por más de 30 días
CREATE OR REPLACE FUNCTION delete_blocked_agency_data()
RETURNS TABLE(deleted_agencies INTEGER, deleted_operations INTEGER, deleted_customers INTEGER, deleted_leads INTEGER) AS $$
DECLARE
  deletion_days INTEGER;
  cutoff_date TIMESTAMP WITH TIME ZONE;
  agency_ids UUID[];
  deleted_ops INTEGER := 0;
  deleted_custs INTEGER := 0;
  deleted_leads_count INTEGER := 0;
BEGIN
  -- Obtener configuración de días
  SELECT COALESCE((SELECT value::INTEGER FROM system_config WHERE key = 'data_deletion_days'), 30) INTO deletion_days;
  
  -- Calcular fecha de corte
  cutoff_date := NOW() - (deletion_days || ' days')::INTERVAL;
  
  -- Obtener agencias bloqueadas por más de X días
  SELECT ARRAY_AGG(id) INTO agency_ids
  FROM subscriptions
  WHERE status IN ('CANCELED', 'SUSPENDED', 'PAST_DUE', 'UNPAID')
    AND updated_at < cutoff_date
    AND agency_id IS NOT NULL;
  
  IF agency_ids IS NULL OR array_length(agency_ids, 1) = 0 THEN
    RETURN QUERY SELECT 0, 0, 0, 0;
    RETURN;
  END IF;
  
  -- Eliminar datos relacionados
  -- Operaciones
  DELETE FROM operations WHERE agency_id = ANY(agency_ids);
  GET DIAGNOSTICS deleted_ops = ROW_COUNT;
  
  -- Clientes
  DELETE FROM customers WHERE agency_id = ANY(agency_ids);
  GET DIAGNOSTICS deleted_custs = ROW_COUNT;
  
  -- Leads
  DELETE FROM leads WHERE agency_id = ANY(agency_ids);
  GET DIAGNOSTICS deleted_leads_count = ROW_COUNT;
  
  -- Eliminar suscripciones
  DELETE FROM subscriptions WHERE id = ANY(
    SELECT id FROM subscriptions WHERE agency_id = ANY(agency_ids)
  );
  
  -- Eliminar agencias
  DELETE FROM agencies WHERE id = ANY(agency_ids);
  
  RETURN QUERY SELECT array_length(agency_ids, 1)::INTEGER, deleted_ops, deleted_custs, deleted_leads_count;
END;
$$ LANGUAGE plpgsql;

-- 2. Función para resetear límites mensualmente
CREATE OR REPLACE FUNCTION reset_monthly_usage_limits()
RETURNS VOID AS $$
DECLARE
  current_month_start DATE;
  previous_month_start DATE;
BEGIN
  -- Obtener primer día del mes actual
  current_month_start := DATE_TRUNC('month', CURRENT_DATE)::DATE;
  
  -- Obtener primer día del mes anterior
  previous_month_start := DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')::DATE;
  
  -- Crear métricas del mes actual para todas las agencias activas si no existen
  INSERT INTO usage_metrics (agency_id, period_start, period_end, operations_count, users_count, integrations_count, api_calls_count, storage_bytes)
  SELECT 
    s.agency_id,
    current_month_start,
    (current_month_start + INTERVAL '1 month - 1 day')::DATE,
    0, 0, 0, 0, 0
  FROM subscriptions s
  WHERE s.status IN ('ACTIVE', 'TRIAL')
    AND s.agency_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM usage_metrics um
      WHERE um.agency_id = s.agency_id
        AND um.period_start = current_month_start
    )
  ON CONFLICT (agency_id, period_start) DO NOTHING;
  
  -- Los límites se resetean automáticamente porque cada mes tiene su propio registro en usage_metrics
  -- Al crear el nuevo registro del mes, los contadores empiezan en 0
END;
$$ LANGUAGE plpgsql;

-- 3. Función para verificar y eliminar datos (ejecutar manualmente o con cron)
-- Esta función puede ser llamada por un cron job o manualmente desde admin
CREATE OR REPLACE FUNCTION cleanup_blocked_agencies()
RETURNS JSONB AS $$
DECLARE
  result RECORD;
  summary JSONB;
BEGIN
  SELECT * INTO result FROM delete_blocked_agency_data();
  
  summary := jsonb_build_object(
    'deleted_agencies', result.deleted_agencies,
    'deleted_operations', result.deleted_operations,
    'deleted_customers', result.deleted_customers,
    'deleted_leads', result.deleted_leads,
    'executed_at', NOW()
  );
  
  RETURN summary;
END;
$$ LANGUAGE plpgsql;

-- 4. Índice para búsquedas rápidas de agencias bloqueadas
CREATE INDEX IF NOT EXISTS idx_subscriptions_status_updated ON subscriptions(status, updated_at) 
WHERE status IN ('CANCELED', 'SUSPENDED', 'PAST_DUE', 'UNPAID');
