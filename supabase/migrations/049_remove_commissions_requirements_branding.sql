-- =====================================================
-- 049 - Remove commissions & requirements + expand branding
-- =====================================================

BEGIN;

-- Expand tenant_branding with new branding fields
ALTER TABLE tenant_branding
  ADD COLUMN IF NOT EXISTS app_name TEXT DEFAULT 'Vibook Gestión',
  ADD COLUMN IF NOT EXISTS logo_dark_url TEXT,
  ADD COLUMN IF NOT EXISTS palette_id TEXT DEFAULT 'vibook',
  ADD COLUMN IF NOT EXISTS email_from_name TEXT DEFAULT 'Vibook Gestión',
  ADD COLUMN IF NOT EXISTS email_from_address TEXT,
  ADD COLUMN IF NOT EXISTS support_phone TEXT,
  ADD COLUMN IF NOT EXISTS support_whatsapp TEXT,
  ADD COLUMN IF NOT EXISTS instagram_url TEXT,
  ADD COLUMN IF NOT EXISTS facebook_url TEXT,
  ADD COLUMN IF NOT EXISTS company_name TEXT,
  ADD COLUMN IF NOT EXISTS company_tax_id TEXT,
  ADD COLUMN IF NOT EXISTS company_address_line1 TEXT,
  ADD COLUMN IF NOT EXISTS company_address_line2 TEXT,
  ADD COLUMN IF NOT EXISTS company_city TEXT,
  ADD COLUMN IF NOT EXISTS company_state TEXT,
  ADD COLUMN IF NOT EXISTS company_postal_code TEXT,
  ADD COLUMN IF NOT EXISTS company_country TEXT,
  ADD COLUMN IF NOT EXISTS company_phone TEXT,
  ADD COLUMN IF NOT EXISTS company_email TEXT;

-- Backfill new branding fields from legacy columns
UPDATE tenant_branding
SET
  app_name = COALESCE(app_name, brand_name, 'Vibook Gestión'),
  email_from_name = COALESCE(email_from_name, brand_name, 'Vibook Gestión'),
  palette_id = COALESCE(palette_id, 'vibook'),
  instagram_url = COALESCE(instagram_url, social_instagram),
  facebook_url = COALESCE(facebook_url, social_facebook),
  support_whatsapp = COALESCE(support_whatsapp, social_whatsapp);

-- Remove commissions tables
DROP TABLE IF EXISTS commission_details CASCADE;
DROP TABLE IF EXISTS commissions CASCADE;
DROP TABLE IF EXISTS commission_schemes CASCADE;
DROP TABLE IF EXISTS commission_rules CASCADE;
DROP TABLE IF EXISTS commission_records CASCADE;

-- Remove commission fields
ALTER TABLE users DROP COLUMN IF EXISTS commission_percentage;
ALTER TABLE tariff_items DROP COLUMN IF EXISTS commission_percentage;

-- Remove destination requirements
DROP TABLE IF EXISTS destination_requirements CASCADE;

-- Normalize ledger movement types (remove COMMISSION)
UPDATE ledger_movements
SET type = 'EXPENSE',
    notes = CASE
      WHEN notes IS NULL OR notes = '' THEN 'Migrado desde COMMISSION'
      ELSE notes || ' | Migrado desde COMMISSION'
    END
WHERE type = 'COMMISSION';

ALTER TABLE ledger_movements DROP CONSTRAINT IF EXISTS ledger_movements_type_check;
ALTER TABLE ledger_movements
  ADD CONSTRAINT ledger_movements_type_check
  CHECK (type IN ('INCOME', 'EXPENSE', 'FX_GAIN', 'FX_LOSS', 'OPERATOR_PAYMENT', 'PARTNER_WITHDRAWAL'));

COMMIT;
