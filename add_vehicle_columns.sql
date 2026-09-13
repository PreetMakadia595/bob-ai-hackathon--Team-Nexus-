-- FleetFlow: Add missing columns to vehicles table
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Paste & Run

ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS type   text NOT NULL DEFAULT 'Truck',
  ADD COLUMN IF NOT EXISTS region text;

-- Verify:
-- SELECT id, model, type, region FROM vehicles LIMIT 5;
