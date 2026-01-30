-- Migración: Hacer afip_config multi-tenant (por agencia)
-- Agrega agency_id y automation_status, elimina access_token

-- Agregar columna agency_id
ALTER TABLE afip_config ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES agencies(id);

-- Agregar estado de automatización
ALTER TABLE afip_config ADD COLUMN IF NOT EXISTS automation_status VARCHAR(20) DEFAULT 'pending'
  CHECK (automation_status IN ('pending', 'complete', 'failed'));

-- Eliminar access_token (ahora se usa AFIP_SDK_API_KEY como env var global)
ALTER TABLE afip_config DROP COLUMN IF EXISTS access_token;

-- Índice único: una sola config activa por agencia
CREATE UNIQUE INDEX IF NOT EXISTS idx_afip_config_agency_active
  ON afip_config(agency_id) WHERE is_active = true;

-- Actualizar timestamp trigger
CREATE OR REPLACE FUNCTION update_afip_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_afip_config_updated_at ON afip_config;
CREATE TRIGGER trigger_update_afip_config_updated_at
  BEFORE UPDATE ON afip_config
  FOR EACH ROW
  EXECUTE FUNCTION update_afip_config_updated_at();
