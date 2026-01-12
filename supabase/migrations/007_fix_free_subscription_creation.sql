-- =====================================================
-- MIGRACIÓN 007: Corregir creación de suscripción FREE
-- =====================================================
-- Cambia la creación automática de suscripción FREE
-- para que NO permita acceso sin completar el pago

CREATE OR REPLACE FUNCTION create_free_subscription_for_agency()
RETURNS TRIGGER AS $$
DECLARE
  free_plan_id UUID;
BEGIN
  -- Obtener el ID del plan FREE
  SELECT id INTO free_plan_id FROM subscription_plans WHERE name = 'FREE' LIMIT 1;
  
  IF free_plan_id IS NOT NULL THEN
    -- Crear suscripción FREE con status UNPAID (bloquea acceso hasta completar pago)
    -- El usuario debe ir al paywall y elegir un plan de pago
    INSERT INTO subscriptions (
      agency_id,
      plan_id,
      status,
      current_period_start,
      current_period_end,
      billing_cycle
    ) VALUES (
      NEW.id,
      free_plan_id,
      'UNPAID', -- Bloquea acceso hasta que elija un plan de pago
      NOW(),
      NOW() + INTERVAL '1 day', -- Período mínimo
      'MONTHLY'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- El trigger ya existe, solo actualizamos la función
