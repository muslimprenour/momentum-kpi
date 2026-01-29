-- Deals Closed Table for Momentum KPI
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS deals_closed (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  property_address TEXT NOT NULL,
  uc_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  sold_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  revenue NUMERIC(12,2) GENERATED ALWAYS AS (sold_price - uc_price) STORED,
  split_with_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  split_percentage NUMERIC(5,2) DEFAULT 50.00,
  closed_date DATE NOT NULL,
  year INTEGER GENERATED ALWAYS AS (EXTRACT(YEAR FROM closed_date)::INTEGER) STORED,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS (Row Level Security)
ALTER TABLE deals_closed ENABLE ROW LEVEL SECURITY;

-- Policy: Users in same org can view deals (app handles filtering)
CREATE POLICY "Users can view org deals" ON deals_closed
  FOR SELECT
  USING (true);

-- Policy: Users can insert/update/delete deals
CREATE POLICY "Users can manage deals" ON deals_closed
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Indexes for faster lookups
CREATE INDEX idx_deals_closed_org_id ON deals_closed(organization_id);
CREATE INDEX idx_deals_closed_user_id ON deals_closed(user_id);
CREATE INDEX idx_deals_closed_year ON deals_closed(year);
CREATE INDEX idx_deals_closed_date ON deals_closed(closed_date);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_deals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER deals_closed_updated_at
  BEFORE UPDATE ON deals_closed
  FOR EACH ROW
  EXECUTE FUNCTION update_deals_updated_at();
