-- Migración: Agregar tipo de cambio y monto USD a pagos
-- Fecha: 2025-01-21
-- Descripción: Sistema de pagos con tipo de cambio obligatorio para ARS

-- Agregar columnas de tipo de cambio
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC(18,4),
ADD COLUMN IF NOT EXISTS amount_usd NUMERIC(18,2);

-- Comentarios para documentación
COMMENT ON COLUMN payments.exchange_rate IS 'Tipo de cambio ARS/USD usado al momento del pago';
COMMENT ON COLUMN payments.amount_usd IS 'Monto equivalente en USD (calculado automáticamente)';

-- Índice para búsquedas por monto USD
CREATE INDEX IF NOT EXISTS idx_payments_amount_usd 
  ON payments(amount_usd) 
  WHERE amount_usd IS NOT NULL;

-- Actualizar pagos existentes en USD: amount_usd = amount
UPDATE payments 
SET amount_usd = amount 
WHERE currency = 'USD' AND amount_usd IS NULL;
