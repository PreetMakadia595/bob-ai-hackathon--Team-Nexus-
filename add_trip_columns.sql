-- FleetFlow: Add missing columns to trips table
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Paste & Run

ALTER TABLE trips
  ADD COLUMN IF NOT EXISTS origin text,
  ADD COLUMN IF NOT EXISTS destination text,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS final_odometer numeric;

-- Verify:
-- SELECT id, origin, destination, notes, final_odometer FROM trips LIMIT 5;
