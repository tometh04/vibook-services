-- =====================================================
-- MIGRACIÓN 008: Crear plan TESTER
-- =====================================================
-- Plan especial para testing que permite acceso completo sin pago

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
  is_active,
  sort_order
) VALUES (
  'TESTER',
  'Tester',
  'Plan especial para testing - acceso completo sin pago',
  0,
  0,
  NULL, -- Ilimitado
  NULL, -- Ilimitado
  NULL, -- Ilimitado
  NULL, -- Ilimitado
  NULL, -- Ilimitado
  '{"trello": true, "manychat": true, "emilia": true, "whatsapp": true, "reports": true, "custom_integrations": true, "priority_support": true}'::jsonb,
  false, -- No aparece en pricing público
  true,
  0 -- Primero en orden
)
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  features = EXCLUDED.features,
  is_active = true;
