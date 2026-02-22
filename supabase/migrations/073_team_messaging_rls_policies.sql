-- ============================================================
-- RLS Policies para team_messages, team_channels, team_channel_members
-- Necesarias para que Supabase Realtime funcione con el anon key
-- ============================================================

-- team_messages: permitir SELECT si el usuario es miembro del canal
CREATE POLICY "team_messages_select" ON team_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_channel_members tcm
      JOIN users u ON u.id = tcm.user_id
      WHERE tcm.channel_id = team_messages.channel_id
        AND u.auth_id = auth.uid()
    )
  );

-- team_messages: permitir INSERT si el usuario es miembro del canal
CREATE POLICY "team_messages_insert" ON team_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_channel_members tcm
      JOIN users u ON u.id = tcm.user_id
      WHERE tcm.channel_id = team_messages.channel_id
        AND u.auth_id = auth.uid()
    )
  );

-- team_channels: permitir SELECT si el usuario es miembro
CREATE POLICY "team_channels_select" ON team_channels
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_channel_members tcm
      JOIN users u ON u.id = tcm.user_id
      WHERE tcm.channel_id = team_channels.id
        AND u.auth_id = auth.uid()
    )
  );

-- team_channel_members: permitir SELECT de sus propias membresías
CREATE POLICY "team_channel_members_select" ON team_channel_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = team_channel_members.user_id
        AND u.auth_id = auth.uid()
    )
  );
