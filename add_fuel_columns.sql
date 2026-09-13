-- FleetFlow: Add odometer reading column to fuel_logs table
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Paste & Run

ALTER TABLE fuel_logs
  ADD COLUMN IF NOT EXISTS odometer_reading numeric;

-- Verify:
-- SELECT id, odometer_reading FROM fuel_logs LIMIT 5;
