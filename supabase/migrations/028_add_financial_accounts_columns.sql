-- Migración 028: Agregar columnas faltantes a financial_accounts
-- Agrega columnas para cuentas bancarias, tarjetas de crédito y activos

-- Agregar columnas para cuentas bancarias
ALTER TABLE financial_accounts
ADD COLUMN IF NOT EXISTS account_number TEXT,
ADD COLUMN IF NOT EXISTS bank_name TEXT;

-- Agregar columnas para tarjetas de crédito
ALTER TABLE financial_accounts
ADD COLUMN IF NOT EXISTS card_number TEXT,
ADD COLUMN IF NOT EXISTS card_holder TEXT,
ADD COLUMN IF NOT EXISTS card_expiry_date DATE;

-- Agregar columnas para activos
ALTER TABLE financial_accounts
ADD COLUMN IF NOT EXISTS asset_type TEXT,
ADD COLUMN IF NOT EXISTS asset_description TEXT,
ADD COLUMN IF NOT EXISTS asset_quantity NUMERIC(18,2);

-- Actualizar el constraint de tipo para permitir los nuevos tipos
ALTER TABLE financial_accounts
DROP CONSTRAINT IF EXISTS financial_accounts_type_check;

ALTER TABLE financial_accounts
ADD CONSTRAINT financial_accounts_type_check 
CHECK (type IN (
  'CASH', 
  'BANK', 
  'MP', 
  'USD', 
  'OTHER',
  'SAVINGS_ARS',
  'SAVINGS_USD',
  'CHECKING_ARS',
  'CHECKING_USD',
  'CASH_ARS',
  'CASH_USD',
  'CREDIT_CARD',
  'ASSETS'
));
