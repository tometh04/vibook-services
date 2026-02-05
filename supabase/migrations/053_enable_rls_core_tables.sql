-- =====================================================
-- Enable RLS for core multi-tenant tables
-- =====================================================

-- 1) user_agencies
ALTER TABLE user_agencies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_agencies_select" ON user_agencies;
CREATE POLICY "user_agencies_select" ON user_agencies
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth_id = auth.uid() AND role = 'SUPER_ADMIN'
    )
    OR agency_id IN (
      SELECT ua.agency_id
      FROM user_agencies ua
      WHERE ua.user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "user_agencies_insert" ON user_agencies;
CREATE POLICY "user_agencies_insert" ON user_agencies
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth_id = auth.uid() AND role IN ('ADMIN','SUPER_ADMIN')
    )
    AND (
      EXISTS (
        SELECT 1 FROM users
        WHERE auth_id = auth.uid() AND role = 'SUPER_ADMIN'
      )
      OR agency_id IN (
        SELECT ua.agency_id
        FROM user_agencies ua
        WHERE ua.user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "user_agencies_update" ON user_agencies;
CREATE POLICY "user_agencies_update" ON user_agencies
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth_id = auth.uid() AND role IN ('ADMIN','SUPER_ADMIN')
    )
    AND (
      EXISTS (
        SELECT 1 FROM users
        WHERE auth_id = auth.uid() AND role = 'SUPER_ADMIN'
      )
      OR agency_id IN (
        SELECT ua.agency_id
        FROM user_agencies ua
        WHERE ua.user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth_id = auth.uid() AND role IN ('ADMIN','SUPER_ADMIN')
    )
    AND (
      EXISTS (
        SELECT 1 FROM users
        WHERE auth_id = auth.uid() AND role = 'SUPER_ADMIN'
      )
      OR agency_id IN (
        SELECT ua.agency_id
        FROM user_agencies ua
        WHERE ua.user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "user_agencies_delete" ON user_agencies;
CREATE POLICY "user_agencies_delete" ON user_agencies
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth_id = auth.uid() AND role IN ('ADMIN','SUPER_ADMIN')
    )
    AND (
      EXISTS (
        SELECT 1 FROM users
        WHERE auth_id = auth.uid() AND role = 'SUPER_ADMIN'
      )
      OR agency_id IN (
        SELECT ua.agency_id
        FROM user_agencies ua
        WHERE ua.user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
      )
    )
  );

-- 2) chart_of_accounts
ALTER TABLE chart_of_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chart_of_accounts_select" ON chart_of_accounts;
CREATE POLICY "chart_of_accounts_select" ON chart_of_accounts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth_id = auth.uid() AND role = 'SUPER_ADMIN'
    )
    OR agency_id IN (
      SELECT ua.agency_id
      FROM user_agencies ua
      WHERE ua.user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "chart_of_accounts_write" ON chart_of_accounts;
CREATE POLICY "chart_of_accounts_write" ON chart_of_accounts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth_id = auth.uid() AND role IN ('ADMIN','SUPER_ADMIN')
    )
    AND (
      EXISTS (
        SELECT 1 FROM users
        WHERE auth_id = auth.uid() AND role = 'SUPER_ADMIN'
      )
      OR agency_id IN (
        SELECT ua.agency_id
        FROM user_agencies ua
        WHERE ua.user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth_id = auth.uid() AND role IN ('ADMIN','SUPER_ADMIN')
    )
    AND (
      EXISTS (
        SELECT 1 FROM users
        WHERE auth_id = auth.uid() AND role = 'SUPER_ADMIN'
      )
      OR agency_id IN (
        SELECT ua.agency_id
        FROM user_agencies ua
        WHERE ua.user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
      )
    )
  );

