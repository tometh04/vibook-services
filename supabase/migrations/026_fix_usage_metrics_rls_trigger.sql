-- Migración: Fix RLS en triggers que insertan en tablas con RLS
-- Fecha: 2025-01-21
-- Descripción: Los triggers fallan con RLS porque se ejecutan con el contexto del usuario.
--              Solución: usar SECURITY DEFINER para que los triggers ejecuten con permisos del propietario (bypass RLS).

-- 1. Fix update_usage_metrics() - usado cuando se crea una operación
CREATE OR REPLACE FUNCTION update_usage_metrics()
RETURNS TRIGGER
SECURITY DEFINER -- Ejecutar con permisos del propietario de la función (bypass RLS)
SET search_path = public
AS $$
DECLARE
  current_month_start DATE;
BEGIN
  -- Obtener el primer día del mes actual
  current_month_start := DATE_TRUNC('month', CURRENT_DATE)::DATE;
  
  -- Insertar o actualizar métricas del mes actual
  INSERT INTO usage_metrics (
    agency_id,
    period_start,
    period_end,
    operations_count
  )
  VALUES (
    NEW.agency_id,
    current_month_start,
    (current_month_start + INTERVAL '1 month - 1 day')::DATE,
    1
  )
  ON CONFLICT (agency_id, period_start)
  DO UPDATE SET
    operations_count = usage_metrics.operations_count + 1,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Fix create_free_subscription_for_agency() - usado cuando se crea una agencia
CREATE OR REPLACE FUNCTION create_free_subscription_for_agency()
RETURNS TRIGGER
SECURITY DEFINER -- Ejecutar con permisos del propietario de la función (bypass RLS)
SET search_path = public
AS $$
DECLARE
  free_plan_id UUID;
BEGIN
  -- Obtener el ID del plan FREE
  SELECT id INTO free_plan_id FROM subscription_plans WHERE name = 'FREE' LIMIT 1;
  
  IF free_plan_id IS NOT NULL THEN
    -- Crear suscripción FREE con trial de 14 días
    INSERT INTO subscriptions (
      agency_id,
      plan_id,
      status,
      current_period_start,
      current_period_end,
      trial_start,
      trial_end,
      billing_cycle
    ) VALUES (
      NEW.id,
      free_plan_id,
      'TRIAL',
      NOW(),
      NOW() + INTERVAL '14 days',
      NOW(),
      NOW() + INTERVAL '14 days',
      'MONTHLY'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Comentarios para documentación
COMMENT ON FUNCTION update_usage_metrics() IS 'Actualiza métricas de uso automáticamente cuando se crea una operación. Usa SECURITY DEFINER para bypass RLS.';
COMMENT ON FUNCTION create_free_subscription_for_agency() IS 'Crea suscripción FREE automáticamente cuando se crea una agencia. Usa SECURITY DEFINER para bypass RLS.';
