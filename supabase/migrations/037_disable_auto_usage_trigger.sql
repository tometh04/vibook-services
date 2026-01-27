-- =====================================================
-- MIGRACIÓN 037: Deshabilitar Trigger Automático de Usage Metrics
-- =====================================================
-- Ahora usamos función atómica check_and_increment_operation_limit
-- que verifica e incrementa en una sola transacción

-- Deshabilitar trigger automático (ya no necesario, se incrementa en la función atómica)
DROP TRIGGER IF EXISTS update_usage_on_operation_creation ON operations;

-- Mantener la función por si se necesita en el futuro, pero no se usará automáticamente
-- La función update_usage_metrics() sigue existiendo pero no se ejecuta automáticamente

COMMENT ON FUNCTION update_usage_metrics() IS 'Función legacy - ya no se usa automáticamente. Se usa check_and_increment_operation_limit() en su lugar para transacciones atómicas.';
