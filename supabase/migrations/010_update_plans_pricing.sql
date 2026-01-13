-- Migración para actualizar planes con nuevos precios y features
-- Starter: $79,000 - Todo menos Cerebro y Emilia
-- Pro: $129,000 - Todo del Starter + Cerebro y Emilia
-- Business: $399,000 - Todo del Pro + Marketing/Ads

-- Actualizar plan STARTER
UPDATE subscription_plans
SET 
  display_name = 'Starter',
  description = 'Perfecto para pequeñas agencias',
  price_monthly = 79000,
  mp_preapproval_amount = 79000,
  max_users = NULL, -- Ilimitado
  max_operations_per_month = NULL, -- Ilimitado
  max_integrations = NULL, -- Ilimitado
  features = '{
    "cerebro": false,
    "emilia": false,
    "whatsapp": true,
    "reports": true,
    "crm": true,
    "marketing_ads": false
  }'::jsonb,
  is_public = true,
  sort_order = 1
WHERE name = 'STARTER';

-- Actualizar plan PRO
UPDATE subscription_plans
SET 
  display_name = 'Pro',
  description = 'Para agencias en crecimiento',
  price_monthly = 129000,
  mp_preapproval_amount = 129000,
  max_users = NULL, -- Ilimitado
  max_operations_per_month = NULL, -- Ilimitado
  max_integrations = NULL, -- Ilimitado
  features = '{
    "cerebro": true,
    "emilia": true,
    "whatsapp": true,
    "reports": true,
    "crm": true,
    "marketing_ads": false
  }'::jsonb,
  is_public = true,
  sort_order = 2
WHERE name = 'PRO';

-- Crear o actualizar plan BUSINESS
INSERT INTO subscription_plans (
  name,
  display_name,
  description,
  price_monthly,
  mp_preapproval_amount,
  max_users,
  max_operations_per_month,
  max_integrations,
  max_storage_mb,
  max_api_calls_per_day,
  features,
  is_public,
  sort_order
) VALUES (
  'BUSINESS',
  'Business',
  'Solución completa para grandes agencias',
  399000,
  399000,
  NULL, -- Ilimitado
  NULL, -- Ilimitado
  NULL, -- Ilimitado
  NULL, -- Ilimitado
  NULL, -- Ilimitado
  '{
    "cerebro": true,
    "emilia": true,
    "whatsapp": true,
    "reports": true,
    "crm": true,
    "marketing_ads": true
  }'::jsonb,
  true,
  3
)
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  price_monthly = EXCLUDED.price_monthly,
  mp_preapproval_amount = EXCLUDED.mp_preapproval_amount,
  max_users = EXCLUDED.max_users,
  max_operations_per_month = EXCLUDED.max_operations_per_month,
  max_integrations = EXCLUDED.max_integrations,
  max_storage_mb = EXCLUDED.max_storage_mb,
  max_api_calls_per_day = EXCLUDED.max_api_calls_per_day,
  features = EXCLUDED.features,
  is_public = EXCLUDED.is_public,
  sort_order = EXCLUDED.sort_order;

-- Ocultar plan ENTERPRISE (ya no se usa)
UPDATE subscription_plans
SET is_public = false
WHERE name = 'ENTERPRISE';

-- Mantener plan FREE pero ocultarlo del pricing público
UPDATE subscription_plans
SET 
  is_public = false,
  features = '{
    "cerebro": false,
    "emilia": false,
    "whatsapp": false,
    "reports": false,
    "crm": false,
    "marketing_ads": false
  }'::jsonb
WHERE name = 'FREE';
