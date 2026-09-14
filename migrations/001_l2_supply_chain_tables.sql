-- =============================================================================
-- SupplyShield L2: Supply Chain Disruption + Cold Chain Tables
-- =============================================================================
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Paste & Run
-- Prerequisites: Existing tables (vehicles, trips, drivers, profiles) must exist.
-- =============================================================================

-- ── 1. disruptions ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS disruptions (
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

CREATE INDEX IF NOT EXISTS idx_disruptions_status ON disruptions(status);
CREATE INDEX IF NOT EXISTS idx_disruptions_region ON disruptions(region);
CREATE INDEX IF NOT EXISTS idx_disruptions_severity ON disruptions(severity);

-- ── 2. shipment_disruption_impact ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS shipment_disruption_impact (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  disruption_id       uuid NOT NULL REFERENCES disruptions(id) ON DELETE CASCADE,
  trip_id             uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  impact_level        text NOT NULL CHECK (impact_level IN ('low', 'medium', 'high', 'blocked')),
  recommended_action  text NOT NULL CHECK (recommended_action IN ('reroute', 'delay', 'reassign_carrier', 'no_action')),
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sdi_disruption ON shipment_disruption_impact(disruption_id);
CREATE INDEX IF NOT EXISTS idx_sdi_trip ON shipment_disruption_impact(trip_id);
CREATE INDEX IF NOT EXISTS idx_sdi_impact_level ON shipment_disruption_impact(impact_level);

-- ── 3. fleet_redeployment_suggestions ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS fleet_redeployment_suggestions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id        uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  current_status    text,
  idle_since        timestamptz,
  suggested_trip_id uuid REFERENCES trips(id) ON DELETE SET NULL,
  suggested_region  text,
  reason            text,
  priority_score    numeric NOT NULL DEFAULT 0,
  status            text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'dismissed')),
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_frs_vehicle ON fleet_redeployment_suggestions(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_frs_status ON fleet_redeployment_suggestions(status);

-- ── 4. cold_chain_shipments ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cold_chain_shipments (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id           uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  cargo_type        text NOT NULL CHECK (cargo_type IN ('vaccine', 'perishable', 'pharma', 'other')),
  required_min_temp numeric NOT NULL,
  required_max_temp numeric NOT NULL,
  cargo_value       numeric,
  regulatory_class  text,
  status            text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'compromised')),
  created_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_temp_range CHECK (required_min_temp < required_max_temp)
);

CREATE INDEX IF NOT EXISTS idx_ccs_trip ON cold_chain_shipments(trip_id);
CREATE INDEX IF NOT EXISTS idx_ccs_status ON cold_chain_shipments(status);

-- ── 5. cold_chain_sensor_logs ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cold_chain_sensor_logs (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cold_chain_shipment_id  uuid NOT NULL REFERENCES cold_chain_shipments(id) ON DELETE CASCADE,
  timestamp               timestamptz NOT NULL DEFAULT now(),
  temperature             numeric NOT NULL,
  humidity                numeric,
  gps_lat                 numeric,
  gps_lng                 numeric,
  leg_number              integer DEFAULT 1,
  created_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ccsl_shipment ON cold_chain_sensor_logs(cold_chain_shipment_id);
CREATE INDEX IF NOT EXISTS idx_ccsl_timestamp ON cold_chain_sensor_logs(timestamp);

-- ── 6. temperature_excursions ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS temperature_excursions (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cold_chain_shipment_id  uuid NOT NULL REFERENCES cold_chain_shipments(id) ON DELETE CASCADE,
  sensor_log_id           uuid NOT NULL REFERENCES cold_chain_sensor_logs(id) ON DELETE CASCADE,
  detected_at             timestamptz NOT NULL DEFAULT now(),
  excursion_temp          numeric NOT NULL,
  threshold_breached      text NOT NULL CHECK (threshold_breached IN ('min', 'max')),
  duration_minutes        numeric DEFAULT 0,
  severity                text NOT NULL CHECK (severity IN ('minor', 'major', 'critical', 'regulatory_violation')),
  classification_notes    text,
  status                  text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved')),
  created_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_te_shipment ON temperature_excursions(cold_chain_shipment_id);
CREATE INDEX IF NOT EXISTS idx_te_status ON temperature_excursions(status);
CREATE INDEX IF NOT EXISTS idx_te_severity ON temperature_excursions(severity);

-- ── 7. carrier_alternatives ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS carrier_alternatives (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  disruption_id           uuid NOT NULL REFERENCES disruptions(id) ON DELETE CASCADE,
  original_carrier        text,
  suggested_carrier       text NOT NULL,
  estimated_delay_change  numeric,
  cost_delta              numeric,
  created_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ca_disruption ON carrier_alternatives(disruption_id);

-- =============================================================================
-- Row Level Security (RLS) Policies
-- =============================================================================
-- Enable RLS on all new tables
ALTER TABLE disruptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipment_disruption_impact ENABLE ROW LEVEL SECURITY;
ALTER TABLE fleet_redeployment_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cold_chain_shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE cold_chain_sensor_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE temperature_excursions ENABLE ROW LEVEL SECURITY;
ALTER TABLE carrier_alternatives ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read all new tables
CREATE POLICY "Authenticated users can read disruptions"
  ON disruptions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read shipment_disruption_impact"
  ON shipment_disruption_impact FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read fleet_redeployment_suggestions"
  ON fleet_redeployment_suggestions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read cold_chain_shipments"
  ON cold_chain_shipments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read cold_chain_sensor_logs"
  ON cold_chain_sensor_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read temperature_excursions"
  ON temperature_excursions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read carrier_alternatives"
  ON carrier_alternatives FOR SELECT TO authenticated USING (true);

-- Authenticated users can insert/update/delete (app-level RBAC enforces role checks)
CREATE POLICY "Authenticated users can insert disruptions"
  ON disruptions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update disruptions"
  ON disruptions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete disruptions"
  ON disruptions FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert shipment_disruption_impact"
  ON shipment_disruption_impact FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update shipment_disruption_impact"
  ON shipment_disruption_impact FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete shipment_disruption_impact"
  ON shipment_disruption_impact FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert fleet_redeployment_suggestions"
  ON fleet_redeployment_suggestions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update fleet_redeployment_suggestions"
  ON fleet_redeployment_suggestions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete fleet_redeployment_suggestions"
  ON fleet_redeployment_suggestions FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert cold_chain_shipments"
  ON cold_chain_shipments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update cold_chain_shipments"
  ON cold_chain_shipments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete cold_chain_shipments"
  ON cold_chain_shipments FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert cold_chain_sensor_logs"
  ON cold_chain_sensor_logs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update cold_chain_sensor_logs"
  ON cold_chain_sensor_logs FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete cold_chain_sensor_logs"
  ON cold_chain_sensor_logs FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert temperature_excursions"
  ON temperature_excursions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update temperature_excursions"
  ON temperature_excursions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete temperature_excursions"
  ON temperature_excursions FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert carrier_alternatives"
  ON carrier_alternatives FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update carrier_alternatives"
  ON carrier_alternatives FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete carrier_alternatives"
  ON carrier_alternatives FOR DELETE TO authenticated USING (true);

-- Done! Verify with:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;
