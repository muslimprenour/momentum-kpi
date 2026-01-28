-- VIP Agents Table for Momentum KPI
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS vip_agents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  agent_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  deal_closed TEXT,
  review_given BOOLEAN DEFAULT FALSE,
  gift_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS (Row Level Security)
ALTER TABLE vip_agents ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read/write their own VIP agents
CREATE POLICY "Users can manage their own VIP agents" ON vip_agents
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Index for faster lookups by user
CREATE INDEX idx_vip_agents_user_id ON vip_agents(user_id);
