-- =====================================================
-- MIGRACIÓN 050: Deshabilitar suscripción automática al crear agencia
-- =====================================================
-- SaaS: el usuario debe pasar por el paywall y activar plan/trial manualmente.

-- Eliminar trigger de suscripción automática
DROP TRIGGER IF EXISTS create_free_subscription_on_agency_creation ON agencies;

-- Eliminar función asociada (para evitar reactivaciones accidentales)
DROP FUNCTION IF EXISTS create_free_subscription_for_agency();
