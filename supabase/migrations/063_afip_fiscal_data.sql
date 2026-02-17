-- Agregar datos fiscales del emisor a afip_config
-- Estos datos se usan en el PDF de la factura y deben coincidir con ARCA/AFIP

ALTER TABLE afip_config ADD COLUMN IF NOT EXISTS razon_social TEXT;
ALTER TABLE afip_config ADD COLUMN IF NOT EXISTS domicilio_comercial TEXT;
ALTER TABLE afip_config ADD COLUMN IF NOT EXISTS condicion_iva TEXT DEFAULT 'Monotributo';
ALTER TABLE afip_config ADD COLUMN IF NOT EXISTS inicio_actividades TEXT;
