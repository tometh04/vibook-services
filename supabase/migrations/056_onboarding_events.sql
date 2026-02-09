-- =====================================================
-- MIGRACIÓN 056: Onboarding Events
-- =====================================================
-- Guarda eventos del onboarding guiado (visitas/acciones clave)

CREATE TABLE IF NOT EXISTS onboarding_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS onboarding_events_agency_event_idx
  ON onboarding_events (agency_id, event_type);

CREATE INDEX IF NOT EXISTS onboarding_events_user_event_idx
  ON onboarding_events (user_id, event_type);

ALTER TABLE onboarding_events ENABLE ROW LEVEL SECURITY;

-- Bloquear modificaciones para usuarios autenticados (solo admin client)
DROP POLICY IF EXISTS "Block onboarding_events INSERT" ON onboarding_events;
CREATE POLICY "Block onboarding_events INSERT" ON onboarding_events
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS "Block onboarding_events UPDATE" ON onboarding_events;
CREATE POLICY "Block onboarding_events UPDATE" ON onboarding_events
  FOR UPDATE
  TO authenticated
  USING (false);

DROP POLICY IF EXISTS "Block onboarding_events DELETE" ON onboarding_events;
CREATE POLICY "Block onboarding_events DELETE" ON onboarding_events
  FOR DELETE
  TO authenticated
  USING (false);

COMMENT ON TABLE onboarding_events IS 'Eventos de onboarding guiado (visitas/acciones clave por usuario y agencia)';
