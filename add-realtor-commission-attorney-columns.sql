-- Add Realtor Commission and Attorney Fee columns to deals_closed table
-- Run this in your Supabase SQL Editor

-- Realtor Commission fields (commission % calculated on UC price)
ALTER TABLE deals_closed ADD COLUMN IF NOT EXISTS realtor_commission_paid BOOLEAN DEFAULT false;
ALTER TABLE deals_closed ADD COLUMN IF NOT EXISTS realtor_commission_type TEXT CHECK (realtor_commission_type IN ('percentage', 'fixed'));
ALTER TABLE deals_closed ADD COLUMN IF NOT EXISTS realtor_commission_percentage NUMERIC(5,2);
ALTER TABLE deals_closed ADD COLUMN IF NOT EXISTS realtor_commission_amount NUMERIC(12,2);

-- Attorney Fee fields
ALTER TABLE deals_closed ADD COLUMN IF NOT EXISTS attorney_used BOOLEAN DEFAULT false;
ALTER TABLE deals_closed ADD COLUMN IF NOT EXISTS attorney_fee NUMERIC(12,2);

-- Add comment explaining the calculation order:
-- Net Profit = Revenue (sold_price - uc_price)
--              - Realtor Commission (% of UC price OR fixed amount)
--              - Dispo Share (if any)
--              - Attorney Fee (if any)
--              Then split with partner (if any)

COMMENT ON COLUMN deals_closed.realtor_commission_percentage IS 'Percentage calculated on UC price, not revenue';
