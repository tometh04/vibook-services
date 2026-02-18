-- Migration 068: Fix leads status CHECK constraint and enable RLS
--
-- Problems fixed:
-- 1. The status CHECK constraint only had 5 values (matching the Kanban) but
--    the API route VALID_STATUSES had 10 — aligning both to the same 5 values.
-- 2. The leads table had no Row Level Security, relying 100% on application-level
--    checks. Adding RLS for defense-in-depth.

-- ============================================================
-- 1. Fix status CHECK constraint
-- ============================================================

-- Drop the old constraint (name may vary depending on how Postgres named it)
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_status_check;

-- Add clean constraint matching exactly the 5 Kanban columns
ALTER TABLE leads ADD CONSTRAINT leads_status_check
  CHECK (status IN ('NEW', 'IN_PROGRESS', 'QUOTED', 'WON', 'LOST'));

-- ============================================================
-- 2. Enable RLS on leads
-- ============================================================

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- SELECT: any agency member can view leads in their agency
DROP POLICY IF EXISTS "Agency members can view leads" ON leads;
CREATE POLICY "Agency members can view leads" ON leads
  FOR SELECT USING (
    agency_id IN (
      SELECT ua.agency_id FROM user_agencies ua
      WHERE ua.user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
    )
  );

-- INSERT: any agency member can create leads in their agency
DROP POLICY IF EXISTS "Agency members can create leads" ON leads;
CREATE POLICY "Agency members can create leads" ON leads
  FOR INSERT WITH CHECK (
    agency_id IN (
      SELECT ua.agency_id FROM user_agencies ua
      WHERE ua.user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
    )
  );

-- UPDATE: any agency member can update leads in their agency
DROP POLICY IF EXISTS "Agency members can update leads" ON leads;
CREATE POLICY "Agency members can update leads" ON leads
  FOR UPDATE USING (
    agency_id IN (
      SELECT ua.agency_id FROM user_agencies ua
      WHERE ua.user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
    )
  );

-- DELETE: only ADMIN / SUPER_ADMIN can delete leads
DROP POLICY IF EXISTS "Admins can delete leads" ON leads;
CREATE POLICY "Admins can delete leads" ON leads
  FOR DELETE USING (
    agency_id IN (
      SELECT ua.agency_id FROM user_agencies ua
      WHERE ua.user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
    )
    AND EXISTS (
      SELECT 1 FROM users
      WHERE auth_id = auth.uid() AND role IN ('ADMIN', 'SUPER_ADMIN')
    )
  );
