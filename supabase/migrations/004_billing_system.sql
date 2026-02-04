-- =====================================================
-- VIBOOK GESTIÓN - SISTEMA DE BILLING Y SUSCRIPCIONES
-- Tablas: Planes, Suscripciones, Métodos de Pago, Uso
-- =====================================================

-- =====================================================
-- 1. PLANES DE SUSCRIPCIÓN
-- =====================================================

CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE, -- 'FREE', 'STARTER', 'PRO', 'ENTERPRISE'
  display_name TEXT NOT NULL, -- 'Free', 'Starter', 'Pro', 'Enterprise'
  description TEXT,
  price_monthly NUMERIC(10,2) NOT NULL DEFAULT 0, -- Precio mensual en ARS
  price_yearly NUMERIC(10,2), -- Precio anual en ARS (opcional, no usado en MP)
  mp_preapproval_amount NUMERIC(10,2), -- Monto mensual para preapproval en Mercado Pago
  currency TEXT NOT NULL DEFAULT 'ARS',
  
  -- Límites del plan
  max_users INTEGER, -- NULL = ilimitado
  max_operations_per_month INTEGER, -- NULL = ilimitado
  max_integrations INTEGER DEFAULT 0, -- NULL = ilimitado
  max_storage_mb INTEGER, -- NULL = ilimitado
  max_api_calls_per_day INTEGER, -- NULL = ilimitado
  
  -- Features incluidas
  features JSONB NOT NULL DEFAULT '{}', -- { "trello": true, "manychat": true, "emilia": false, ... }
  
  -- Configuración
  is_active BOOLEAN DEFAULT true,
  is_public BOOLEAN DEFAULT true, -- Si aparece en la página de pricing
  sort_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 2. SUSCRIPCIONES
-- =====================================================

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id) ON DELETE RESTRICT,
  
  -- Mercado Pago
  mp_preapproval_id TEXT UNIQUE, -- ID de la preapproval en Mercado Pago
  mp_payer_id TEXT, -- ID del payer en Mercado Pago
  mp_preference_id TEXT, -- ID de la preferencia inicial de pago
  mp_status TEXT, -- 'pending', 'authorized', 'paused', 'cancelled'
  
  -- Estado de la suscripción
  status TEXT NOT NULL DEFAULT 'TRIAL' CHECK (status IN ('TRIAL', 'ACTIVE', 'CANCELED', 'PAST_DUE', 'UNPAID', 'SUSPENDED')),
  
  -- Períodos
  current_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  trial_start TIMESTAMP WITH TIME ZONE,
  trial_end TIMESTAMP WITH TIME ZONE,
  canceled_at TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT false,
  
  -- Billing (solo mensual para Argentina)
  billing_cycle TEXT NOT NULL DEFAULT 'MONTHLY' CHECK (billing_cycle = 'MONTHLY'),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(agency_id) -- Una agencia solo puede tener una suscripción activa
);

-- =====================================================
-- 3. MÉTODOS DE PAGO
-- =====================================================

CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  
  -- Mercado Pago
  mp_payment_method_id TEXT, -- ID del método de pago en Mercado Pago
  mp_card_id TEXT, -- ID de la tarjeta en Mercado Pago
  mp_payer_id TEXT NOT NULL, -- ID del payer en Mercado Pago
  
  -- Información del método de pago
  type TEXT NOT NULL CHECK (type IN ('CARD', 'ACCOUNT_MONEY', 'BANK_TRANSFER')),
  card_brand TEXT, -- 'visa', 'mastercard', 'amex', 'naranja', etc.
  card_last4 TEXT, -- Últimos 4 dígitos
  card_first6 TEXT, -- Primeros 6 dígitos (BIN)
  
  -- Estado
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 4. MÉTRICAS DE USO
-- =====================================================

CREATE TABLE IF NOT EXISTS usage_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  
  -- Período de medición
  period_start DATE NOT NULL, -- Primer día del mes
  period_end DATE NOT NULL, -- Último día del mes
  
  -- Contadores
  operations_count INTEGER DEFAULT 0,
  api_calls_count INTEGER DEFAULT 0,
  storage_bytes BIGINT DEFAULT 0,
  users_count INTEGER DEFAULT 0,
  integrations_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(agency_id, period_start) -- Una métrica por agencia por mes
);

-- =====================================================
-- 5. EVENTOS DE BILLING (para auditoría)
-- =====================================================

CREATE TABLE IF NOT EXISTS billing_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  
  -- Tipo de evento
  event_type TEXT NOT NULL CHECK (event_type IN (
    'SUBSCRIPTION_CREATED',
    'SUBSCRIPTION_UPDATED',
    'SUBSCRIPTION_CANCELED',
    'SUBSCRIPTION_RENEWED',
    'PAYMENT_SUCCEEDED',
    'PAYMENT_FAILED',
    'PLAN_CHANGED',
    'TRIAL_STARTED',
    'TRIAL_ENDED'
  )),
  
  -- Mercado Pago
  mp_notification_id TEXT, -- ID de la notificación en Mercado Pago
  mp_payment_id TEXT, -- ID del pago en Mercado Pago (si aplica)
  
  -- Datos del evento
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- ÍNDICES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_subscriptions_agency ON subscriptions(agency_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_mp ON subscriptions(mp_preapproval_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_payment_methods_agency ON payment_methods(agency_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_mp ON payment_methods(mp_card_id);
CREATE INDEX IF NOT EXISTS idx_usage_metrics_agency ON usage_metrics(agency_id, period_start);
CREATE INDEX IF NOT EXISTS idx_billing_events_agency ON billing_events(agency_id, created_at DESC);

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Habilitar RLS
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_events ENABLE ROW LEVEL SECURITY;

-- Planes: Todos pueden leer planes públicos
DROP POLICY IF EXISTS "Plans are viewable by everyone" ON subscription_plans;
CREATE POLICY "Plans are viewable by everyone" ON subscription_plans
  FOR SELECT USING (is_public = true OR is_active = true);

-- Suscripciones: Solo pueden ver sus propias suscripciones
DROP POLICY IF EXISTS "Agencies can view own subscriptions" ON subscriptions;
CREATE POLICY "Agencies can view own subscriptions" ON subscriptions
  FOR SELECT USING (
    agency_id IN (
      SELECT agency_id FROM user_agencies 
      WHERE user_id = auth.uid()::text::uuid
    )
  );

-- Métodos de pago: Solo pueden ver sus propios métodos
DROP POLICY IF EXISTS "Agencies can view own payment methods" ON payment_methods;
CREATE POLICY "Agencies can view own payment methods" ON payment_methods
  FOR SELECT USING (
    agency_id IN (
      SELECT agency_id FROM user_agencies 
      WHERE user_id = auth.uid()::text::uuid
    )
  );

-- Métricas de uso: Solo pueden ver sus propias métricas
DROP POLICY IF EXISTS "Agencies can view own usage metrics" ON usage_metrics;
CREATE POLICY "Agencies can view own usage metrics" ON usage_metrics
  FOR SELECT USING (
    agency_id IN (
      SELECT agency_id FROM user_agencies 
      WHERE user_id = auth.uid()::text::uuid
    )
  );

-- Eventos de billing: Solo pueden ver sus propios eventos
DROP POLICY IF EXISTS "Agencies can view own billing events" ON billing_events;
CREATE POLICY "Agencies can view own billing events" ON billing_events
  FOR SELECT USING (
    agency_id IN (
      SELECT agency_id FROM user_agencies 
      WHERE user_id = auth.uid()::text::uuid
    )
  );

-- =====================================================
-- DATOS INICIALES: PLANES
-- =====================================================

INSERT INTO subscription_plans (name, display_name, description, price_monthly, mp_preapproval_amount, max_users, max_operations_per_month, max_integrations, max_storage_mb, max_api_calls_per_day, features, is_public, sort_order) VALUES
  (
    'FREE',
    'Free',
    'Plan gratuito para empezar',
    0,
    0,
    1,
    10,
    0,
    100,
    100,
    '{"trello": false, "manychat": false, "emilia": false, "whatsapp": false, "reports": false}'::jsonb,
    true,
    1
  ),
  (
    'STARTER',
    'Starter',
    'Perfecto para pequeñas agencias',
    15000, -- $15.000 ARS mensual
    15000,
    5,
    100,
    1,
    1000,
    1000,
    '{"trello": true, "manychat": false, "emilia": false, "whatsapp": true, "reports": true}'::jsonb,
    true,
    2
  ),
  (
    'PRO',
    'Pro',
    'Para agencias en crecimiento',
    50000, -- $50.000 ARS mensual
    50000,
    NULL, -- Ilimitado
    NULL, -- Ilimitado
    NULL, -- Ilimitado
    10000,
    10000,
    '{"trello": true, "manychat": true, "emilia": true, "whatsapp": true, "reports": true}'::jsonb,
    true,
    3
  ),
  (
    'ENTERPRISE',
    'Enterprise',
    'Solución personalizada para grandes agencias',
    0, -- Precio custom
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    '{"trello": true, "manychat": true, "emilia": true, "whatsapp": true, "reports": true, "custom_integrations": true, "priority_support": true}'::jsonb,
    false, -- No aparece en pricing público
    4
  )
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- FUNCIÓN: Crear suscripción FREE automáticamente
-- =====================================================

CREATE OR REPLACE FUNCTION create_free_subscription_for_agency()
RETURNS TRIGGER AS $$
DECLARE
  free_plan_id UUID;
BEGIN
  -- Obtener el ID del plan FREE
  SELECT id INTO free_plan_id FROM subscription_plans WHERE name = 'FREE' LIMIT 1;
  
  IF free_plan_id IS NOT NULL THEN
    -- Crear suscripción FREE con trial de 14 días
    INSERT INTO subscriptions (
      agency_id,
      plan_id,
      status,
      current_period_start,
      current_period_end,
      trial_start,
      trial_end,
      billing_cycle
    ) VALUES (
      NEW.id,
      free_plan_id,
      'TRIAL',
      NOW(),
      NOW() + INTERVAL '14 days',
      NOW(),
      NOW() + INTERVAL '14 days',
      'MONTHLY'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Crear suscripción FREE cuando se crea una agencia
DROP TRIGGER IF EXISTS create_free_subscription_on_agency_creation ON agencies;
CREATE TRIGGER create_free_subscription_on_agency_creation
  AFTER INSERT ON agencies
  FOR EACH ROW
  EXECUTE FUNCTION create_free_subscription_for_agency();

-- =====================================================
-- FUNCIÓN: Actualizar métricas de uso automáticamente
-- =====================================================

CREATE OR REPLACE FUNCTION update_usage_metrics()
RETURNS TRIGGER AS $$
DECLARE
  current_month_start DATE;
BEGIN
  -- Obtener el primer día del mes actual
  current_month_start := DATE_TRUNC('month', CURRENT_DATE)::DATE;
  
  -- Insertar o actualizar métricas del mes actual
  INSERT INTO usage_metrics (
    agency_id,
    period_start,
    period_end,
    operations_count
  )
  VALUES (
    NEW.agency_id,
    current_month_start,
    (current_month_start + INTERVAL '1 month - 1 day')::DATE,
    1
  )
  ON CONFLICT (agency_id, period_start)
  DO UPDATE SET
    operations_count = usage_metrics.operations_count + 1,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Actualizar métricas cuando se crea una operación
DROP TRIGGER IF EXISTS update_usage_on_operation_creation ON operations;
CREATE TRIGGER update_usage_on_operation_creation
  AFTER INSERT ON operations
  FOR EACH ROW
  EXECUTE FUNCTION update_usage_metrics();
