-- =====================================================
-- MIGRACIÓN 057: Onboarding Controls (Admin override)
-- =====================================================
-- Permite forzar mostrar/ocultar onboarding por usuario y agencia

CREATE TABLE IF NOT EXISTS onboarding_controls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  mode TEXT NOT NULL DEFAULT 'AUTO' CHECK (mode IN ('AUTO', 'FORCE_ON', 'FORCE_OFF')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS onboarding_controls_user_agency_key
  ON onboarding_controls (user_id, agency_id);

-- Trigger para mantener updated_at
CREATE OR REPLACE FUNCTION update_onboarding_controls_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_onboarding_controls_updated_at ON onboarding_controls;
CREATE TRIGGER trigger_update_onboarding_controls_updated_at
BEFORE UPDATE ON onboarding_controls
FOR EACH ROW EXECUTE FUNCTION update_onboarding_controls_updated_at();

ALTER TABLE onboarding_controls ENABLE ROW LEVEL SECURITY;

-- Bloquear acceso para usuarios autenticados (solo admin/service role)
DROP POLICY IF EXISTS "Block onboarding_controls SELECT" ON onboarding_controls;
CREATE POLICY "Block onboarding_controls SELECT" ON onboarding_controls
  FOR SELECT TO authenticated USING (false);

DROP POLICY IF EXISTS "Block onboarding_controls INSERT" ON onboarding_controls;
CREATE POLICY "Block onboarding_controls INSERT" ON onboarding_controls
  FOR INSERT TO authenticated WITH CHECK (false);

DROP POLICY IF EXISTS "Block onboarding_controls UPDATE" ON onboarding_controls;
CREATE POLICY "Block onboarding_controls UPDATE" ON onboarding_controls
  FOR UPDATE TO authenticated USING (false);

DROP POLICY IF EXISTS "Block onboarding_controls DELETE" ON onboarding_controls;
CREATE POLICY "Block onboarding_controls DELETE" ON onboarding_controls
  FOR DELETE TO authenticated USING (false);

COMMENT ON TABLE onboarding_controls IS 'Overrides admin para mostrar/ocultar onboarding por usuario y agencia';
