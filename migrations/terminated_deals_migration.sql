-- Terminated Deals Tracker
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS terminated_deals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  user_id UUID NOT NULL,
  property_address TEXT NOT NULL,
  zillow_url TEXT,
  original_asking_price NUMERIC,
  our_uc_price NUMERIC,
  stage_when_terminated TEXT,
  termination_reason TEXT,
  terminated_date DATE,
  agent_name TEXT,
  agent_phone TEXT,
  
  -- Tracker fields
  tracker_status TEXT DEFAULT 'watching', -- watching, relisted, uc_by_others, sold, archived
  follow_up_days INTEGER DEFAULT 14,
  last_checked DATE,
  new_list_price NUMERIC,
  eventual_sold_price NUMERIC,
  note_log JSONB DEFAULT '[]',
  latitude NUMERIC,
  longitude NUMERIC,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE terminated_deals ENABLE ROW LEVEL SECURITY;

-- RLS Policies (match your existing pattern)
CREATE POLICY "Users can view own org terminated deals" ON terminated_deals
  FOR SELECT USING (true);
CREATE POLICY "Users can insert terminated deals" ON terminated_deals
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update terminated deals" ON terminated_deals
  FOR UPDATE USING (true);
CREATE POLICY "Users can delete terminated deals" ON terminated_deals
  FOR DELETE USING (true);

-- Pipeline notes + DD migration (if not already run)
ALTER TABLE pipeline_deals ADD COLUMN IF NOT EXISTS note_log JSONB DEFAULT '[]';
ALTER TABLE pipeline_deals ADD COLUMN IF NOT EXISTS dd_type TEXT DEFAULT 'calendar';

-- Buyer info on deals_closed (if not already run)
ALTER TABLE deals_closed ADD COLUMN IF NOT EXISTS buyer_name TEXT;
ALTER TABLE deals_closed ADD COLUMN IF NOT EXISTS buyer_company TEXT;
ALTER TABLE deals_closed ADD COLUMN IF NOT EXISTS buyer_partners TEXT[] DEFAULT '{}';
ALTER TABLE deals_closed ADD COLUMN IF NOT EXISTS latitude NUMERIC;
ALTER TABLE deals_closed ADD COLUMN IF NOT EXISTS longitude NUMERIC;
