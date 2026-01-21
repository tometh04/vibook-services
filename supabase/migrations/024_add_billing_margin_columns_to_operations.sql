-- Migración: Agregar billing_margin_amount y billing_margin_percentage a operations
-- Fecha: 2025-01-21
-- Descripción: La API inserta estos campos; la tabla solo tenía billing_margin (antiguo).
--              Sin estas columnas, POST /api/operations falla con 500.

ALTER TABLE operations ADD COLUMN IF NOT EXISTS billing_margin_amount NUMERIC;
ALTER TABLE operations ADD COLUMN IF NOT EXISTS billing_margin_percentage NUMERIC;

COMMENT ON COLUMN operations.billing_margin_amount IS 'Margen de facturación (monto). Por defecto igual a margin_amount, ajustable.';
COMMENT ON COLUMN operations.billing_margin_percentage IS 'Margen de facturación (porcentaje). Derivado de billing_margin_amount y sale_amount_total.';
