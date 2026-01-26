-- =====================================================
-- MIGRACIÓN 030: Tracking de Free Trial y Configuración
-- =====================================================
-- Agregar tracking para prevenir múltiples free trials
-- Agregar tabla de configuración para días de trial

-- 1. Agregar campo has_used_trial a agencies
ALTER TABLE agencies 
ADD COLUMN IF NOT EXISTS has_used_trial BOOLEAN DEFAULT false;

-- 2. Crear tabla de configuración del sistema
CREATE TABLE IF NOT EXISTS system_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Insertar configuración de días de trial (fácil de cambiar)
INSERT INTO system_config (key, value, description) 
VALUES ('trial_days', '7', 'Número de días del período de prueba gratuito')
ON CONFLICT (key) DO UPDATE SET 
  value = EXCLUDED.value,
  updated_at = NOW();

-- 4. Insertar configuración de días antes de eliminar datos
INSERT INTO system_config (key, value, description) 
VALUES ('data_deletion_days', '30', 'Días después de bloqueo antes de eliminar datos')
ON CONFLICT (key) DO UPDATE SET 
  value = EXCLUDED.value,
  updated_at = NOW();

-- 5. Insertar configuración de intentos de pago
INSERT INTO system_config (key, value, description) 
VALUES ('payment_retry_attempts', '3', 'Número de intentos de pago antes de marcar como PAST_DUE')
ON CONFLICT (key) DO UPDATE SET 
  value = EXCLUDED.value,
  updated_at = NOW();

-- 6. Función para obtener configuración
CREATE OR REPLACE FUNCTION get_system_config(config_key TEXT)
RETURNS TEXT AS $$
DECLARE
  config_value TEXT;
BEGIN
  SELECT value INTO config_value
  FROM system_config
  WHERE key = config_key;
  
  RETURN COALESCE(config_value, NULL);
END;
$$ LANGUAGE plpgsql;

-- 7. Función para actualizar configuración
CREATE OR REPLACE FUNCTION set_system_config(config_key TEXT, config_value TEXT)
RETURNS VOID AS $$
BEGIN
  INSERT INTO system_config (key, value)
  VALUES (config_key, config_value)
  ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- 8. Marcar agencias existentes que ya tuvieron trial
UPDATE agencies
SET has_used_trial = true
WHERE id IN (
  SELECT DISTINCT agency_id
  FROM subscriptions
  WHERE trial_end IS NOT NULL
    AND trial_end < NOW()
    AND status IN ('ACTIVE', 'CANCELED', 'SUSPENDED', 'PAST_DUE', 'UNPAID')
);

-- 9. Índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_agencies_has_used_trial ON agencies(has_used_trial);
CREATE INDEX IF NOT EXISTS idx_system_config_key ON system_config(key);
