-- Agregar campo profit_percentage a partner_accounts para distribución de ganancias
-- TAREA 23: Sistema de Distribución de Ganancias a Socios

DO $$ 
BEGIN
    -- Agregar columna profit_percentage si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'partner_accounts' AND column_name = 'profit_percentage'
    ) THEN
        ALTER TABLE partner_accounts 
        ADD COLUMN profit_percentage NUMERIC(5,2) DEFAULT 0 CHECK (profit_percentage >= 0 AND profit_percentage <= 100);
        
        COMMENT ON COLUMN partner_accounts.profit_percentage IS 'Porcentaje de ganancias que le corresponde al socio (0-100)';
    END IF;
END $$;
