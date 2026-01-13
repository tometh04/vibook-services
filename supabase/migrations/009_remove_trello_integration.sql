-- =====================================================
-- MIGRACIÓN 009: Eliminar integración Trello y convertir a CRM interno
-- =====================================================

-- 1. Actualizar leads.source: Trello y Manychat → CRM
UPDATE leads 
SET source = 'CRM' 
WHERE source IN ('Trello', 'Manychat');

-- 2. Actualizar el CHECK constraint en leads.source
-- Primero eliminar el constraint existente
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_source_check;

-- Crear nuevo constraint sin Trello y Manychat, agregando CRM
ALTER TABLE leads 
ADD CONSTRAINT leads_source_check 
CHECK (source IN ('Instagram', 'WhatsApp', 'Meta Ads', 'CRM', 'Website', 'Referral', 'Other'));

-- 3. Eliminar tabla settings_trello si existe
DROP TABLE IF EXISTS settings_trello CASCADE;

-- 4. Eliminar cualquier configuración de integración Trello de integration_configs
DELETE FROM integration_configs WHERE integration_type = 'TRELLO';

-- 5. Eliminar logs de integración Trello
DELETE FROM integration_logs 
WHERE integration_config_id IN (
  SELECT id FROM integration_configs WHERE integration_type = 'TRELLO'
);

-- Comentarios
COMMENT ON COLUMN leads.source IS 'Fuente del lead. CRM indica que viene del CRM interno del sistema.';
