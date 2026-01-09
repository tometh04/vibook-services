-- =====================================================
-- VIBOOK GESTIÓN - SCHEMA CONSOLIDADO PARTE 1
-- Core Tables: Usuarios, Agencias, Clientes, Leads, Operaciones
-- =====================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. USUARIOS Y AGENCIAS
-- =====================================================

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id UUID NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('SUPER_ADMIN', 'ADMIN', 'CONTABLE', 'SELLER', 'VIEWER')),
  commission_percentage NUMERIC(5,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agencies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'America/Argentina/Buenos_Aires',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_agencies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, agency_id)
);

-- =====================================================
-- 2. TENANT BRANDING (MULTI-TENANT)
-- =====================================================

CREATE TABLE IF NOT EXISTS tenant_branding (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE UNIQUE,
  brand_name TEXT NOT NULL DEFAULT 'Vibook Gestión',
  logo_url TEXT,
  primary_color TEXT DEFAULT '#6366f1',
  secondary_color TEXT DEFAULT '#8b5cf6',
  accent_color TEXT DEFAULT '#06b6d4',
  favicon_url TEXT,
  email_footer_text TEXT,
  website_url TEXT,
  support_email TEXT,
  social_instagram TEXT,
  social_facebook TEXT,
  social_whatsapp TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE tenant_branding ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants can view their own branding" ON tenant_branding
  FOR SELECT USING (
    agency_id IN (SELECT agency_id FROM user_agencies WHERE user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()))
  );

CREATE POLICY "Admins can manage branding" ON tenant_branding
  FOR ALL USING (
    agency_id IN (SELECT agency_id FROM user_agencies WHERE user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()))
    AND EXISTS (SELECT 1 FROM users WHERE auth_id = auth.uid() AND role IN ('ADMIN', 'SUPER_ADMIN'))
  );

-- =====================================================
-- 3. OPERADORES (PROVEEDORES)
-- =====================================================

CREATE TABLE IF NOT EXISTS operators (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  credit_limit NUMERIC,
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 4. CLIENTES
-- =====================================================

CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  instagram_handle TEXT,
  document_type TEXT,
  document_number TEXT,
  date_of_birth DATE,
  nationality TEXT,
  passport_number TEXT,
  passport_expiry DATE,
  address TEXT,
  city TEXT,
  country TEXT,
  notes TEXT,
  custom_fields JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 5. LEADS
-- =====================================================

CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  source TEXT DEFAULT 'Other' CHECK (source IN ('Instagram', 'WhatsApp', 'Meta Ads', 'Trello', 'Manychat', 'Website', 'Referral', 'Other')),
  external_id TEXT,
  external_url TEXT,
  status TEXT NOT NULL DEFAULT 'NEW' CHECK (status IN ('NEW', 'IN_PROGRESS', 'QUOTED', 'WON', 'LOST')),
  region TEXT NOT NULL CHECK (region IN ('ARGENTINA', 'CARIBE', 'BRASIL', 'EUROPA', 'EEUU', 'OTROS', 'CRUCEROS')),
  destination TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  contact_email TEXT,
  contact_instagram TEXT,
  assigned_seller_id UUID REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT,
  departure_date DATE,
  return_date DATE,
  adults INTEGER DEFAULT 1,
  children INTEGER DEFAULT 0,
  infants INTEGER DEFAULT 0,
  budget_min NUMERIC,
  budget_max NUMERIC,
  budget_currency TEXT DEFAULT 'ARS',
  list_name TEXT,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 6. OPERACIONES
-- =====================================================

CREATE TABLE IF NOT EXISTS operations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  seller_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  operator_id UUID REFERENCES operators(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('FLIGHT', 'HOTEL', 'PACKAGE', 'CRUISE', 'TRANSFER', 'MIXED')),
  origin TEXT,
  destination TEXT NOT NULL,
  departure_date DATE NOT NULL,
  return_date DATE,
  operation_date DATE,
  adults INTEGER DEFAULT 1,
  children INTEGER DEFAULT 0,
  infants INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'PRE_RESERVATION' CHECK (status IN ('PRE_RESERVATION', 'RESERVED', 'CONFIRMED', 'CANCELLED', 'TRAVELLED', 'CLOSED')),
  sale_amount_total NUMERIC NOT NULL,
  operator_cost NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'ARS',
  margin_amount NUMERIC NOT NULL,
  margin_percentage NUMERIC NOT NULL,
  billing_margin NUMERIC,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Junction table: Operation <-> Customers
CREATE TABLE IF NOT EXISTS operation_customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  operation_id UUID NOT NULL REFERENCES operations(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'MAIN' CHECK (role IN ('MAIN', 'COMPANION'))
);

-- Junction table: Operation <-> Operators (múltiples operadores por operación)
CREATE TABLE IF NOT EXISTS operation_operators (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  operation_id UUID NOT NULL REFERENCES operations(id) ON DELETE CASCADE,
  operator_id UUID NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
  cost_amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'ARS',
  due_date DATE,
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID', 'OVERDUE')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(operation_id, operator_id)
);

-- =====================================================
-- 7. PASAJEROS DE OPERACIÓN
-- =====================================================

CREATE TABLE IF NOT EXISTS operation_passengers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  operation_id UUID NOT NULL REFERENCES operations(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  document_type TEXT,
  document_number TEXT,
  passport_number TEXT,
  passport_expiry DATE,
  date_of_birth DATE,
  nationality TEXT,
  is_main BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 8. PAGOS
-- =====================================================

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  operation_id UUID NOT NULL REFERENCES operations(id) ON DELETE CASCADE,
  payer_type TEXT NOT NULL CHECK (payer_type IN ('CUSTOMER', 'OPERATOR')),
  direction TEXT NOT NULL CHECK (direction IN ('INCOME', 'EXPENSE')),
  method TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'ARS',
  date_due DATE NOT NULL,
  date_paid DATE,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID', 'OVERDUE')),
  reference TEXT,
  account_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 9. DOCUMENTOS
-- =====================================================

CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  operation_id UUID REFERENCES operations(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  passenger_id UUID REFERENCES operation_passengers(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('PASSPORT', 'DNI', 'VOUCHER', 'INVOICE', 'PAYMENT_PROOF', 'OTHER')),
  file_url TEXT NOT NULL,
  file_name TEXT,
  uploaded_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view documents from their agencies" ON documents
  FOR SELECT USING (
    (operation_id IS NULL OR operation_id IN (SELECT id FROM operations WHERE agency_id IN (SELECT agency_id FROM user_agencies WHERE user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()))))
    OR (customer_id IS NULL OR customer_id IN (SELECT id FROM customers WHERE agency_id IN (SELECT agency_id FROM user_agencies WHERE user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()))))
    OR (lead_id IS NULL OR lead_id IN (SELECT id FROM leads WHERE agency_id IN (SELECT agency_id FROM user_agencies WHERE user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()))))
  );

CREATE POLICY "Users can upload documents" ON documents
  FOR INSERT WITH CHECK (
    uploaded_by_user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- =====================================================
-- 10. ALERTAS
-- =====================================================

CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
  operation_id UUID REFERENCES operations(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  payment_id UUID REFERENCES payments(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('PAYMENT_DUE', 'OPERATOR_DUE', 'UPCOMING_TRIP', 'MISSING_DOC', 'PASSPORT_EXPIRY', 'RECURRING_PAYMENT', 'GENERIC')),
  description TEXT NOT NULL,
  date_due TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'DONE', 'IGNORED', 'SNOOZED')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  snoozed_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES PARTE 1
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_user_agencies_user ON user_agencies(user_id);
CREATE INDEX IF NOT EXISTS idx_user_agencies_agency ON user_agencies(agency_id);
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON users(auth_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_leads_agency ON leads(agency_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_seller ON leads(assigned_seller_id);
CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(source);
CREATE INDEX IF NOT EXISTS idx_operations_agency ON operations(agency_id);
CREATE INDEX IF NOT EXISTS idx_operations_seller ON operations(seller_id);
CREATE INDEX IF NOT EXISTS idx_operations_status ON operations(status);
CREATE INDEX IF NOT EXISTS idx_operations_lead ON operations(lead_id);
CREATE INDEX IF NOT EXISTS idx_payments_operation ON payments(operation_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_customers_agency ON customers(agency_id);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
CREATE INDEX IF NOT EXISTS idx_alerts_date_due ON alerts(date_due);
CREATE INDEX IF NOT EXISTS idx_alerts_agency ON alerts(agency_id);
CREATE INDEX IF NOT EXISTS idx_operators_agency ON operators(agency_id);
CREATE INDEX IF NOT EXISTS idx_documents_operation ON documents(operation_id);
CREATE INDEX IF NOT EXISTS idx_documents_customer ON documents(customer_id);

-- =====================================================
-- TRIGGERS PARA UPDATED_AT
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_agencies_updated_at BEFORE UPDATE ON agencies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_operators_updated_at BEFORE UPDATE ON operators
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_customers_updated_at BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_leads_updated_at BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_operations_updated_at BEFORE UPDATE ON operations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_payments_updated_at BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_alerts_updated_at BEFORE UPDATE ON alerts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_tenant_branding_updated_at BEFORE UPDATE ON tenant_branding
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
