-- Add show_revenue_home preference column to users table
-- Run this in Supabase SQL Editor

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS show_revenue_home BOOLEAN DEFAULT true;

-- Comment for clarity
COMMENT ON COLUMN users.show_revenue_home IS 'User preference: show YTD revenue widget on home page';
