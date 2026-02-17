-- Agregar columnas para guardar IDs de automations del SDK de AFIP
-- Permite hacer polling asíncrono del estado de las automations

-- Expandir CHECK constraint de automation_status para incluir 'running'
ALTER TABLE afip_config DROP CONSTRAINT IF EXISTS afip_config_automation_status_check;
ALTER TABLE afip_config ADD CONSTRAINT afip_config_automation_status_check
  CHECK (automation_status IN ('pending', 'running', 'complete', 'failed'));

-- IDs de las automations lanzadas
ALTER TABLE afip_config ADD COLUMN IF NOT EXISTS cert_automation_id TEXT;
ALTER TABLE afip_config ADD COLUMN IF NOT EXISTS wsfe_automation_id TEXT;
