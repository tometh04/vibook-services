-- =====================================================
-- MIGRACIÓN 006: Actualizar período de prueba a 7 días
-- =====================================================
-- Cambia el período de prueba automático de 30 a 7 días
-- para nuevas agencias

CREATE OR REPLACE FUNCTION create_free_subscription_for_agency()
RETURNS TRIGGER AS $$
DECLARE
  free_plan_id UUID;
BEGIN
  -- Obtener el ID del plan FREE
  SELECT id INTO free_plan_id FROM subscription_plans WHERE name = 'FREE' LIMIT 1;
  
  IF free_plan_id IS NOT NULL THEN
    -- Crear suscripción FREE con trial de 7 días (actualizado desde 30 días)
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
      NOW() + INTERVAL '7 days', -- Trial de 7 días
      NOW(),
      NOW() + INTERVAL '7 days', -- Trial de 7 días
      'MONTHLY'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- El trigger ya existe, no es necesario crearlo de nuevo.
-- Si se ejecuta esta migración después de 005, la función se sobrescribirá.
