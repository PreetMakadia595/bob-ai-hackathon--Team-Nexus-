-- =============================================================================
-- FleetFlow L2: Demo Seed Data
-- =============================================================================
-- Run AFTER 001_l2_supply_chain_tables.sql
-- Inserts sample disruptions, cold chain shipments, sensor logs, and excursions
-- for demonstration purposes.
--
-- NOTE: This script references existing trip and vehicle IDs. If your trips/
-- vehicles tables are empty, insert some records first or adjust the IDs below.
-- =============================================================================

-- We use a DO block so we can reference existing records dynamically
DO $$
DECLARE
  v_trip_1   uuid;
  v_trip_2   uuid;
  v_trip_3   uuid;
  v_vehicle_1 uuid;
  v_vehicle_2 uuid;
  v_vehicle_3 uuid;
  v_disrupt_1 uuid;
  v_disrupt_2 uuid;
  v_disrupt_3 uuid;
  v_cc_ship_1 uuid;
  v_cc_ship_2 uuid;
  v_sensor_1  uuid;
  v_sensor_2  uuid;
  v_sensor_3  uuid;
  v_sensor_4  uuid;
BEGIN
  -- Grab existing trip IDs (first 3)
  SELECT id INTO v_trip_1 FROM trips LIMIT 1;
  SELECT id INTO v_trip_2 FROM trips OFFSET 1 LIMIT 1;
  SELECT id INTO v_trip_3 FROM trips OFFSET 2 LIMIT 1;

  -- Grab existing vehicle IDs (first 3)
  SELECT id INTO v_vehicle_1 FROM vehicles WHERE status = 'Available' LIMIT 1;
  SELECT id INTO v_vehicle_2 FROM vehicles WHERE status = 'Available' OFFSET 1 LIMIT 1;
  SELECT id INTO v_vehicle_3 FROM vehicles WHERE status = 'Available' OFFSET 2 LIMIT 1;

  -- Skip seeding if no trips or vehicles exist
  IF v_trip_1 IS NULL OR v_vehicle_1 IS NULL THEN
    RAISE NOTICE 'No existing trips or vehicles found. Skipping seed data.';
    RETURN;
  END IF;

  -- ── Disruptions ───────────────────────────────────────────────────────────
  INSERT INTO disruptions (id, type, title, description, region, severity, status, start_date, source)
  VALUES
    (gen_random_uuid(), 'weather', 'Cyclone Warning — Western Coast',
     'Category 3 cyclone expected to make landfall near Gujarat coast within 48 hours. Port operations suspended.',
     'West', 'critical', 'active', now() - interval '2 hours', 'IMD Weather Alert')
  RETURNING id INTO v_disrupt_1;

  INSERT INTO disruptions (id, type, title, description, region, severity, status, start_date, source)
  VALUES
    (gen_random_uuid(), 'port_strike', 'Dock Workers Strike — Chennai Port',
     'Indefinite strike by dock workers at Chennai Port. Container handling delayed by 72+ hours.',
     'South', 'high', 'active', now() - interval '1 day', 'Reuters')
  RETURNING id INTO v_disrupt_2;

  INSERT INTO disruptions (id, type, title, description, region, severity, status, start_date, end_date, source)
  VALUES
    (gen_random_uuid(), 'geopolitical', 'Border Checkpoint Delays — North Region',
     'Heightened security checks causing 4-6 hour delays at major checkpoints.',
     'North', 'medium', 'monitoring', now() - interval '3 days', now() + interval '5 days', 'MoD Advisory')
  RETURNING id INTO v_disrupt_3;

  -- ── Shipment Disruption Impact ────────────────────────────────────────────
  IF v_trip_1 IS NOT NULL THEN
    INSERT INTO shipment_disruption_impact (disruption_id, trip_id, impact_level, recommended_action, notes)
    VALUES
      (v_disrupt_1, v_trip_1, 'high', 'reroute', 'Trip origin/destination in cyclone-affected West region. Recommend reroute via Central corridor.');
  END IF;

  IF v_trip_2 IS NOT NULL THEN
    INSERT INTO shipment_disruption_impact (disruption_id, trip_id, impact_level, recommended_action, notes)
    VALUES
      (v_disrupt_2, v_trip_2, 'blocked', 'delay', 'Destination port under strike. No container handling available. Recommend 72-hour delay.');
  END IF;

  IF v_trip_3 IS NOT NULL THEN
    INSERT INTO shipment_disruption_impact (disruption_id, trip_id, impact_level, recommended_action, notes)
    VALUES
      (v_disrupt_3, v_trip_3, 'low', 'no_action', 'Minor checkpoint delays expected. Trip schedule buffer is sufficient.');
  END IF;

  -- ── Carrier Alternatives ──────────────────────────────────────────────────
  INSERT INTO carrier_alternatives (disruption_id, original_carrier, suggested_carrier, estimated_delay_change, cost_delta)
  VALUES
    (v_disrupt_1, 'Western Express Logistics', 'Central Freight Corp', -24, 15000),
    (v_disrupt_2, 'Chennai Port Services', 'Vizag Port Authority', -48, 8500);

  -- ── Fleet Redeployment Suggestions ────────────────────────────────────────
  IF v_vehicle_1 IS NOT NULL THEN
    INSERT INTO fleet_redeployment_suggestions (vehicle_id, current_status, idle_since, suggested_region, reason, priority_score)
    VALUES
      (v_vehicle_1, 'Available', now() - interval '36 hours', 'West', 'Cyclone disruption created demand spike in alternative routes through Central/West corridor', 85);
  END IF;

  IF v_vehicle_2 IS NOT NULL THEN
    INSERT INTO fleet_redeployment_suggestions (vehicle_id, current_status, idle_since, suggested_region, reason, priority_score)
    VALUES
      (v_vehicle_2, 'Available', now() - interval '18 hours', 'South', 'Port strike causing cargo backlog — additional vehicles needed for inland redistribution', 72);
  END IF;

  IF v_vehicle_3 IS NOT NULL THEN
    INSERT INTO fleet_redeployment_suggestions (vehicle_id, current_status, idle_since, suggested_region, reason, priority_score)
    VALUES
      (v_vehicle_3, 'Available', now() - interval '48 hours', 'North', 'Extended idle period — border checkpoint region has pending cargo backlog', 60);
  END IF;

  -- ── Cold Chain Shipments ──────────────────────────────────────────────────
  IF v_trip_1 IS NOT NULL THEN
    INSERT INTO cold_chain_shipments (id, trip_id, cargo_type, required_min_temp, required_max_temp, cargo_value, regulatory_class, status)
    VALUES
      (gen_random_uuid(), v_trip_1, 'vaccine', 2.0, 8.0, 2500000, 'WHO PQS E006', 'active')
    RETURNING id INTO v_cc_ship_1;
  END IF;

  IF v_trip_2 IS NOT NULL THEN
    INSERT INTO cold_chain_shipments (id, trip_id, cargo_type, required_min_temp, required_max_temp, cargo_value, regulatory_class, status)
    VALUES
      (gen_random_uuid(), v_trip_2, 'perishable', -18.0, -12.0, 350000, 'FSSAI Cold Chain', 'active')
    RETURNING id INTO v_cc_ship_2;
  END IF;

  -- ── Cold Chain Sensor Logs (for shipment 1 — vaccine) ─────────────────────
  IF v_cc_ship_1 IS NOT NULL THEN
    -- Normal readings
    INSERT INTO cold_chain_sensor_logs (id, cold_chain_shipment_id, timestamp, temperature, humidity, gps_lat, gps_lng, leg_number)
    VALUES
      (gen_random_uuid(), v_cc_ship_1, now() - interval '4 hours', 4.2, 45, 19.0760, 72.8777, 1)
    RETURNING id INTO v_sensor_1;

    INSERT INTO cold_chain_sensor_logs (id, cold_chain_shipment_id, timestamp, temperature, humidity, gps_lat, gps_lng, leg_number)
    VALUES
      (gen_random_uuid(), v_cc_ship_1, now() - interval '3 hours', 5.1, 42, 19.2183, 72.9781, 1)
    RETURNING id INTO v_sensor_2;

    -- Excursion reading (temp too high for vaccine)
    INSERT INTO cold_chain_sensor_logs (id, cold_chain_shipment_id, timestamp, temperature, humidity, gps_lat, gps_lng, leg_number)
    VALUES
      (gen_random_uuid(), v_cc_ship_1, now() - interval '1 hour', 10.5, 55, 19.4500, 73.1200, 1)
    RETURNING id INTO v_sensor_3;

    -- Create excursion record for the breach
    INSERT INTO temperature_excursions (cold_chain_shipment_id, sensor_log_id, detected_at, excursion_temp, threshold_breached, duration_minutes, severity, classification_notes, status)
    VALUES
      (v_cc_ship_1, v_sensor_3, now() - interval '1 hour', 10.5, 'max', 35,
       'regulatory_violation',
       'Vaccine cargo: temp 10.5°C exceeded max threshold 8.0°C by 2.5°C for 35 minutes. WHO PQS E006 regulatory limit exceeded (>30 min or >3°C deviation for vaccines).',
       'open');
  END IF;

  -- ── Cold Chain Sensor Logs (for shipment 2 — perishable) ──────────────────
  IF v_cc_ship_2 IS NOT NULL THEN
    INSERT INTO cold_chain_sensor_logs (id, cold_chain_shipment_id, timestamp, temperature, humidity, gps_lat, gps_lng, leg_number)
    VALUES
      (gen_random_uuid(), v_cc_ship_2, now() - interval '2 hours', -15.0, 30, 13.0827, 80.2707, 1)
    RETURNING id INTO v_sensor_4;

    -- Normal — within range, no excursion needed
  END IF;

  RAISE NOTICE 'Seed data inserted successfully.';
END $$;
