-- Add document URL columns to deals_closed table
ALTER TABLE deals_closed 
ADD COLUMN IF NOT EXISTS purchase_contract_url TEXT,
ADD COLUMN IF NOT EXISTS assignment_contract_url TEXT,
ADD COLUMN IF NOT EXISTS hud_url TEXT;

-- Add split type and amount columns (for fixed amount splits vs percentage)
ALTER TABLE deals_closed
ADD COLUMN IF NOT EXISTS split_type TEXT,
ADD COLUMN IF NOT EXISTS split_amount NUMERIC;

-- Add dispo help columns
ALTER TABLE deals_closed
ADD COLUMN IF NOT EXISTS dispo_help BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS dispo_name TEXT,
ADD COLUMN IF NOT EXISTS dispo_email TEXT,
ADD COLUMN IF NOT EXISTS dispo_phone TEXT,
ADD COLUMN IF NOT EXISTS dispo_share_type TEXT,
ADD COLUMN IF NOT EXISTS dispo_share_percentage NUMERIC,
ADD COLUMN IF NOT EXISTS dispo_share_amount NUMERIC;

-- Create storage bucket for deal documents (run in Supabase Dashboard > Storage)
-- Bucket name: deal-documents
-- Public: false (private)
