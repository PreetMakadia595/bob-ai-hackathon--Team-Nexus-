-- FleetFlow: Add missing columns to maintenance_logs table
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Paste & Run

ALTER TABLE maintenance_logs
  ADD COLUMN IF NOT EXISTS service_type text,
  ADD COLUMN IF NOT EXISTS completed_at timestamp;

-- Verify:
-- SELECT id, service_type, completed_at FROM maintenance_logs LIMIT 5;
