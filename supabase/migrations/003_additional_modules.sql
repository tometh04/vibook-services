-- =====================================================
-- VIBOOK GESTIÓN - SCHEMA CONSOLIDADO PARTE 3
-- Módulos: Cotizaciones, WhatsApp, Emilia, Notas, Integraciones
-- =====================================================

-- =====================================================
-- 23. COTIZACIONES
-- =====================================================

CREATE TABLE IF NOT EXISTS quotations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  operator_id UUID REFERENCES operators(id) ON DELETE SET NULL,
  quotation_number TEXT UNIQUE NOT NULL,
  destination TEXT NOT NULL,
  origin TEXT,
  region TEXT NOT NULL CHECK (region IN ('ARGENTINA', 'CARIBE', 'BRASIL', 'EUROPA', 'EEUU', 'OTROS', 'CRUCEROS')),
  departure_date DATE NOT NULL,
  return_date DATE,
  valid_until DATE NOT NULL,
  adults INTEGER DEFAULT 1,
  children INTEGER DEFAULT 0,
  infants INTEGER DEFAULT 0,
  subtotal NUMERIC(18,2) NOT NULL DEFAULT 0,
  discounts NUMERIC(18,2) DEFAULT 0,
  taxes NUMERIC(18,2) DEFAULT 0,
  total_amount NUMERIC(18,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'ARS' CHECK (currency IN ('ARS', 'USD')),
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SENT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'EXPIRED', 'CONVERTED')),
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  operation_id UUID REFERENCES operations(id) ON DELETE SET NULL,
  converted_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  terms_and_conditions TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS quotation_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quotation_id UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('ACCOMMODATION', 'FLIGHT', 'TRANSFER', 'ACTIVITY', 'INSURANCE', 'VISA', 'OTHER')),
  description TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  tariff_id UUID,
  unit_price NUMERIC(18,2) NOT NULL,
  discount_percentage NUMERIC(5,2) DEFAULT 0,
  discount_amount NUMERIC(18,2) DEFAULT 0,
  subtotal NUMERIC(18,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'ARS' CHECK (currency IN ('ARS', 'USD')),
  notes TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Función para generar número de cotización automático
CREATE OR REPLACE FUNCTION generate_quotation_number()
RETURNS TEXT AS $$
DECLARE
  year_part TEXT;
  sequence_num INTEGER;
BEGIN
  year_part := TO_CHAR(NOW(), 'YYYY');
  SELECT COALESCE(MAX(CAST(SUBSTRING(quotation_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
  INTO sequence_num
  FROM quotations
  WHERE quotation_number LIKE 'COT-' || year_part || '-%';
  RETURN 'COT-' || year_part || '-' || LPAD(sequence_num::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 24. TARIFARIOS Y CUPOS
-- =====================================================

CREATE TABLE IF NOT EXISTS tariffs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  operator_id UUID NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
  agency_id UUID REFERENCES agencies(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  destination TEXT NOT NULL,
  region TEXT NOT NULL CHECK (region IN ('ARGENTINA', 'CARIBE', 'BRASIL', 'EUROPA', 'EEUU', 'OTROS', 'CRUCEROS')),
  valid_from DATE NOT NULL,
  valid_to DATE NOT NULL,
  tariff_type TEXT NOT NULL CHECK (tariff_type IN ('ACCOMMODATION', 'FLIGHT', 'PACKAGE', 'TRANSFER', 'ACTIVITY', 'CRUISE', 'OTHER')),
  currency TEXT NOT NULL DEFAULT 'ARS' CHECK (currency IN ('ARS', 'USD')),
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  terms_and_conditions TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS tariff_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tariff_id UUID NOT NULL REFERENCES tariffs(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  room_type TEXT,
  occupancy_type TEXT CHECK (occupancy_type IN ('SINGLE', 'DOUBLE', 'TRIPLE', 'QUAD', 'SHARED', NULL)),
  base_price NUMERIC(18,2) NOT NULL,
  price_per_night BOOLEAN DEFAULT false,
  price_per_person BOOLEAN DEFAULT true,
  discount_percentage NUMERIC(5,2) DEFAULT 0,
  commission_percentage NUMERIC(5,2) DEFAULT 0,
  min_nights INTEGER,
  max_nights INTEGER,
  min_pax INTEGER DEFAULT 1,
  max_pax INTEGER,
  is_available BOOLEAN DEFAULT true,
  notes TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quotas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tariff_id UUID REFERENCES tariffs(id) ON DELETE CASCADE,
  operator_id UUID NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
  destination TEXT NOT NULL,
  accommodation_name TEXT,
  room_type TEXT,
  date_from DATE NOT NULL,
  date_to DATE NOT NULL,
  total_quota INTEGER NOT NULL,
  reserved_quota INTEGER DEFAULT 0,
  available_quota INTEGER GENERATED ALWAYS AS (total_quota - reserved_quota) STORED,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS quota_reservations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quota_id UUID NOT NULL REFERENCES quotas(id) ON DELETE CASCADE,
  quotation_id UUID REFERENCES quotations(id) ON DELETE SET NULL,
  operation_id UUID REFERENCES operations(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'RESERVED' CHECK (status IN ('RESERVED', 'CONFIRMED', 'RELEASED', 'EXPIRED')),
  reserved_until TIMESTAMP WITH TIME ZONE,
  released_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Función para actualizar cupos reservados
CREATE OR REPLACE FUNCTION update_quota_reserved_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'RESERVED' THEN
    UPDATE quotas
    SET reserved_quota = reserved_quota + NEW.quantity
    WHERE id = NEW.quota_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status = 'RESERVED' AND NEW.status != 'RESERVED' THEN
      UPDATE quotas
      SET reserved_quota = reserved_quota - OLD.quantity
      WHERE id = NEW.quota_id;
    ELSIF OLD.status != 'RESERVED' AND NEW.status = 'RESERVED' THEN
      UPDATE quotas
      SET reserved_quota = reserved_quota + NEW.quantity
      WHERE id = NEW.quota_id;
    ELSIF OLD.status = 'RESERVED' AND NEW.status = 'RESERVED' AND OLD.quantity != NEW.quantity THEN
      UPDATE quotas
      SET reserved_quota = reserved_quota - OLD.quantity + NEW.quantity
      WHERE id = NEW.quota_id;
    END IF;
  ELSIF TG_OP = 'DELETE' AND OLD.status = 'RESERVED' THEN
    UPDATE quotas
    SET reserved_quota = reserved_quota - OLD.quantity
    WHERE id = OLD.quota_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_quota_reserved_count ON quota_reservations;
CREATE TRIGGER trigger_update_quota_reserved_count
  AFTER INSERT OR UPDATE OR DELETE ON quota_reservations
  FOR EACH ROW
  EXECUTE FUNCTION update_quota_reserved_count();

-- =====================================================
-- 25. MENSAJES WHATSAPP
-- =====================================================

CREATE TABLE IF NOT EXISTS message_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('PAYMENT', 'TRIP', 'QUOTATION', 'BIRTHDAY', 'ANNIVERSARY', 'MARKETING', 'CUSTOM')),
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('MANUAL', 'QUOTATION_SENT', 'QUOTATION_EXPIRING', 'QUOTATION_APPROVED', 'PAYMENT_PLAN_CREATED', 'PAYMENT_DUE_3D', 'PAYMENT_DUE_1D', 'PAYMENT_RECEIVED', 'PAYMENT_OVERDUE', 'PAYMENT_COMPLETE', 'TRIP_7D_BEFORE', 'TRIP_1D_BEFORE', 'TRIP_RETURN', 'TRIP_POST_7D', 'BIRTHDAY', 'ANNIVERSARY_1Y')),
  template TEXT NOT NULL,
  emoji_prefix TEXT,
  is_active BOOLEAN DEFAULT true,
  send_hour_from INTEGER DEFAULT 9,
  send_hour_to INTEGER DEFAULT 21,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
  template_id UUID REFERENCES message_templates(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  message TEXT NOT NULL,
  whatsapp_link TEXT,
  operation_id UUID REFERENCES operations(id) ON DELETE SET NULL,
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  quotation_id UUID REFERENCES quotations(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SENT', 'SKIPPED', 'FAILED')),
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMP WITH TIME ZONE,
  sent_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 26. CONVERSACIONES DE EMILIA (AI SEARCH)
-- =====================================================

CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Chat',
  state TEXT NOT NULL DEFAULT 'active' CHECK (state IN ('active', 'closed')),
  channel TEXT NOT NULL DEFAULT 'web' CHECK (channel IN ('web', 'whatsapp', 'api')),
  last_search_context JSONB,
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content JSONB NOT NULL,
  client_id TEXT UNIQUE,
  api_request_id TEXT,
  api_search_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 27. NOTAS COLABORATIVAS
-- =====================================================

CREATE TABLE IF NOT EXISTS notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  note_type TEXT NOT NULL DEFAULT 'general' CHECK (note_type IN ('general', 'operation', 'customer')),
  operation_id UUID REFERENCES operations(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'team', 'agency')),
  tags TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
  is_pinned BOOLEAN DEFAULT FALSE,
  color TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS note_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES note_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS note_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_url TEXT NOT NULL,
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view notes based on visibility" ON notes;
CREATE POLICY "Users can view notes based on visibility" ON notes
  FOR SELECT USING (
    agency_id IN (SELECT agency_id FROM user_agencies WHERE user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()))
    AND (
      created_by IN (SELECT id FROM users WHERE auth_id = auth.uid())
      OR visibility IN ('team', 'agency')
    )
  );

DROP POLICY IF EXISTS "Users can create notes" ON notes;
CREATE POLICY "Users can create notes" ON notes
  FOR INSERT WITH CHECK (
    agency_id IN (SELECT agency_id FROM user_agencies WHERE user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()))
  );

DROP POLICY IF EXISTS "Users can update own notes" ON notes;
CREATE POLICY "Users can update own notes" ON notes
  FOR UPDATE USING (
    agency_id IN (SELECT agency_id FROM user_agencies WHERE user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()))
    AND (
      created_by IN (SELECT id FROM users WHERE auth_id = auth.uid())
      OR EXISTS (SELECT 1 FROM users WHERE auth_id = auth.uid() AND role IN ('ADMIN', 'SUPER_ADMIN'))
    )
  );

DROP POLICY IF EXISTS "Users can view comments on accessible notes" ON note_comments;
CREATE POLICY "Users can view comments on accessible notes" ON note_comments
  FOR SELECT USING (
    note_id IN (
      SELECT id FROM notes WHERE agency_id IN (SELECT agency_id FROM user_agencies WHERE user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Users can create comments" ON note_comments;
CREATE POLICY "Users can create comments" ON note_comments
  FOR ALL USING (
    note_id IN (
      SELECT id FROM notes WHERE agency_id IN (SELECT agency_id FROM user_agencies WHERE user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Users can view attachments on accessible notes" ON note_attachments;
CREATE POLICY "Users can view attachments on accessible notes" ON note_attachments
  FOR SELECT USING (
    note_id IN (
      SELECT id FROM notes WHERE agency_id IN (SELECT agency_id FROM user_agencies WHERE user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Users can upload attachments" ON note_attachments;
CREATE POLICY "Users can upload attachments" ON note_attachments
  FOR ALL USING (
    note_id IN (
      SELECT id FROM notes WHERE agency_id IN (SELECT agency_id FROM user_agencies WHERE user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()))
    )
  );

-- =====================================================
-- 28. EQUIPOS
-- =====================================================

CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  leader_id UUID REFERENCES users(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('leader', 'member')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);

-- =====================================================
-- 29. SISTEMA DE INTEGRACIONES (MODULAR)
-- =====================================================

CREATE TABLE IF NOT EXISTS integration_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  integration_type TEXT NOT NULL CHECK (integration_type IN ('TRELLO', 'MANYCHAT', 'WHATSAPP_BUSINESS', 'GOOGLE_CALENDAR', 'STRIPE', 'MERCADOPAGO', 'AFIP', 'CUSTOM_WEBHOOK')),
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT false,
  config JSONB NOT NULL DEFAULT '{}',
  webhook_url TEXT,
  webhook_secret TEXT,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  last_sync_status TEXT CHECK (last_sync_status IN ('SUCCESS', 'ERROR', 'PARTIAL')),
  last_error TEXT,
  sync_frequency_minutes INTEGER DEFAULT 60,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  UNIQUE(agency_id, integration_type)
);

CREATE TABLE IF NOT EXISTS integration_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  integration_config_id UUID NOT NULL REFERENCES integration_configs(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('SUCCESS', 'ERROR', 'WARNING', 'INFO')),
  request_data JSONB,
  response_data JSONB,
  error_message TEXT,
  error_stack TEXT,
  duration_ms INTEGER,
  source_ip TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE integration_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their integration configs" ON integration_configs;
CREATE POLICY "Users can view their integration configs" ON integration_configs
  FOR SELECT USING (
    agency_id IN (SELECT agency_id FROM user_agencies WHERE user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()))
  );

DROP POLICY IF EXISTS "Admins can manage integration configs" ON integration_configs;
CREATE POLICY "Admins can manage integration configs" ON integration_configs
  FOR ALL USING (
    agency_id IN (SELECT agency_id FROM user_agencies WHERE user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()))
    AND EXISTS (SELECT 1 FROM users WHERE auth_id = auth.uid() AND role IN ('ADMIN', 'SUPER_ADMIN'))
  );

DROP POLICY IF EXISTS "Users can view their integration logs" ON integration_logs;
CREATE POLICY "Users can view their integration logs" ON integration_logs
  FOR SELECT USING (
    integration_config_id IN (
      SELECT id FROM integration_configs WHERE agency_id IN (SELECT agency_id FROM user_agencies WHERE user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()))
    )
  );

-- Función helper para obtener integración activa
CREATE OR REPLACE FUNCTION get_active_integration(
  p_agency_id UUID,
  p_integration_type TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_config JSONB;
BEGIN
  SELECT 
    jsonb_build_object(
      'id', id,
      'name', name,
      'config', config,
      'webhook_url', webhook_url,
      'webhook_secret', webhook_secret
    )
  INTO v_config
  FROM integration_configs
  WHERE agency_id = p_agency_id
    AND integration_type = p_integration_type
    AND is_active = true;
  
  RETURN v_config;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 30. CONFIGURACIONES POR MÓDULO
-- =====================================================

CREATE TABLE IF NOT EXISTS customer_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE UNIQUE,
  require_document BOOLEAN DEFAULT true,
  require_passport BOOLEAN DEFAULT false,
  require_address BOOLEAN DEFAULT false,
  show_instagram_field BOOLEAN DEFAULT true,
  custom_fields_config JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS operation_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE UNIQUE,
  default_currency TEXT DEFAULT 'ARS',
  default_payment_terms INTEGER DEFAULT 30,
  require_operator BOOLEAN DEFAULT false,
  auto_create_payment_plan BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS financial_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE UNIQUE,
  default_exchange_rate NUMERIC(18,4) DEFAULT 1,
  iva_percentage NUMERIC(5,2) DEFAULT 21,
  show_iva_breakdown BOOLEAN DEFAULT true,
  default_payment_method TEXT DEFAULT 'CASH',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tools_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE UNIQUE,
  enable_emilia_search BOOLEAN DEFAULT true,
  enable_whatsapp_templates BOOLEAN DEFAULT true,
  enable_auto_alerts BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE customer_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE operation_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE tools_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view settings for their agencies" ON customer_settings;
CREATE POLICY "Users can view settings for their agencies" ON customer_settings
  FOR SELECT USING (
    agency_id IN (SELECT agency_id FROM user_agencies WHERE user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()))
  );

DROP POLICY IF EXISTS "Admins can manage settings" ON customer_settings;
CREATE POLICY "Admins can manage settings" ON customer_settings
  FOR ALL USING (
    agency_id IN (SELECT agency_id FROM user_agencies WHERE user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()))
    AND EXISTS (SELECT 1 FROM users WHERE auth_id = auth.uid() AND role IN ('ADMIN', 'SUPER_ADMIN'))
  );

DROP POLICY IF EXISTS "Users can view operation settings" ON operation_settings;
CREATE POLICY "Users can view operation settings" ON operation_settings
  FOR SELECT USING (
    agency_id IN (SELECT agency_id FROM user_agencies WHERE user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()))
  );

DROP POLICY IF EXISTS "Admins can manage operation settings" ON operation_settings;
CREATE POLICY "Admins can manage operation settings" ON operation_settings
  FOR ALL USING (
    agency_id IN (SELECT agency_id FROM user_agencies WHERE user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()))
    AND EXISTS (SELECT 1 FROM users WHERE auth_id = auth.uid() AND role IN ('ADMIN', 'SUPER_ADMIN'))
  );

DROP POLICY IF EXISTS "Users can view financial settings" ON financial_settings;
CREATE POLICY "Users can view financial settings" ON financial_settings
  FOR SELECT USING (
    agency_id IN (SELECT agency_id FROM user_agencies WHERE user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()))
  );

DROP POLICY IF EXISTS "Admins can manage financial settings" ON financial_settings;
CREATE POLICY "Admins can manage financial settings" ON financial_settings
  FOR ALL USING (
    agency_id IN (SELECT agency_id FROM user_agencies WHERE user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()))
    AND EXISTS (SELECT 1 FROM users WHERE auth_id = auth.uid() AND role IN ('ADMIN', 'SUPER_ADMIN'))
  );

DROP POLICY IF EXISTS "Users can view tools settings" ON tools_settings;
CREATE POLICY "Users can view tools settings" ON tools_settings
  FOR SELECT USING (
    agency_id IN (SELECT agency_id FROM user_agencies WHERE user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()))
  );

DROP POLICY IF EXISTS "Admins can manage tools settings" ON tools_settings;
CREATE POLICY "Admins can manage tools settings" ON tools_settings
  FOR ALL USING (
    agency_id IN (SELECT agency_id FROM user_agencies WHERE user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()))
    AND EXISTS (SELECT 1 FROM users WHERE auth_id = auth.uid() AND role IN ('ADMIN', 'SUPER_ADMIN'))
  );

-- =====================================================
-- 31. LOGS DE AUDITORÍA
-- =====================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID REFERENCES agencies(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 32. REQUISITOS DE DESTINO
-- =====================================================

CREATE TABLE IF NOT EXISTS destination_requirements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  destination TEXT NOT NULL,
  country_code TEXT,
  visa_required BOOLEAN DEFAULT false,
  visa_notes TEXT,
  passport_validity_months INTEGER DEFAULT 6,
  vaccination_required BOOLEAN DEFAULT false,
  vaccination_notes TEXT,
  travel_insurance_required BOOLEAN DEFAULT false,
  other_requirements TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES PARTE 3
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_quotations_agency ON quotations(agency_id);
CREATE INDEX IF NOT EXISTS idx_quotations_status ON quotations(status);
CREATE INDEX IF NOT EXISTS idx_quotations_seller ON quotations(seller_id);
CREATE INDEX IF NOT EXISTS idx_quotations_number ON quotations(quotation_number);
CREATE INDEX IF NOT EXISTS idx_quotation_items_quotation ON quotation_items(quotation_id);
CREATE INDEX IF NOT EXISTS idx_tariffs_operator ON tariffs(operator_id);
CREATE INDEX IF NOT EXISTS idx_tariffs_destination ON tariffs(destination);
CREATE INDEX IF NOT EXISTS idx_tariffs_valid_dates ON tariffs(valid_from, valid_to);
CREATE INDEX IF NOT EXISTS idx_quotas_operator ON quotas(operator_id);
CREATE INDEX IF NOT EXISTS idx_quotas_dates ON quotas(date_from, date_to);
CREATE INDEX IF NOT EXISTS idx_quota_reservations_quota ON quota_reservations(quota_id);
CREATE INDEX IF NOT EXISTS idx_message_templates_agency ON message_templates(agency_id);
CREATE INDEX IF NOT EXISTS idx_message_templates_trigger ON message_templates(trigger_type);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_status ON whatsapp_messages(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_customer ON whatsapp_messages(customer_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_scheduled ON whatsapp_messages(scheduled_for) WHERE status = 'PENDING';
CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_agency ON conversations(agency_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_client_id ON messages(client_id);
CREATE INDEX IF NOT EXISTS idx_notes_agency ON notes(agency_id);
CREATE INDEX IF NOT EXISTS idx_notes_type ON notes(note_type);
CREATE INDEX IF NOT EXISTS idx_notes_tags ON notes USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_teams_agency ON teams(agency_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_integration_configs_agency ON integration_configs(agency_id);
CREATE INDEX IF NOT EXISTS idx_integration_configs_type ON integration_configs(integration_type);
CREATE INDEX IF NOT EXISTS idx_integration_logs_config ON integration_logs(integration_config_id);
CREATE INDEX IF NOT EXISTS idx_integration_logs_created ON integration_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_agency ON audit_logs(agency_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- =====================================================
-- TRIGGERS PARA UPDATED_AT PARTE 3
-- =====================================================

DROP TRIGGER IF EXISTS trigger_update_quotations_updated_at ON quotations;
CREATE TRIGGER trigger_update_quotations_updated_at BEFORE UPDATE ON quotations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_quotation_items_updated_at ON quotation_items;
CREATE TRIGGER trigger_update_quotation_items_updated_at BEFORE UPDATE ON quotation_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_tariffs_updated_at ON tariffs;
CREATE TRIGGER trigger_update_tariffs_updated_at BEFORE UPDATE ON tariffs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_tariff_items_updated_at ON tariff_items;
CREATE TRIGGER trigger_update_tariff_items_updated_at BEFORE UPDATE ON tariff_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_quotas_updated_at ON quotas;
CREATE TRIGGER trigger_update_quotas_updated_at BEFORE UPDATE ON quotas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_message_templates_updated_at ON message_templates;
CREATE TRIGGER trigger_update_message_templates_updated_at BEFORE UPDATE ON message_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_conversations_updated_at ON conversations;
CREATE TRIGGER trigger_update_conversations_updated_at BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_notes_updated_at ON notes;
CREATE TRIGGER trigger_update_notes_updated_at BEFORE UPDATE ON notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_note_comments_updated_at ON note_comments;
CREATE TRIGGER trigger_update_note_comments_updated_at BEFORE UPDATE ON note_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_teams_updated_at ON teams;
CREATE TRIGGER trigger_update_teams_updated_at BEFORE UPDATE ON teams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_integration_configs_updated_at ON integration_configs;
CREATE TRIGGER trigger_update_integration_configs_updated_at BEFORE UPDATE ON integration_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_customer_settings_updated_at ON customer_settings;
CREATE TRIGGER trigger_update_customer_settings_updated_at BEFORE UPDATE ON customer_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_operation_settings_updated_at ON operation_settings;
CREATE TRIGGER trigger_update_operation_settings_updated_at BEFORE UPDATE ON operation_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_financial_settings_updated_at ON financial_settings;
CREATE TRIGGER trigger_update_financial_settings_updated_at BEFORE UPDATE ON financial_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_tools_settings_updated_at ON tools_settings;
CREATE TRIGGER trigger_update_tools_settings_updated_at BEFORE UPDATE ON tools_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_destination_requirements_updated_at ON destination_requirements;
CREATE TRIGGER trigger_update_destination_requirements_updated_at BEFORE UPDATE ON destination_requirements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- COMENTARIOS FINALES
-- =====================================================

COMMENT ON TABLE integration_configs IS 'Configuración de integraciones por agencia (Trello, Manychat, etc.)';
COMMENT ON TABLE integration_logs IS 'Logs de eventos de integraciones para debugging y auditoría';
COMMENT ON TABLE tenant_branding IS 'Configuración de branding personalizado por agencia/tenant';
