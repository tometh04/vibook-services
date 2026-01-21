-- Tabla de configuración AFIP SDK para facturación electrónica
-- TAREA 24: Integración AFIP SDK

CREATE TABLE IF NOT EXISTS afip_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cuit VARCHAR(11) NOT NULL,
  access_token TEXT NOT NULL,
  environment VARCHAR(20) DEFAULT 'sandbox' CHECK (environment IN ('sandbox', 'production')),
  punto_venta INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_afip_config_is_active ON afip_config(is_active);

-- Agregar campo invoice_cae a operations si no existe (para tracking de facturas emitidas)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'operations' AND column_name = 'invoice_cae'
    ) THEN
        ALTER TABLE operations ADD COLUMN invoice_cae VARCHAR(14);
        ALTER TABLE operations ADD COLUMN invoice_number VARCHAR(20);
        ALTER TABLE operations ADD COLUMN invoice_date DATE;
        
        COMMENT ON COLUMN operations.invoice_cae IS 'CAE de la factura electrónica emitida';
        COMMENT ON COLUMN operations.invoice_number IS 'Número de factura (ej: 0001-00000123)';
        COMMENT ON COLUMN operations.invoice_date IS 'Fecha de emisión de la factura';
    END IF;
END $$;

COMMENT ON TABLE afip_config IS 'Configuración de AFIP SDK para facturación electrónica';
