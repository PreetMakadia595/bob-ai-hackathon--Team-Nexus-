-- Migration: Add Shipment Cost (INR), Expected Time (ETA), and Corridor Blockage Time Windows
-- Run this script in your Supabase SQL Editor:

-- 1. Add cost_inr, expected_time, departure_time to trips table
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS cost_inr numeric(12, 2);
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS expected_time text;
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS departure_time timestamptz DEFAULT now();

-- 2. Add end_date and clearance_time to disruptions table for precise corridor blockage time windows
ALTER TABLE public.disruptions ADD COLUMN IF NOT EXISTS end_date timestamptz;
ALTER TABLE public.disruptions ADD COLUMN IF NOT EXISTS clearance_time text;

-- 3. Add cost_delta to shipment_disruption_impact for audit trail
ALTER TABLE public.shipment_disruption_impact ADD COLUMN IF NOT EXISTS cost_delta numeric(12, 2);

-- 4. Create performance indexes
CREATE INDEX IF NOT EXISTS idx_trips_cost_inr ON public.trips(cost_inr);
CREATE INDEX IF NOT EXISTS idx_disruptions_end_date ON public.disruptions(end_date);
