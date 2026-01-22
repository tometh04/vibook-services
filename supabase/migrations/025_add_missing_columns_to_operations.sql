-- Migración: Agregar todas las columnas faltantes a operations
-- Fecha: 2025-01-21
-- Descripción: El código inserta estas columnas pero no existen en el schema inicial.
--              Sin estas columnas, POST /api/operations falla con errores de schema.

-- seller_secondary_id: Vendedor secundario (opcional)
ALTER TABLE operations ADD COLUMN IF NOT EXISTS seller_secondary_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- product_type: Tipo de producto (AEREO, HOTEL, PAQUETE, CRUCERO, OTRO)
ALTER TABLE operations ADD COLUMN IF NOT EXISTS product_type TEXT CHECK (product_type IN ('AEREO', 'HOTEL', 'PAQUETE', 'CRUCERO', 'OTRO'));

-- checkin_date y checkout_date: Fechas de check-in/check-out para hoteles
ALTER TABLE operations ADD COLUMN IF NOT EXISTS checkin_date DATE;
ALTER TABLE operations ADD COLUMN IF NOT EXISTS checkout_date DATE;

-- passengers: Datos de pasajeros en formato JSONB
ALTER TABLE operations ADD COLUMN IF NOT EXISTS passengers JSONB;

-- sale_currency: Moneda de venta (ARS o USD)
ALTER TABLE operations ADD COLUMN IF NOT EXISTS sale_currency TEXT CHECK (sale_currency IN ('ARS', 'USD')) DEFAULT 'ARS';

-- operator_cost_currency: Moneda del costo de operador (ARS o USD)
ALTER TABLE operations ADD COLUMN IF NOT EXISTS operator_cost_currency TEXT CHECK (operator_cost_currency IN ('ARS', 'USD')) DEFAULT 'ARS';

-- file_code: Código de archivo generado automáticamente
ALTER TABLE operations ADD COLUMN IF NOT EXISTS file_code TEXT;

-- Comentarios para documentación
COMMENT ON COLUMN operations.seller_secondary_id IS 'Vendedor secundario asignado a la operación (opcional)';
COMMENT ON COLUMN operations.product_type IS 'Tipo de producto: AEREO, HOTEL, PAQUETE, CRUCERO, OTRO';
COMMENT ON COLUMN operations.checkin_date IS 'Fecha de check-in para hoteles';
COMMENT ON COLUMN operations.checkout_date IS 'Fecha de check-out para hoteles';
COMMENT ON COLUMN operations.passengers IS 'Datos de pasajeros en formato JSON';
COMMENT ON COLUMN operations.sale_currency IS 'Moneda de venta (ARS o USD)';
COMMENT ON COLUMN operations.operator_cost_currency IS 'Moneda del costo de operador (ARS o USD)';
COMMENT ON COLUMN operations.file_code IS 'Código de archivo generado automáticamente (ej: OP-2025-001)';

-- Hacer departure_date nullable si no lo es (para permitir operaciones sin fecha de salida cuando no es requerida)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'operations' 
        AND column_name = 'departure_date' 
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE operations ALTER COLUMN departure_date DROP NOT NULL;
    END IF;
END $$;

-- Índices para optimizar búsquedas
CREATE INDEX IF NOT EXISTS idx_operations_seller_secondary ON operations(seller_secondary_id) WHERE seller_secondary_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_operations_product_type ON operations(product_type) WHERE product_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_operations_file_code ON operations(file_code) WHERE file_code IS NOT NULL;
