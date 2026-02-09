-- =====================================================
-- MIGRACIÓN 055: Trial post-checkout + precios actualizados
-- =====================================================
-- Objetivo:
-- 1) Deshabilitar trial automático al crear agencia (solo después de checkout)
-- 2) Establecer trial_days = 7
-- 3) Actualizar precios Starter/Pro y dejar Enterprise como "Contactanos"

-- 1) Deshabilitar suscripción automática al crear agencia
DROP TRIGGER IF EXISTS create_free_subscription_on_agency_creation ON agencies;
DROP FUNCTION IF EXISTS create_free_subscription_for_agency();

-- 2) Asegurar trial_days = 7 en system_config
INSERT INTO system_config (key, value, description, created_at, updated_at)
VALUES ('trial_days', '7', 'Dias de prueba gratuitos', NOW(), NOW())
ON CONFLICT (key)
DO UPDATE SET value = '7', updated_at = NOW();

-- 3) Actualizar plan STARTER
UPDATE subscription_plans
SET
  display_name = 'Starter',
  description = 'Perfecto para pequeñas agencias',
  price_monthly = 79990,
  mp_preapproval_amount = 79990,
  is_public = true,
  sort_order = 1
WHERE name = 'STARTER';

-- 4) Actualizar plan PRO
UPDATE subscription_plans
SET
  display_name = 'Pro',
  description = 'Para agencias en crecimiento',
  price_monthly = 99990,
  mp_preapproval_amount = 99990,
  is_public = true,
  sort_order = 2
WHERE name = 'PRO';

-- 5) Mostrar ENTERPRISE como contacto (sin checkout)
UPDATE subscription_plans
SET
  display_name = 'Enterprise',
  description = 'Contactanos para una solucion a medida',
  price_monthly = 0,
  mp_preapproval_amount = NULL,
  is_public = true,
  sort_order = 3
WHERE name = 'ENTERPRISE';

-- 6) Ocultar BUSINESS del pricing (si existe)
UPDATE subscription_plans
SET is_public = false
WHERE name = 'BUSINESS';

