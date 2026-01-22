-- Migración 027: Hacer account_id obligatorio en payments
-- Requiere que todos los pagos (ingresos y egresos) estén asociados a una cuenta financiera

-- Primero, actualizar pagos existentes sin account_id asignándoles una cuenta por defecto
-- basada en su dirección y tipo de pagador
DO $$
DECLARE
  default_income_account_id UUID;
  default_expense_account_id UUID;
  default_operator_payment_account_id UUID;
BEGIN
  -- Obtener o crear cuenta por defecto para INCOME (Ventas de Viajes - 4.1.01)
  SELECT id INTO default_income_account_id
  FROM financial_accounts
  WHERE chart_account_id IN (
    SELECT id FROM chart_of_accounts WHERE account_code = '4.1.01' AND is_active = true
  )
  AND is_active = true
  LIMIT 1;

  -- Si no existe, crear una cuenta por defecto para ingresos
  IF default_income_account_id IS NULL THEN
    INSERT INTO financial_accounts (name, type, currency, initial_balance, is_active, created_at)
    VALUES ('Ventas de Viajes (Default)', 'CASH_ARS', 'ARS', 0, true, NOW())
    RETURNING id INTO default_income_account_id;
  END IF;

  -- Obtener o crear cuenta por defecto para EXPENSE general (Gastos Administrativos - 4.3.01)
  SELECT id INTO default_expense_account_id
  FROM financial_accounts
  WHERE chart_account_id IN (
    SELECT id FROM chart_of_accounts WHERE account_code = '4.3.01' AND is_active = true
  )
  AND is_active = true
  LIMIT 1;

  IF default_expense_account_id IS NULL THEN
    INSERT INTO financial_accounts (name, type, currency, initial_balance, is_active, created_at)
    VALUES ('Gastos Administrativos (Default)', 'CASH_ARS', 'ARS', 0, true, NOW())
    RETURNING id INTO default_expense_account_id;
  END IF;

  -- Obtener o crear cuenta por defecto para pagos a operadores (Costos - 4.2.01)
  SELECT id INTO default_operator_payment_account_id
  FROM financial_accounts
  WHERE chart_account_id IN (
    SELECT id FROM chart_of_accounts WHERE account_code = '4.2.01' AND is_active = true
  )
  AND is_active = true
  LIMIT 1;

  IF default_operator_payment_account_id IS NULL THEN
    INSERT INTO financial_accounts (name, type, currency, initial_balance, is_active, created_at)
    VALUES ('Costo de Operadores (Default)', 'CASH_ARS', 'ARS', 0, true, NOW())
    RETURNING id INTO default_operator_payment_account_id;
  END IF;

  -- Actualizar pagos INCOME sin account_id
  UPDATE payments
  SET account_id = default_income_account_id
  WHERE account_id IS NULL AND direction = 'INCOME';

  -- Actualizar pagos EXPENSE a operadores sin account_id
  UPDATE payments
  SET account_id = default_operator_payment_account_id
  WHERE account_id IS NULL AND direction = 'EXPENSE' AND payer_type = 'OPERATOR';

  -- Actualizar otros pagos EXPENSE sin account_id
  UPDATE payments
  SET account_id = default_expense_account_id
  WHERE account_id IS NULL AND direction = 'EXPENSE';

  RAISE NOTICE 'Pagos actualizados: INCOME -> %, OPERATOR EXPENSE -> %, OTHER EXPENSE -> %', 
    default_income_account_id, default_operator_payment_account_id, default_expense_account_id;
END $$;

-- Agregar constraint NOT NULL a account_id
ALTER TABLE payments
  ALTER COLUMN account_id SET NOT NULL;

-- Agregar foreign key constraint si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'payments_account_id_fkey'
  ) THEN
    ALTER TABLE payments
      ADD CONSTRAINT payments_account_id_fkey 
      FOREIGN KEY (account_id) 
      REFERENCES financial_accounts(id) 
      ON DELETE RESTRICT;
  END IF;
END $$;

-- Agregar comentario
COMMENT ON COLUMN payments.account_id IS 'Cuenta financiera asociada al pago. Obligatorio para todos los pagos (ingresos y egresos).';
