-- Add document URL columns to deals_closed table
ALTER TABLE deals_closed 
ADD COLUMN IF NOT EXISTS purchase_contract_url TEXT,
ADD COLUMN IF NOT EXISTS assignment_contract_url TEXT,
ADD COLUMN IF NOT EXISTS hud_url TEXT;

-- Create storage bucket for deal documents (run in Supabase Dashboard > Storage)
-- Bucket name: deal-documents
-- Public: false (private)

-- Storage policy: Allow authenticated users to upload/read their org's files
-- Policy will be created in Supabase Dashboard > Storage > Policies
