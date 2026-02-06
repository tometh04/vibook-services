-- Fix RLS policy for user_agencies SELECT
-- Allow users to read their own user_agencies row (based on auth_id)

ALTER TABLE user_agencies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_agencies_select" ON user_agencies;
CREATE POLICY "user_agencies_select" ON user_agencies
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth_id = auth.uid() AND role = 'SUPER_ADMIN'
    )
    OR user_id IN (
      SELECT id FROM users WHERE auth_id = auth.uid()
    )
  );
