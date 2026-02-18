-- Expand financial_settings table with new columns expected by the API route
ALTER TABLE financial_settings
  ADD COLUMN IF NOT EXISTS primary_currency TEXT DEFAULT 'ARS',
  ADD COLUMN IF NOT EXISTS enabled_currencies TEXT[] DEFAULT ARRAY['ARS', 'USD'],
  ADD COLUMN IF NOT EXISTS exchange_rate_config JSONB DEFAULT '{"source": "manual", "auto_update": false}'::jsonb,
  ADD COLUMN IF NOT EXISTS default_usd_rate NUMERIC(18,4) DEFAULT 1000.00,
  ADD COLUMN IF NOT EXISTS default_accounts JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS auto_create_accounts BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS enabled_payment_methods TEXT[] DEFAULT ARRAY['CASH', 'BANK', 'MP'],
  ADD COLUMN IF NOT EXISTS auto_create_ledger_entries BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS auto_create_iva_entries BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS auto_create_operator_payments BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS default_income_chart_account_id UUID,
  ADD COLUMN IF NOT EXISTS default_expense_chart_account_id UUID,
  ADD COLUMN IF NOT EXISTS auto_generate_invoices BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS default_point_of_sale INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS monthly_close_day INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS auto_close_month BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;
