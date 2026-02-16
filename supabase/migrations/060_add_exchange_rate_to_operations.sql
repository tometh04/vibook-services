-- Migration 060: Add exchange_rate column to operations table
-- Allows storing the USD/ARS exchange rate per-operation instead of relying on a global rate
-- NULL means no conversion needed (all amounts are in USD)

ALTER TABLE operations ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC(18,4) DEFAULT NULL;

COMMENT ON COLUMN operations.exchange_rate IS 'Tipo de cambio USD/ARS usado al momento de crear la operación. NULL si no hay moneda ARS involucrada.';
