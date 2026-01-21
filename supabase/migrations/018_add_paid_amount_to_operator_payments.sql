-- Migración: Agregar campo paid_amount a operator_payments
-- Fecha: 2025-01-21
-- Descripción: Permite registrar pagos parciales a operadores

-- Agregar columna paid_amount si no existe
ALTER TABLE operator_payments
ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(18,2) NOT NULL DEFAULT 0;

-- Comentario para documentación
COMMENT ON COLUMN operator_payments.paid_amount IS 'Monto pagado hasta el momento (para pagos parciales)';

-- Actualizar registros existentes: si status = PAID, paid_amount = amount
UPDATE operator_payments 
SET paid_amount = amount 
WHERE status = 'PAID' AND paid_amount = 0;
