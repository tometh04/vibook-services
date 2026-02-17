-- Guardar certificado y key privada generados por la automation de AFIP
ALTER TABLE afip_config ADD COLUMN IF NOT EXISTS afip_cert TEXT;
ALTER TABLE afip_config ADD COLUMN IF NOT EXISTS afip_key TEXT;
