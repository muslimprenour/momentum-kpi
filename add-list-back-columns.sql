-- Add list_back_secured columns to deals_closed table
-- Run this in your Supabase SQL Editor

ALTER TABLE deals_closed 
ADD COLUMN IF NOT EXISTS list_back_secured BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS list_back_commission_pct NUMERIC(5,2);

-- Add a comment for documentation
COMMENT ON COLUMN deals_closed.list_back_secured IS 'Whether a list back agreement was secured on this wholesale deal';
COMMENT ON COLUMN deals_closed.list_back_commission_pct IS 'Commission percentage secured for list back (e.g., 2.5%)';
