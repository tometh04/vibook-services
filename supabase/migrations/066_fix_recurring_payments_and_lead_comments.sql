-- Add missing columns to recurring_payments table
ALTER TABLE recurring_payments
ADD COLUMN IF NOT EXISTS provider_name TEXT,
ADD COLUMN IF NOT EXISTS reference TEXT;

-- Create lead_comments table for CRM lead comments
CREATE TABLE IF NOT EXISTS lead_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  comment TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for lead lookups
CREATE INDEX IF NOT EXISTS idx_lead_comments_lead_id ON lead_comments(lead_id);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trigger_update_lead_comments_updated_at ON lead_comments;
CREATE TRIGGER trigger_update_lead_comments_updated_at
  BEFORE UPDATE ON lead_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS for lead_comments
ALTER TABLE lead_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency members can view lead comments"
  ON lead_comments FOR SELECT
  USING (
    lead_id IN (
      SELECT l.id FROM leads l
      JOIN user_agencies ua ON ua.agency_id = l.agency_id
      WHERE ua.user_id = auth.uid()
    )
  );

CREATE POLICY "Agency members can create lead comments"
  ON lead_comments FOR INSERT
  WITH CHECK (
    lead_id IN (
      SELECT l.id FROM leads l
      JOIN user_agencies ua ON ua.agency_id = l.agency_id
      WHERE ua.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own comments"
  ON lead_comments FOR DELETE
  USING (user_id = auth.uid());
