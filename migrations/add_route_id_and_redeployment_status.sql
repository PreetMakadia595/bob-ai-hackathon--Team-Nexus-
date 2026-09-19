-- Migration: Add RouteID and Redeployment action support
-- Run this in your Supabase SQL Editor:

ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS route_id text DEFAULT 'EW785';
ALTER TABLE public.disruptions ADD COLUMN IF NOT EXISTS route_id text;
ALTER TABLE public.shipment_disruption_impact ADD COLUMN IF NOT EXISTS route_id text;

DO $$
BEGIN
  ALTER TABLE public.shipment_disruption_impact DROP CONSTRAINT IF EXISTS shipment_disruption_impact_recommended_action_check;
  ALTER TABLE public.shipment_disruption_impact ADD CONSTRAINT shipment_disruption_impact_recommended_action_check 
    CHECK (recommended_action IN ('reroute', 'delay', 'redeployment', 'reassign_carrier', 'no_action'));
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_trips_route_id ON public.trips(route_id);
CREATE INDEX IF NOT EXISTS idx_disruptions_route_id ON public.disruptions(route_id);
