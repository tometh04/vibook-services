-- ============================================================
-- MIGRACION: Centro de Mensajeria (Team Messaging)
-- Tables: team_channels, team_channel_members, team_messages
-- ============================================================

-- 1. Channels table
CREATE TABLE IF NOT EXISTS team_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('channel', 'dm')),
  name TEXT,
  description TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique channel name per agency (only for channels, DMs have NULL names)
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_channel_name
  ON team_channels (agency_id, lower(name))
  WHERE type = 'channel' AND name IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_team_channels_agency ON team_channels(agency_id);
CREATE INDEX IF NOT EXISTS idx_team_channels_type ON team_channels(agency_id, type);

ALTER TABLE team_channels ENABLE ROW LEVEL SECURITY;

-- 2. Channel members table
CREATE TABLE IF NOT EXISTS team_channel_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES team_channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ DEFAULT NOW(),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(channel_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_team_channel_members_user ON team_channel_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_channel_members_channel ON team_channel_members(channel_id);

ALTER TABLE team_channel_members ENABLE ROW LEVEL SECURITY;

-- 3. Messages table
CREATE TABLE IF NOT EXISTS team_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES team_channels(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_team_messages_channel ON team_messages(channel_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_team_messages_sender ON team_messages(sender_id);

ALTER TABLE team_messages ENABLE ROW LEVEL SECURITY;

-- 4. Enable Supabase Realtime for team_messages
ALTER PUBLICATION supabase_realtime ADD TABLE team_messages;

-- 5. Seed "general" channel for every existing agency
INSERT INTO team_channels (agency_id, type, name, description)
SELECT id, 'channel', 'general', 'Canal general de la agencia'
FROM agencies
ON CONFLICT DO NOTHING;

-- 6. Auto-add all agency users to their "general" channel
INSERT INTO team_channel_members (channel_id, user_id)
SELECT tc.id, ua.user_id
FROM team_channels tc
JOIN user_agencies ua ON ua.agency_id = tc.agency_id
WHERE tc.name = 'general' AND tc.type = 'channel'
ON CONFLICT (channel_id, user_id) DO NOTHING;

-- 7. Add messaging feature flag to subscription plans
UPDATE subscription_plans
SET features = COALESCE(features, '{}'::jsonb) || '{"messaging": true}'::jsonb
WHERE name IN ('PRO', 'BUSINESS', 'TESTER');

UPDATE subscription_plans
SET features = COALESCE(features, '{}'::jsonb) || '{"messaging": false}'::jsonb
WHERE name IN ('FREE', 'STARTER');
