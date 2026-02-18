-- Create pdf_templates table for document template management
CREATE TABLE IF NOT EXISTS pdf_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  template_type TEXT NOT NULL CHECK (template_type IN ('invoice', 'budget', 'voucher', 'itinerary', 'receipt', 'contract', 'general')),
  html_content TEXT NOT NULL,
  css_styles TEXT,
  page_size TEXT NOT NULL DEFAULT 'A4',
  page_orientation TEXT NOT NULL DEFAULT 'portrait' CHECK (page_orientation IN ('portrait', 'landscape')),
  page_margins JSONB,
  header_html TEXT,
  footer_html TEXT,
  show_page_numbers BOOLEAN NOT NULL DEFAULT true,
  available_variables JSONB,
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  logo_url TEXT,
  primary_color TEXT,
  secondary_color TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for agency lookups
CREATE INDEX IF NOT EXISTS idx_pdf_templates_agency_id ON pdf_templates(agency_id);
CREATE INDEX IF NOT EXISTS idx_pdf_templates_type ON pdf_templates(template_type);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trigger_update_pdf_templates_updated_at ON pdf_templates;
CREATE TRIGGER trigger_update_pdf_templates_updated_at
  BEFORE UPDATE ON pdf_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE pdf_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency members can view their templates"
  ON pdf_templates FOR SELECT
  USING (
    agency_id IN (
      SELECT agency_id FROM user_agencies WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage their templates"
  ON pdf_templates FOR ALL
  USING (
    agency_id IN (
      SELECT agency_id FROM user_agencies WHERE user_id = auth.uid()
    )
  );
