-- =====================================================
-- MIGRACIÓN 031: Tracking de Intentos de Pago
-- =====================================================
-- Agregar campo para trackear intentos de pago fallidos
-- Después de 3 intentos consecutivos, marcar como PAST_DUE

-- 1. Agregar campo payment_attempts a subscriptions
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS payment_attempts INTEGER DEFAULT 0;

-- 2. Agregar campo last_payment_attempt a subscriptions
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS last_payment_attempt TIMESTAMP WITH TIME ZONE;

-- 3. Agregar campo payment_attempts_reset_date a subscriptions
-- Para resetear intentos cuando hay un pago exitoso
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS payment_attempts_reset_date TIMESTAMP WITH TIME ZONE;

-- 4. Función para incrementar intentos de pago
CREATE OR REPLACE FUNCTION increment_payment_attempt(subscription_id_param UUID)
RETURNS VOID AS $$
DECLARE
  current_attempts INTEGER;
  max_attempts INTEGER;
BEGIN
  -- Obtener configuración de intentos máximos
  SELECT COALESCE((SELECT value::INTEGER FROM system_config WHERE key = 'payment_retry_attempts'), 3) INTO max_attempts;
  
  -- Obtener intentos actuales
  SELECT payment_attempts INTO current_attempts
  FROM subscriptions
  WHERE id = subscription_id_param;
  
  -- Incrementar intentos
  UPDATE subscriptions
  SET 
    payment_attempts = COALESCE(current_attempts, 0) + 1,
    last_payment_attempt = NOW(),
    updated_at = NOW()
  WHERE id = subscription_id_param;
  
  -- Si alcanzó el máximo, marcar como PAST_DUE
  IF COALESCE(current_attempts, 0) + 1 >= max_attempts THEN
    UPDATE subscriptions
    SET 
      status = 'PAST_DUE',
      updated_at = NOW()
    WHERE id = subscription_id_param;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 5. Función para resetear intentos (cuando hay pago exitoso)
CREATE OR REPLACE FUNCTION reset_payment_attempts(subscription_id_param UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE subscriptions
  SET 
    payment_attempts = 0,
    payment_attempts_reset_date = NOW(),
    updated_at = NOW()
  WHERE id = subscription_id_param;
END;
$$ LANGUAGE plpgsql;

-- 6. Índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_subscriptions_payment_attempts ON subscriptions(payment_attempts);
CREATE INDEX IF NOT EXISTS idx_subscriptions_last_payment_attempt ON subscriptions(last_payment_attempt);
