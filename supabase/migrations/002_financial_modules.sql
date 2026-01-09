-- =====================================================
-- VIBOOK GESTIÓN - SCHEMA CONSOLIDADO PARTE 2
-- Módulos: Contabilidad, Cajas, Comisiones, Facturación
-- =====================================================

-- =====================================================
-- 11. CUENTAS FINANCIERAS
-- =====================================================

CREATE TABLE IF NOT EXISTS financial_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('CASH', 'BANK', 'MP', 'USD', 'OTHER')),
  currency TEXT NOT NULL CHECK (currency IN ('ARS', 'USD')),
  initial_balance NUMERIC(18,2) NOT NULL DEFAULT 0,
  current_balance NUMERIC(18,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  chart_account_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- =====================================================
-- 12. MOVIMIENTOS CONTABLES (LEDGER)
-- =====================================================

CREATE TABLE IF NOT EXISTS ledger_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
  operation_id UUID REFERENCES operations(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('INCOME', 'EXPENSE', 'FX_GAIN', 'FX_LOSS', 'COMMISSION', 'OPERATOR_PAYMENT', 'PARTNER_WITHDRAWAL')),
  concept TEXT NOT NULL,
  notes TEXT,
  currency TEXT NOT NULL CHECK (currency IN ('ARS', 'USD')),
  amount_original NUMERIC(18,2) NOT NULL,
  exchange_rate NUMERIC(18,4),
  amount_ars_equivalent NUMERIC(18,2) NOT NULL,
  method TEXT NOT NULL CHECK (method IN ('CASH', 'BANK', 'MP', 'USD', 'OTHER')),
  account_id UUID REFERENCES financial_accounts(id) ON DELETE RESTRICT,
  seller_id UUID REFERENCES users(id) ON DELETE SET NULL,
  operator_id UUID REFERENCES operators(id) ON DELETE SET NULL,
  receipt_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- =====================================================
-- 13. MOVIMIENTOS DE CAJA
-- =====================================================

CREATE TABLE IF NOT EXISTS cash_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
  operation_id UUID REFERENCES operations(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  type TEXT NOT NULL CHECK (type IN ('INCOME', 'EXPENSE')),
  category TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'ARS',
  movement_date TIMESTAMP WITH TIME ZONE NOT NULL,
  notes TEXT,
  is_touristic BOOLEAN DEFAULT true,
  cash_box_id UUID,
  account_id UUID REFERENCES financial_accounts(id),
  ledger_movement_id UUID REFERENCES ledger_movements(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 14. CAJAS MÚLTIPLES
-- =====================================================

CREATE TABLE IF NOT EXISTS cash_boxes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  box_type TEXT NOT NULL DEFAULT 'MAIN' CHECK (box_type IN ('MAIN', 'PETTY', 'USD', 'BANK', 'OTHER')),
  currency TEXT NOT NULL DEFAULT 'ARS' CHECK (currency IN ('ARS', 'USD')),
  initial_balance NUMERIC(18,2) DEFAULT 0,
  current_balance NUMERIC(18,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

ALTER TABLE cash_movements ADD COLUMN IF NOT EXISTS cash_box_id UUID REFERENCES cash_boxes(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS cash_transfers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_box_id UUID NOT NULL REFERENCES cash_boxes(id) ON DELETE RESTRICT,
  to_box_id UUID NOT NULL REFERENCES cash_boxes(id) ON DELETE RESTRICT,
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  amount NUMERIC(18,2) NOT NULL,
  currency TEXT NOT NULL CHECK (currency IN ('ARS', 'USD')),
  exchange_rate NUMERIC(18,4),
  transfer_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COMPLETED', 'CANCELLED')),
  reference TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT
);

-- Función para calcular balance actual de una caja
CREATE OR REPLACE FUNCTION calculate_cash_box_balance(box_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  initial NUMERIC;
  income NUMERIC;
  expense NUMERIC;
  transfers_out NUMERIC;
  transfers_in NUMERIC;
BEGIN
  SELECT COALESCE(initial_balance, 0) INTO initial
  FROM cash_boxes
  WHERE id = box_id;
  
  SELECT COALESCE(SUM(amount), 0) INTO income
  FROM cash_movements
  WHERE cash_box_id = box_id
    AND type = 'INCOME';
  
  SELECT COALESCE(SUM(amount), 0) INTO expense
  FROM cash_movements
  WHERE cash_box_id = box_id
    AND type = 'EXPENSE';
  
  SELECT COALESCE(SUM(amount), 0) INTO transfers_out
  FROM cash_transfers
  WHERE from_box_id = box_id
    AND status = 'COMPLETED';
  
  SELECT COALESCE(SUM(amount), 0) INTO transfers_in
  FROM cash_transfers
  WHERE to_box_id = box_id
    AND status = 'COMPLETED';
  
  RETURN initial + income - expense - transfers_out + transfers_in;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar balance cuando hay cambios en movimientos
CREATE OR REPLACE FUNCTION update_cash_box_balance()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    IF NEW.cash_box_id IS NOT NULL THEN
      UPDATE cash_boxes
      SET current_balance = calculate_cash_box_balance(NEW.cash_box_id)
      WHERE id = NEW.cash_box_id;
    END IF;
  END IF;
  
  IF TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN
    IF OLD.cash_box_id IS NOT NULL AND (TG_OP = 'DELETE' OR OLD.cash_box_id != NEW.cash_box_id) THEN
      UPDATE cash_boxes
      SET current_balance = calculate_cash_box_balance(OLD.cash_box_id)
      WHERE id = OLD.cash_box_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_cash_box_balance
  AFTER INSERT OR UPDATE OR DELETE ON cash_movements
  FOR EACH ROW
  EXECUTE FUNCTION update_cash_box_balance();

-- Trigger para actualizar balances cuando hay transferencias
CREATE OR REPLACE FUNCTION update_cash_box_balance_on_transfer()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.status = 'COMPLETED') THEN
    UPDATE cash_boxes
    SET current_balance = calculate_cash_box_balance(NEW.from_box_id)
    WHERE id = NEW.from_box_id;
    
    UPDATE cash_boxes
    SET current_balance = calculate_cash_box_balance(NEW.to_box_id)
    WHERE id = NEW.to_box_id;
  END IF;
  
  IF TG_OP = 'UPDATE' AND OLD.status = 'COMPLETED' AND NEW.status != 'COMPLETED' THEN
    UPDATE cash_boxes
    SET current_balance = calculate_cash_box_balance(OLD.from_box_id)
    WHERE id = OLD.from_box_id;
    
    UPDATE cash_boxes
    SET current_balance = calculate_cash_box_balance(OLD.to_box_id)
    WHERE id = OLD.to_box_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_cash_box_balance_on_transfer
  AFTER INSERT OR UPDATE ON cash_transfers
  FOR EACH ROW
  EXECUTE FUNCTION update_cash_box_balance_on_transfer();

-- =====================================================
-- 15. IVA (VENTAS Y COMPRAS)
-- =====================================================

CREATE TABLE IF NOT EXISTS iva_sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  operation_id UUID NOT NULL REFERENCES operations(id) ON DELETE CASCADE,
  sale_amount_total NUMERIC(18,2) NOT NULL,
  net_amount NUMERIC(18,2) NOT NULL,
  iva_amount NUMERIC(18,2) NOT NULL,
  currency TEXT NOT NULL CHECK (currency IN ('ARS', 'USD')),
  sale_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS iva_purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  operation_id UUID NOT NULL REFERENCES operations(id) ON DELETE CASCADE,
  operator_id UUID REFERENCES operators(id) ON DELETE SET NULL,
  operator_cost_total NUMERIC(18,2) NOT NULL,
  net_amount NUMERIC(18,2) NOT NULL,
  iva_amount NUMERIC(18,2) NOT NULL,
  currency TEXT NOT NULL CHECK (currency IN ('ARS', 'USD')),
  purchase_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 16. PAGOS A OPERADORES
-- =====================================================

CREATE TABLE IF NOT EXISTS operator_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  operation_id UUID REFERENCES operations(id) ON DELETE CASCADE,
  operator_id UUID NOT NULL REFERENCES operators(id) ON DELETE RESTRICT,
  amount NUMERIC(18,2) NOT NULL,
  currency TEXT NOT NULL CHECK (currency IN ('ARS', 'USD')),
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID', 'OVERDUE')),
  ledger_movement_id UUID REFERENCES ledger_movements(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 17. PAGOS RECURRENTES
-- =====================================================

CREATE TABLE IF NOT EXISTS recurring_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
  operator_id UUID NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
  amount NUMERIC(18,2) NOT NULL,
  currency TEXT NOT NULL CHECK (currency IN ('ARS', 'USD')),
  frequency TEXT NOT NULL CHECK (frequency IN ('WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY')),
  start_date DATE NOT NULL,
  end_date DATE,
  next_due_date DATE NOT NULL,
  last_generated_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  description TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- =====================================================
-- 18. TIPOS DE CAMBIO
-- =====================================================

CREATE TABLE IF NOT EXISTS exchange_rates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  currency_from TEXT NOT NULL DEFAULT 'USD',
  currency_to TEXT NOT NULL DEFAULT 'ARS',
  rate NUMERIC(18,4) NOT NULL,
  source TEXT DEFAULT 'manual',
  effective_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- =====================================================
-- 19. CUENTAS DE SOCIOS
-- =====================================================

CREATE TABLE IF NOT EXISTS partner_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
  partner_name TEXT NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS partner_withdrawals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  partner_id UUID NOT NULL REFERENCES partner_accounts(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'ARS' CHECK (currency IN ('ARS', 'USD')),
  withdrawal_date DATE NOT NULL,
  account_id UUID REFERENCES financial_accounts(id) ON DELETE SET NULL,
  cash_movement_id UUID REFERENCES cash_movements(id) ON DELETE SET NULL,
  ledger_movement_id UUID REFERENCES ledger_movements(id) ON DELETE SET NULL,
  description TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 20. PLAN DE CUENTAS CONTABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS chart_of_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
  account_code TEXT NOT NULL,
  account_name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('ACTIVO', 'PASIVO', 'PATRIMONIO_NETO', 'RESULTADO')),
  subcategory TEXT,
  account_type TEXT,
  level INTEGER NOT NULL DEFAULT 1,
  parent_id UUID REFERENCES chart_of_accounts(id) ON DELETE SET NULL,
  is_movement_account BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE(agency_id, account_code)
);

ALTER TABLE financial_accounts 
ADD COLUMN IF NOT EXISTS chart_account_id UUID REFERENCES chart_of_accounts(id) ON DELETE SET NULL;

-- =====================================================
-- 21. ESQUEMAS DE COMISIONES
-- =====================================================

CREATE TABLE IF NOT EXISTS commission_schemes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  commission_type TEXT NOT NULL CHECK (commission_type IN ('percentage', 'fixed', 'tiered', 'hybrid')),
  base_percentage NUMERIC(5,2) DEFAULT 0,
  base_amount NUMERIC(18,2) DEFAULT 0,
  applies_to TEXT NOT NULL DEFAULT 'revenue' CHECK (applies_to IN ('revenue', 'margin', 'net_margin')),
  tiers JSONB DEFAULT '[]',
  min_threshold NUMERIC(18,2) DEFAULT 0,
  max_cap NUMERIC(18,2),
  is_active BOOLEAN DEFAULT TRUE,
  is_default BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS commissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scheme_id UUID REFERENCES commission_schemes(id) ON DELETE SET NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  base_revenue NUMERIC(18,2) DEFAULT 0,
  base_margin NUMERIC(18,2) DEFAULT 0,
  operations_count INTEGER DEFAULT 0,
  commission_amount NUMERIC(18,2) NOT NULL,
  adjustments NUMERIC(18,2) DEFAULT 0,
  adjustment_notes TEXT,
  total_amount NUMERIC(18,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'cancelled')),
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  paid_at TIMESTAMP WITH TIME ZONE,
  payment_reference TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS commission_details (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  commission_id UUID NOT NULL REFERENCES commissions(id) ON DELETE CASCADE,
  operation_id UUID NOT NULL REFERENCES operations(id) ON DELETE CASCADE,
  operation_revenue NUMERIC(18,2) NOT NULL,
  operation_margin NUMERIC(18,2),
  commission_percentage NUMERIC(5,2),
  commission_amount NUMERIC(18,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE commission_schemes ENABLE ROW LEVEL SECURITY;
ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view commission schemes" ON commission_schemes
  FOR SELECT USING (
    agency_id IN (SELECT agency_id FROM user_agencies WHERE user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()))
  );

CREATE POLICY "Admins can manage commission schemes" ON commission_schemes
  FOR ALL USING (
    agency_id IN (SELECT agency_id FROM user_agencies WHERE user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()))
    AND EXISTS (SELECT 1 FROM users WHERE auth_id = auth.uid() AND role IN ('ADMIN', 'SUPER_ADMIN'))
  );

CREATE POLICY "Users can view own commissions" ON commissions
  FOR SELECT USING (
    user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
    OR agency_id IN (SELECT agency_id FROM user_agencies WHERE user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()))
  );

CREATE POLICY "Admins can manage commissions" ON commissions
  FOR ALL USING (
    agency_id IN (SELECT agency_id FROM user_agencies WHERE user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()))
    AND EXISTS (SELECT 1 FROM users WHERE auth_id = auth.uid() AND role IN ('ADMIN', 'SUPER_ADMIN'))
  );

CREATE POLICY "Users can view commission details" ON commission_details
  FOR SELECT USING (
    commission_id IN (
      SELECT id FROM commissions WHERE user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
      OR agency_id IN (SELECT agency_id FROM user_agencies WHERE user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()))
    )
  );

-- =====================================================
-- 22. FACTURACIÓN ELECTRÓNICA
-- =====================================================

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  operation_id UUID REFERENCES operations(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  cbte_tipo INTEGER NOT NULL,
  pto_vta INTEGER NOT NULL,
  cbte_nro INTEGER,
  cae TEXT,
  cae_fch_vto TEXT,
  receptor_doc_tipo INTEGER NOT NULL DEFAULT 80,
  receptor_doc_nro TEXT NOT NULL,
  receptor_nombre TEXT NOT NULL,
  receptor_domicilio TEXT,
  receptor_condicion_iva INTEGER,
  imp_neto NUMERIC(18,2) NOT NULL DEFAULT 0,
  imp_iva NUMERIC(18,2) NOT NULL DEFAULT 0,
  imp_total NUMERIC(18,2) NOT NULL DEFAULT 0,
  imp_tot_conc NUMERIC(18,2) DEFAULT 0,
  imp_op_ex NUMERIC(18,2) DEFAULT 0,
  imp_trib NUMERIC(18,2) DEFAULT 0,
  moneda TEXT DEFAULT 'PES',
  cotizacion NUMERIC(18,4) DEFAULT 1,
  concepto INTEGER DEFAULT 1,
  fch_serv_desde TEXT,
  fch_serv_hasta TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'sent', 'authorized', 'rejected', 'cancelled')),
  fecha_emision DATE,
  fecha_vto_pago DATE,
  afip_response JSONB,
  pdf_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS invoice_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  descripcion TEXT NOT NULL,
  cantidad NUMERIC(18,4) NOT NULL DEFAULT 1,
  precio_unitario NUMERIC(18,2) NOT NULL,
  subtotal NUMERIC(18,2) NOT NULL,
  iva_id INTEGER NOT NULL DEFAULT 5,
  iva_porcentaje NUMERIC(5,2) NOT NULL DEFAULT 21,
  iva_importe NUMERIC(18,2) NOT NULL DEFAULT 0,
  total NUMERIC(18,2) NOT NULL,
  orden INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view invoices for their agencies" ON invoices
  FOR SELECT USING (
    agency_id IN (SELECT agency_id FROM user_agencies WHERE user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()))
  );

CREATE POLICY "Users can create invoices for their agencies" ON invoices
  FOR INSERT WITH CHECK (
    agency_id IN (SELECT agency_id FROM user_agencies WHERE user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()))
  );

CREATE POLICY "Users can update invoices for their agencies" ON invoices
  FOR UPDATE USING (
    agency_id IN (SELECT agency_id FROM user_agencies WHERE user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()))
  );

CREATE POLICY "Users can view invoice items" ON invoice_items
  FOR SELECT USING (
    invoice_id IN (
      SELECT id FROM invoices WHERE agency_id IN (SELECT agency_id FROM user_agencies WHERE user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()))
    )
  );

CREATE POLICY "Users can manage invoice items" ON invoice_items
  FOR ALL USING (
    invoice_id IN (
      SELECT id FROM invoices WHERE agency_id IN (SELECT agency_id FROM user_agencies WHERE user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()))
    )
  );

-- =====================================================
-- INDEXES PARTE 2
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_ledger_movements_operation ON ledger_movements(operation_id);
CREATE INDEX IF NOT EXISTS idx_ledger_movements_type ON ledger_movements(type);
CREATE INDEX IF NOT EXISTS idx_ledger_movements_account ON ledger_movements(account_id);
CREATE INDEX IF NOT EXISTS idx_ledger_movements_created_at ON ledger_movements(created_at);
CREATE INDEX IF NOT EXISTS idx_ledger_movements_agency ON ledger_movements(agency_id);
CREATE INDEX IF NOT EXISTS idx_cash_movements_operation ON cash_movements(operation_id);
CREATE INDEX IF NOT EXISTS idx_cash_movements_type ON cash_movements(type);
CREATE INDEX IF NOT EXISTS idx_cash_movements_date ON cash_movements(movement_date);
CREATE INDEX IF NOT EXISTS idx_cash_movements_cash_box ON cash_movements(cash_box_id);
CREATE INDEX IF NOT EXISTS idx_cash_boxes_agency ON cash_boxes(agency_id);
CREATE INDEX IF NOT EXISTS idx_cash_transfers_agency ON cash_transfers(agency_id);
CREATE INDEX IF NOT EXISTS idx_operator_payments_operator ON operator_payments(operator_id);
CREATE INDEX IF NOT EXISTS idx_operator_payments_status ON operator_payments(status);
CREATE INDEX IF NOT EXISTS idx_iva_sales_operation ON iva_sales(operation_id);
CREATE INDEX IF NOT EXISTS idx_iva_purchases_operation ON iva_purchases(operation_id);
CREATE INDEX IF NOT EXISTS idx_invoices_agency ON invoices(agency_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_commissions_user ON commissions(user_id);
CREATE INDEX IF NOT EXISTS idx_commissions_status ON commissions(status);
CREATE INDEX IF NOT EXISTS idx_commissions_agency ON commissions(agency_id);
CREATE INDEX IF NOT EXISTS idx_financial_accounts_agency ON financial_accounts(agency_id);

-- =====================================================
-- TRIGGERS PARA UPDATED_AT PARTE 2
-- =====================================================

CREATE TRIGGER trigger_update_cash_boxes_updated_at BEFORE UPDATE ON cash_boxes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_cash_transfers_updated_at BEFORE UPDATE ON cash_transfers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_iva_sales_updated_at BEFORE UPDATE ON iva_sales
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_iva_purchases_updated_at BEFORE UPDATE ON iva_purchases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_operator_payments_updated_at BEFORE UPDATE ON operator_payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_recurring_payments_updated_at BEFORE UPDATE ON recurring_payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_partner_accounts_updated_at BEFORE UPDATE ON partner_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_chart_of_accounts_updated_at BEFORE UPDATE ON chart_of_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_commission_schemes_updated_at BEFORE UPDATE ON commission_schemes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_commissions_updated_at BEFORE UPDATE ON commissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_invoices_updated_at BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
