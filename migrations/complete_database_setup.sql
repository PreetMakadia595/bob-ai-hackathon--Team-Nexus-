-- =============================================================================
-- FleetFlow & L2 Supply Chain Optimizer: COMPLETE DATABASE SETUP SCRIPT
-- =============================================================================
-- Instructions:
-- 1. Open your Supabase Dashboard: https://supabase.com/dashboard
-- 2. Go to: SQL Editor -> New Query
-- 3. Paste this ENTIRE script and click "Run"
-- =============================================================================

-- ── 1. Enable Extensions ──────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── 2. User Profiles & Role-Based Access Control (RBAC) ──────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       text,
  role        text NOT NULL DEFAULT 'manager' CHECK (role IN ('manager', 'dispatcher', 'safety', 'finance')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Trigger to automatically create/update profile when an auth user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'role', 'manager')
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      role = COALESCE(EXCLUDED.role, profiles.role);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Synchronize any existing auth.users into profiles
INSERT INTO public.profiles (id, email, role)
SELECT id, email, COALESCE(raw_user_meta_data->>'role', 'manager')
FROM auth.users
ON CONFLICT (id) DO UPDATE
SET role = EXCLUDED.role, email = EXCLUDED.email;

-- ── 3. Base Fleet Management Tables ──────────────────────────────────────────

-- Vehicles Table
CREATE TABLE IF NOT EXISTS public.vehicles (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model         text NOT NULL,
  license_plate text NOT NULL UNIQUE,
  type          text NOT NULL DEFAULT 'Truck',
  region        text,
  max_capacity  numeric,
  odometer      numeric DEFAULT 0,
  status        text NOT NULL DEFAULT 'Available' CHECK (status IN ('Available', 'On Trip', 'In Shop', 'Suspended')),
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Drivers Table
CREATE TABLE IF NOT EXISTS public.drivers (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name           text NOT NULL,
  license_type   text NOT NULL,
  license_expiry timestamptz,
  status         text NOT NULL DEFAULT 'Off Duty' CHECK (status IN ('On Duty', 'Off Duty', 'Suspended')),
  safety_score   numeric NOT NULL DEFAULT 100,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- Trips Table
CREATE TABLE IF NOT EXISTS public.trips (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id      uuid REFERENCES public.vehicles(id) ON DELETE SET NULL,
  driver_id       uuid REFERENCES public.drivers(id) ON DELETE SET NULL,
  cargo_weight    numeric,
  origin          text,
  destination     text,
  notes           text,
  final_odometer  numeric,
  status          text NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Dispatched', 'Completed', 'Cancelled')),
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Maintenance Logs Table
CREATE TABLE IF NOT EXISTS public.maintenance_logs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id   uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  description  text NOT NULL,
  cost         numeric NOT NULL DEFAULT 0,
  date         date NOT NULL DEFAULT CURRENT_DATE,
  service_type text,
  completed_at timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Fuel Logs Table
CREATE TABLE IF NOT EXISTS public.fuel_logs (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id       uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  liters           numeric NOT NULL,
  cost             numeric NOT NULL,
  date             date NOT NULL DEFAULT CURRENT_DATE,
  odometer_reading numeric,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- ── 4. L2 Supply Chain Disruption & Cold Chain Tables ────────────────────────

-- Disruptions Table
CREATE TABLE IF NOT EXISTS public.disruptions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type        text NOT NULL CHECK (type IN ('weather', 'port_strike', 'geopolitical', 'other')),
  title       text NOT NULL,
  description text,
  region      text NOT NULL,
  severity    text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status      text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'monitoring')),
  start_date  timestamptz NOT NULL DEFAULT now(),
  end_date    timestamptz,
  source      text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Shipment Disruption Impact Table
CREATE TABLE IF NOT EXISTS public.shipment_disruption_impact (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  disruption_id       uuid NOT NULL REFERENCES public.disruptions(id) ON DELETE CASCADE,
  trip_id             uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  impact_level        text NOT NULL CHECK (impact_level IN ('low', 'medium', 'high', 'blocked')),
  recommended_action  text NOT NULL CHECK (recommended_action IN ('reroute', 'delay', 'reassign_carrier', 'no_action')),
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- Fleet Redeployment Suggestions Table
CREATE TABLE IF NOT EXISTS public.fleet_redeployment_suggestions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id        uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  current_status    text,
  idle_since        timestamptz,
  suggested_trip_id uuid REFERENCES public.trips(id) ON DELETE SET NULL,
  suggested_region  text,
  reason            text,
  priority_score    numeric NOT NULL DEFAULT 0,
  status            text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'dismissed')),
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- Cold Chain Shipments Table
CREATE TABLE IF NOT EXISTS public.cold_chain_shipments (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id           uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  cargo_type        text NOT NULL CHECK (cargo_type IN ('vaccine', 'perishable', 'pharma', 'other')),
  required_min_temp numeric NOT NULL,
  required_max_temp numeric NOT NULL,
  cargo_value       numeric,
  regulatory_class  text,
  status            text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'compromised')),
  created_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_temp_range CHECK (required_min_temp < required_max_temp)
);

-- Cold Chain Sensor Logs Table
CREATE TABLE IF NOT EXISTS public.cold_chain_sensor_logs (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cold_chain_shipment_id  uuid NOT NULL REFERENCES public.cold_chain_shipments(id) ON DELETE CASCADE,
  timestamp               timestamptz NOT NULL DEFAULT now(),
  temperature             numeric NOT NULL,
  humidity                numeric,
  gps_lat                 numeric,
  gps_lng                 numeric,
  leg_number              integer DEFAULT 1,
  created_at              timestamptz NOT NULL DEFAULT now()
);

-- Temperature Excursions Table
CREATE TABLE IF NOT EXISTS public.temperature_excursions (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cold_chain_shipment_id  uuid NOT NULL REFERENCES public.cold_chain_shipments(id) ON DELETE CASCADE,
  sensor_log_id           uuid NOT NULL REFERENCES public.cold_chain_sensor_logs(id) ON DELETE CASCADE,
  detected_at             timestamptz NOT NULL DEFAULT now(),
  excursion_temp          numeric NOT NULL,
  threshold_breached      text NOT NULL CHECK (threshold_breached IN ('min', 'max')),
  duration_minutes        numeric DEFAULT 0,
  severity                text NOT NULL CHECK (severity IN ('minor', 'major', 'critical', 'regulatory_violation')),
  classification_notes    text,
  status                  text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved')),
  created_at              timestamptz NOT NULL DEFAULT now()
);

-- Carrier Alternatives Table
CREATE TABLE IF NOT EXISTS public.carrier_alternatives (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  disruption_id           uuid NOT NULL REFERENCES public.disruptions(id) ON DELETE CASCADE,
  original_carrier        text,
  suggested_carrier       text NOT NULL,
  estimated_delay_change  numeric,
  cost_delta              numeric,
  created_at              timestamptz NOT NULL DEFAULT now()
);

-- ── 5. Indexes for Performance ───────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON public.vehicles(status);
CREATE INDEX IF NOT EXISTS idx_vehicles_region ON public.vehicles(region);
CREATE INDEX IF NOT EXISTS idx_drivers_status ON public.drivers(status);
CREATE INDEX IF NOT EXISTS idx_trips_status ON public.trips(status);
CREATE INDEX IF NOT EXISTS idx_trips_vehicle ON public.trips(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_trips_driver ON public.trips(driver_id);
CREATE INDEX IF NOT EXISTS idx_disruptions_status ON public.disruptions(status);
CREATE INDEX IF NOT EXISTS idx_disruptions_region ON public.disruptions(region);
CREATE INDEX IF NOT EXISTS idx_sdi_disruption ON public.shipment_disruption_impact(disruption_id);
CREATE INDEX IF NOT EXISTS idx_sdi_trip ON public.shipment_disruption_impact(trip_id);
CREATE INDEX IF NOT EXISTS idx_frs_vehicle ON public.fleet_redeployment_suggestions(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_ccs_trip ON public.cold_chain_shipments(trip_id);
CREATE INDEX IF NOT EXISTS idx_ccsl_shipment ON public.cold_chain_sensor_logs(cold_chain_shipment_id);
CREATE INDEX IF NOT EXISTS idx_ccsl_timestamp ON public.cold_chain_sensor_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_te_shipment ON public.temperature_excursions(cold_chain_shipment_id);
CREATE INDEX IF NOT EXISTS idx_te_status ON public.temperature_excursions(status);

-- ── 6. Row Level Security (RLS) Configuration ────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fuel_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disruptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipment_disruption_impact ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fleet_redeployment_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cold_chain_shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cold_chain_sensor_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.temperature_excursions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carrier_alternatives ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  tbl text;
  tables text[] := ARRAY[
    'profiles', 'vehicles', 'drivers', 'trips', 'maintenance_logs',
    'fuel_logs', 'disruptions', 'shipment_disruption_impact',
    'fleet_redeployment_suggestions', 'cold_chain_shipments',
    'cold_chain_sensor_logs', 'temperature_excursions', 'carrier_alternatives'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.%I', tbl);
    EXECUTE format('CREATE POLICY "Allow all for authenticated users" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)', tbl);
    
    EXECUTE format('DROP POLICY IF EXISTS "Allow select for anon" ON public.%I', tbl);
    EXECUTE format('CREATE POLICY "Allow select for anon" ON public.%I FOR SELECT TO anon USING (true)', tbl);
  END LOOP;
END $$;

-- ── 7. Enable Realtime Replication ──────────────────────────────────────────
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE 
    public.vehicles,
    public.drivers,
    public.trips,
    public.maintenance_logs,
    public.fuel_logs,
    public.disruptions,
    public.shipment_disruption_impact,
    public.fleet_redeployment_suggestions,
    public.cold_chain_shipments,
    public.cold_chain_sensor_logs,
    public.temperature_excursions;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;
