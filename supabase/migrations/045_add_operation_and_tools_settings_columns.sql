-- Agregar columnas faltantes a operation_settings
ALTER TABLE operation_settings
  ADD COLUMN IF NOT EXISTS custom_statuses JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS workflows JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS auto_alerts JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS document_templates JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS default_status TEXT DEFAULT 'PRE_RESERVATION',
  ADD COLUMN IF NOT EXISTS require_destination BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS require_departure_date BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS require_customer BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS alert_payment_due_days INTEGER DEFAULT 30,
  ADD COLUMN IF NOT EXISTS alert_operator_payment_days INTEGER DEFAULT 30,
  ADD COLUMN IF NOT EXISTS alert_upcoming_trip_days INTEGER DEFAULT 7,
  ADD COLUMN IF NOT EXISTS auto_generate_quotation BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_generate_invoice BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS require_documents_before_confirmation BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_create_ledger_entry BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS auto_create_iva_entry BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS auto_create_operator_payment BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- Agregar columnas faltantes a tools_settings
ALTER TABLE tools_settings
  ADD COLUMN IF NOT EXISTS emilia_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS emilia_model TEXT DEFAULT 'gpt-4',
  ADD COLUMN IF NOT EXISTS emilia_temperature NUMERIC(3,2) DEFAULT 0.7,
  ADD COLUMN IF NOT EXISTS emilia_max_tokens INTEGER DEFAULT 2000,
  ADD COLUMN IF NOT EXISTS emilia_system_prompt TEXT,
  ADD COLUMN IF NOT EXISTS emilia_allowed_actions JSONB DEFAULT '["search", "summarize", "suggest"]'::jsonb,
  ADD COLUMN IF NOT EXISTS email_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS email_provider TEXT DEFAULT 'resend',
  ADD COLUMN IF NOT EXISTS email_from_name TEXT DEFAULT 'Vibook Gestión',
  ADD COLUMN IF NOT EXISTS email_from_address TEXT,
  ADD COLUMN IF NOT EXISTS email_reply_to TEXT,
  ADD COLUMN IF NOT EXISTS email_signature TEXT,
  ADD COLUMN IF NOT EXISTS email_templates JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS whatsapp_provider TEXT DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS whatsapp_api_key TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_default_country_code TEXT DEFAULT '+54',
  ADD COLUMN IF NOT EXISTS whatsapp_templates JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS notifications_sound BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS notifications_desktop BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS notifications_email_digest BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS notifications_digest_frequency TEXT DEFAULT 'daily',
  ADD COLUMN IF NOT EXISTS export_default_format TEXT DEFAULT 'xlsx',
  ADD COLUMN IF NOT EXISTS export_include_headers BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS export_date_format TEXT DEFAULT 'DD/MM/YYYY',
  ADD COLUMN IF NOT EXISTS export_currency_format TEXT DEFAULT 'symbol',
  ADD COLUMN IF NOT EXISTS export_logo_url TEXT,
  ADD COLUMN IF NOT EXISTS export_company_info JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS ui_theme TEXT DEFAULT 'system',
  ADD COLUMN IF NOT EXISTS ui_sidebar_collapsed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS ui_compact_mode BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS ui_show_tooltips BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS ui_default_currency_display TEXT DEFAULT 'ARS',
  ADD COLUMN IF NOT EXISTS ui_date_format TEXT DEFAULT 'DD/MM/YYYY',
  ADD COLUMN IF NOT EXISTS ui_time_format TEXT DEFAULT '24h',
  ADD COLUMN IF NOT EXISTS ui_language TEXT DEFAULT 'es',
  ADD COLUMN IF NOT EXISTS backups_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS backups_frequency TEXT DEFAULT 'weekly',
  ADD COLUMN IF NOT EXISTS backups_retention_days INTEGER DEFAULT 30,
  ADD COLUMN IF NOT EXISTS backups_include_attachments BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- Agregar constraints para valores válidos (solo si no existen)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_emilia_temperature'
  ) THEN
    ALTER TABLE tools_settings
      ADD CONSTRAINT check_emilia_temperature CHECK (emilia_temperature >= 0 AND emilia_temperature <= 2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_emilia_max_tokens'
  ) THEN
    ALTER TABLE tools_settings
      ADD CONSTRAINT check_emilia_max_tokens CHECK (emilia_max_tokens >= 100 AND emilia_max_tokens <= 8000);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_whatsapp_provider'
  ) THEN
    ALTER TABLE tools_settings
      ADD CONSTRAINT check_whatsapp_provider CHECK (whatsapp_provider IN ('manual', 'api', 'manychat'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_notifications_digest_frequency'
  ) THEN
    ALTER TABLE tools_settings
      ADD CONSTRAINT check_notifications_digest_frequency CHECK (notifications_digest_frequency IN ('daily', 'weekly', 'never'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_export_default_format'
  ) THEN
    ALTER TABLE tools_settings
      ADD CONSTRAINT check_export_default_format CHECK (export_default_format IN ('xlsx', 'csv', 'pdf'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_export_currency_format'
  ) THEN
    ALTER TABLE tools_settings
      ADD CONSTRAINT check_export_currency_format CHECK (export_currency_format IN ('symbol', 'code', 'both'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_ui_theme'
  ) THEN
    ALTER TABLE tools_settings
      ADD CONSTRAINT check_ui_theme CHECK (ui_theme IN ('light', 'dark', 'system'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_ui_time_format'
  ) THEN
    ALTER TABLE tools_settings
      ADD CONSTRAINT check_ui_time_format CHECK (ui_time_format IN ('12h', '24h'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_backups_frequency'
  ) THEN
    ALTER TABLE tools_settings
      ADD CONSTRAINT check_backups_frequency CHECK (backups_frequency IN ('daily', 'weekly', 'monthly'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_backups_retention_days'
  ) THEN
    ALTER TABLE tools_settings
      ADD CONSTRAINT check_backups_retention_days CHECK (backups_retention_days >= 1 AND backups_retention_days <= 365);
  END IF;
END $$;

COMMENT ON TABLE operation_settings IS 'Configuración de operaciones por agencia';
COMMENT ON TABLE tools_settings IS 'Configuración de herramientas por agencia';
