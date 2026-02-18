-- Add invoice_number column to recurring_payments table
ALTER TABLE recurring_payments
ADD COLUMN IF NOT EXISTS invoice_number TEXT;
