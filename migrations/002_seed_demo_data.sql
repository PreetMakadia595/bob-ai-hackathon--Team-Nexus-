-- =============================================================================
-- SupplyShield L2: Rich Demonstration & Showcase Seed Data
-- =============================================================================
-- Run AFTER 001_l2_supply_chain_tables.sql or complete_database_setup.sql
-- =============================================================================

DO $$
DECLARE
  v_v1 uuid; v_v2 uuid; v_v3 uuid; v_v4 uuid; v_v5 uuid; v_v6 uuid; v_v7 uuid; v_v8 uuid; v_v9 uuid; v_v10 uuid; v_v11 uuid;
  v_d1 uuid; v_d2 uuid; v_d3 uuid; v_d4 uuid; v_d5 uuid; v_d6 uuid; v_d7 uuid; v_d8 uuid;
  v_t1 uuid; v_t2 uuid; v_t3 uuid; v_t4 uuid; v_t5 uuid; v_t6 uuid; v_t7 uuid;
  v_dis1 uuid; v_dis2 uuid; v_dis3 uuid; v_dis4 uuid;
  v_cc1 uuid; v_cc2 uuid;
  v_s1 uuid; v_s2 uuid; v_s3 uuid; v_s4 uuid; v_s5 uuid;
BEGIN
  -- ── 1. Vehicles ────────────────────────────────────────────────────────────
  INSERT INTO public.vehicles (model, license_plate, type, region, max_capacity, odometer, status)
  VALUES
    ('Tata Prima 4028.S (Heavy Haulage)', 'MH12AB1001', 'Truck', 'West', 28000, 48200, 'Available')
  RETURNING id INTO v_v1;

  INSERT INTO public.vehicles (model, license_plate, type, region, max_capacity, odometer, status)
  VALUES
    ('BharatBenz 3528C Reefer (Cold Chain)', 'DL01EF3003', 'Truck', 'North', 26000, 64500, 'On Trip')
  RETURNING id INTO v_v2;

  INSERT INTO public.vehicles (model, license_plate, type, region, max_capacity, odometer, status)
  VALUES
    ('Ashok Leyland 2820 Multi-Axle', 'TN09CD2002', 'Truck', 'South', 20000, 89100, 'On Trip')
  RETURNING id INTO v_v3;

  INSERT INTO public.vehicles (model, license_plate, type, region, max_capacity, odometer, status)
  VALUES
    ('Volvo FM 420 Heavy Cargo', 'GJ01XY7788', 'Truck', 'West', 32000, 31400, 'Available')
  RETURNING id INTO v_v4;

  INSERT INTO public.vehicles (model, license_plate, type, region, max_capacity, odometer, status)
  VALUES
    ('Mahindra Furio 14 Reefer Van', 'MH04KL5521', 'Van', 'West', 9000, 22800, 'On Trip')
  RETURNING id INTO v_v5;

  INSERT INTO public.vehicles (model, license_plate, type, region, max_capacity, odometer, status)
  VALUES
    ('Isuzu D-Max Rapid Dispatch', 'KA02MN9912', 'Van', 'South', 3500, 18300, 'Available')
  RETURNING id INTO v_v6;

  INSERT INTO public.vehicles (model, license_plate, type, region, max_capacity, odometer, status)
  VALUES
    ('Eicher Pro 6028 Heavy Tipper', 'WB02OP3344', 'Truck', 'East', 22000, 55700, 'On Trip')
  RETURNING id INTO v_v7;

  INSERT INTO public.vehicles (model, license_plate, type, region, max_capacity, odometer, status)
  VALUES
    ('Scania R500 Long Haul', 'HR55QR6611', 'Truck', 'North', 30000, 112000, 'In Shop')
  RETURNING id INTO v_v8;

  INSERT INTO public.vehicles (model, license_plate, type, region, max_capacity, odometer, status)
  VALUES
    ('Tata Ultra T.16 Reefer', 'TS07ST8899', 'Van', 'South', 12000, 34900, 'Available')
  RETURNING id INTO v_v9;

  INSERT INTO public.vehicles (model, license_plate, type, region, max_capacity, odometer, status)
  VALUES
    ('Force Traveller Express Cargo', 'RJ14UV2233', 'Van', 'North', 4500, 41200, 'Available')
  RETURNING id INTO v_v10;

  INSERT INTO public.vehicles (model, license_plate, type, region, max_capacity, odometer, status)
  VALUES
    ('Ashok Leyland Captain 40i', 'KL07WX4455', 'Truck', 'South', 24000, 78500, 'Suspended')
  RETURNING id INTO v_v11;

  -- ── 2. Drivers ─────────────────────────────────────────────────────────────
  INSERT INTO public.drivers (name, license_type, license_expiry, status, safety_score)
  VALUES
    ('Rajesh Sharma', 'Commercial', now() + interval '180 days', 'On Duty', 98)
  RETURNING id INTO v_d1;

  INSERT INTO public.drivers (name, license_type, license_expiry, status, safety_score)
  VALUES
    ('Suresh Patil', 'Heavy Motor Vehicle', now() + interval '90 days', 'On Duty', 94)
  RETURNING id INTO v_d2;

  INSERT INTO public.drivers (name, license_type, license_expiry, status, safety_score)
  VALUES
    ('Amit Kumar', 'Hazardous Goods', now() + interval '300 days', 'On Duty', 99)
  RETURNING id INTO v_d3;

  INSERT INTO public.drivers (name, license_type, license_expiry, status, safety_score)
  VALUES
    ('Kiran Yadav', 'Commercial', now() + interval '14 days', 'Off Duty', 88)
  RETURNING id INTO v_d4;

  INSERT INTO public.drivers (name, license_type, license_expiry, status, safety_score)
  VALUES
    ('Venkatesh Rao', 'Heavy Motor Vehicle', now() + interval '240 days', 'On Duty', 95)
  RETURNING id INTO v_d5;

  INSERT INTO public.drivers (name, license_type, license_expiry, status, safety_score)
  VALUES
    ('Manpreet Singh', 'Commercial', now() + interval '320 days', 'Off Duty', 97)
  RETURNING id INTO v_d6;

  INSERT INTO public.drivers (name, license_type, license_expiry, status, safety_score)
  VALUES
    ('Pooja Deshmukh', 'Passenger', now() + interval '210 days', 'Off Duty', 99)
  RETURNING id INTO v_d7;

  INSERT INTO public.drivers (name, license_type, license_expiry, status, safety_score)
  VALUES
    ('Rameshwar Nath', 'Heavy Motor Vehicle', now() - interval '20 days', 'Suspended', 72)
  RETURNING id INTO v_d8;

  -- ── 3. Trips ───────────────────────────────────────────────────────────────
  INSERT INTO public.trips (vehicle_id, driver_id, cargo_weight, origin, destination, notes, status)
  VALUES
    (v_v2, v_d3, 6800, 'Mumbai Central Logistics Hub (Cold Depot)', 'Ahmedabad Pharma Distribution Center', 'URGENT: Rotavirus & MMR Vaccine Batch #VX-8842. Maintain 2°C - 8°C unbroken cold chain.', 'Dispatched')
  RETURNING id INTO v_t1;

  INSERT INTO public.trips (vehicle_id, driver_id, cargo_weight, origin, destination, notes, status)
  VALUES
    (v_v3, v_d5, 18500, 'Chennai Port Container Terminal 2', 'Bengaluru Electronic City Tech Park', 'High-value semiconductor fabrication components and server racks.', 'Dispatched')
  RETURNING id INTO v_t2;

  INSERT INTO public.trips (vehicle_id, driver_id, cargo_weight, origin, destination, notes, status)
  VALUES
    (v_v5, v_d1, 3200, 'Pune Serum Bio-Tech Cluster', 'Hyderabad Genome Valley Research Depot', 'Monoclonal antibody therapeutics ($100K+ value). Continuous sensor logging active.', 'Dispatched')
  RETURNING id INTO v_t3;

  INSERT INTO public.trips (vehicle_id, driver_id, cargo_weight, origin, destination, notes, status)
  VALUES
    (v_v7, v_d2, 16000, 'Kolkata Haldia Marine Port', 'Patna Central Regional Logistics Park', 'FMCG and packaged consumer goods transit.', 'Dispatched')
  RETURNING id INTO v_t4;

  INSERT INTO public.trips (vehicle_id, driver_id, cargo_weight, origin, destination, notes, status)
  VALUES
    (v_v4, v_d6, 24000, 'Kandla Heavy Machinery Dock', 'Nagpur Multi-modal International Cargo Hub', 'Heavy industrial pump turbines and replacement assemblies.', 'Draft')
  RETURNING id INTO v_t5;

  INSERT INTO public.trips (vehicle_id, driver_id, cargo_weight, origin, destination, notes, status, final_odometer)
  VALUES
    (v_v1, v_d1, 21500, 'Delhi Gateway Cargo Terminal', 'Jaipur Integrated Transport Hub', 'Automotive tier-1 transmission units. Delivered without defect.', 'Completed', 48200)
  RETURNING id INTO v_t6;

  INSERT INTO public.trips (vehicle_id, driver_id, cargo_weight, origin, destination, notes, status)
  VALUES
    (v_v8, v_d4, 14000, 'Kochi Port Maritime Terminal', 'Coimbatore Textile Engineering Complex', 'Cancelled due to severe early monsoon alert.', 'Cancelled')
  RETURNING id INTO v_t7;

  -- ── 4. Disruptions ─────────────────────────────────────────────────────────
  INSERT INTO public.disruptions (type, title, description, region, severity, status, start_date, source)
  VALUES
    ('weather', 'Severe Cyclone Biparjoy — Western Coastline (Gujarat/Maharashtra)',
     'Category 3 cyclone making landfall near Kandla/Mundra coastal corridor. Severe flooding on NH-8 & NH-27. Kandla port container terminals suspended for 48 hours.',
     'West', 'critical', 'active', now() - interval '4 hours', 'IMD Meteorological Doppler Radar Advisory')
  RETURNING id INTO v_dis1;

  INSERT INTO public.disruptions (type, title, description, region, severity, status, start_date, source)
  VALUES
    ('port_strike', 'Dock Workers & Crane Operators Strike — Chennai Port Terminal',
     'Indefinite labor stoppage by Chennai Port handling unions. Over 4,200 TEU container backlog. Inward & outward freight halted with estimated 72+ hour clearance delay.',
     'South', 'high', 'active', now() - interval '26 hours', 'Indian Ports Association & Reuters Trade Bulletin')
  RETURNING id INTO v_dis2;

  INSERT INTO public.disruptions (type, title, description, region, severity, status, start_date, source)
  VALUES
    ('weather', 'Monsoon Landslide & Highway Collapse — Western Ghats (Pune-Goa NH-66)',
     'Major landslide blocking two arterial lanes on NH-66. Traffic diverted through interior mountain routes with heavy axle weight restrictions.',
     'West', 'high', 'active', now() - interval '14 hours', 'National Highway Authority of India (NHAI)')
  RETURNING id INTO v_dis3;

  INSERT INTO public.disruptions (type, title, description, region, severity, status, start_date, source)
  VALUES
    ('geopolitical', 'Interstate Transit Checkpoint Blockade — Northern Corridor',
     'Emergency highway diversions and strict border freight inspections along Delhi-Jaipur highway causing 8-12 hour transit delays.',
     'North', 'medium', 'monitoring', now() - interval '48 hours', 'Ministry of Road Transport & Highways (MoRTH)')
  RETURNING id INTO v_dis4;

  -- ── 5. Shipment Disruption Impacts ─────────────────────────────────────────
  INSERT INTO public.shipment_disruption_impact (disruption_id, trip_id, impact_level, recommended_action, notes)
  VALUES
    (v_dis1, v_t1, 'high', 'reroute', 'Direct route NH-8 flooded near Surat. Reroute recommendation: Divert via NH-48 -> Central Inland Expressway (Vadodara bypass). Adds 65 km (+2.5 hrs) but bypasses coastal cyclone impact zone completely.'),
    (v_dis2, v_t2, 'blocked', 'reassign_carrier', 'Chennai Port gate operations at full standstill. Recommended alternative: Divert container clearance to Krishnapatnam Deepwater Port with dedicated inland rail-freight link.'),
    (v_dis3, v_t3, 'high', 'delay', 'NH-66 closed for heavy freight. Hold shipment at Pune Temperature-Controlled Warehouse for 12 hours until secondary route cleared.'),
    (v_dis4, v_t4, 'low', 'no_action', 'Buffer time in delivery schedule is 4.5 hours, exceeding anticipated 30-minute checkpoint delay.');

  -- ── 6. Carrier Alternatives ────────────────────────────────────────────────
  INSERT INTO public.carrier_alternatives (disruption_id, original_carrier, suggested_carrier, estimated_delay_change, cost_delta)
  VALUES
    (v_dis1, 'Western Express Logistics', 'Central Inland Freight Logistics', -28, 14500),
    (v_dis1, 'Gujarat Coastal Roadways', 'Apex Intermodal Rail Freight', -36, 22000),
    (v_dis2, 'Chennai Coastal Container Line', 'Krishnapatnam Express Line', -54, 18000),
    (v_dis2, 'Southern Maritime Transport', 'Ennore Multimodal Cargo Hub', -40, 11500);

  -- ── 7. Fleet Redeployment Suggestions ──────────────────────────────────────
  INSERT INTO public.fleet_redeployment_suggestions (vehicle_id, current_status, idle_since, suggested_region, reason, priority_score)
  VALUES
    (v_v1, 'Available', now() - interval '38 hours', 'West Corridor (Surat/Ahmedabad Detour)', 'Severe surge in freight demand along Central detour route due to coastal cyclone diversion. 28T capacity perfectly matches stranded container loads.', 94),
    (v_v4, 'Available', now() - interval '52 hours', 'Central Hub (Indore/Nagpur)', 'Extreme idle duration (52h). Industrial freight backlog in Central zone requires heavy tractor-trailer capacity.', 88),
    (v_v9, 'Available', now() - interval '28 hours', 'South (Bengaluru Cold Hub)', 'High-value temperature-controlled pharmaceutical consignment awaiting reefer dispatch following Chennai port diversion.', 82),
    (v_v6, 'Available', now() - interval '14 hours', 'South (Chennai Suburban Emergency Relays)', 'Rapid last-mile dispatch vehicle suited for urgent medical supply bypass around congested arterial checkpoints.', 68);

  -- ── 8. Cold Chain Shipments ────────────────────────────────────────────────
  INSERT INTO public.cold_chain_shipments (trip_id, cargo_type, required_min_temp, required_max_temp, cargo_value, regulatory_class, status)
  VALUES
    (v_t1, 'vaccine', 2.0, 8.0, 4200000, 'WHO PQS E006 / CDC Vaccine Standards', 'active')
  RETURNING id INTO v_cc1;

  INSERT INTO public.cold_chain_shipments (trip_id, cargo_type, required_min_temp, required_max_temp, cargo_value, regulatory_class, status)
  VALUES
    (v_t3, 'pharma', 2.0, 8.0, 8500000, 'FDA 21 CFR Part 11 / EU GDP Compliance', 'compromised')
  RETURNING id INTO v_cc2;

  -- ── 9. Sensor Telemetry Logs ───────────────────────────────────────────────
  -- Normal Vaccine shipment telemetry
  INSERT INTO public.cold_chain_sensor_logs (cold_chain_shipment_id, timestamp, temperature, humidity, gps_lat, gps_lng, leg_number)
  VALUES
    (v_cc1, now() - interval '5 hours', 3.8, 45, 19.0760, 72.8777, 1),
    (v_cc1, now() - interval '4 hours', 4.2, 46, 19.2183, 72.9781, 1),
    (v_cc1, now() - interval '3 hours', 4.9, 48, 19.5500, 73.0800, 1),
    (v_cc1, now() - interval '2 hours', 5.3, 47, 20.1200, 73.1500, 1),
    (v_cc1, now() - interval '1 hour', 4.8, 45, 20.6500, 73.0200, 1);

  -- Compromised Biologics shipment telemetry with spike
  INSERT INTO public.cold_chain_sensor_logs (cold_chain_shipment_id, timestamp, temperature, humidity, gps_lat, gps_lng, leg_number)
  VALUES
    (v_cc2, now() - interval '4 hours', 4.2, 44, 18.5204, 73.8567, 1),
    (v_cc2, now() - interval '3 hours', 5.6, 49, 18.3100, 74.2200, 1),
    (v_cc2, now() - interval '2 hours', 8.9, 55, 18.0500, 74.8500, 1),
    (v_cc2, now() - interval '1 hour', 13.5, 62, 17.6800, 75.9000, 1),
    (v_cc2, now() - interval '20 minutes', 14.8, 66, 17.4500, 76.5500, 1)
  RETURNING id INTO v_s5;

  -- ── 10. Temperature Excursion ──────────────────────────────────────────────
  INSERT INTO public.temperature_excursions (cold_chain_shipment_id, sensor_log_id, detected_at, excursion_temp, threshold_breached, duration_minutes, severity, classification_notes, status)
  VALUES
    (v_cc2, v_s5, now() - interval '20 minutes', 14.8, 'max', 55, 'regulatory_violation',
     'CRITICAL FDA CFR 21 / EU GDP BREACH: Cargo temperature 14.8°C exceeded maximum limit (8.0°C) by +6.8°C for 55 minutes. Secondary reefer compressor failure flagged. Immediate dry-ice intervention mandatory.', 'open');

  -- ── 11. Maintenance Logs ───────────────────────────────────────────────────
  INSERT INTO public.maintenance_logs (vehicle_id, description, cost, date, service_type, completed_at)
  VALUES
    (v_v8, 'Complete engine overhaul & turbocharger replacement', 48500, CURRENT_DATE - 4, 'Engine Overhaul', null),
    (v_v2, 'Carrier Transicold Reefer unit calibration and refrigerant recharge', 16200, CURRENT_DATE - 12, 'Refrigeration System', now() - interval '12 days'),
    (v_v1, 'Front axle brake pad replacement & ABS sensor diagnostic', 11400, CURRENT_DATE - 20, 'Braking System', now() - interval '20 days'),
    (v_v3, 'Multi-axle pneumatic suspension check and leaf spring greasing', 8900, CURRENT_DATE - 27, 'Suspension', now() - interval '27 days'),
    (v_v4, 'Transmission fluid flush & 50,000km scheduled service', 14500, CURRENT_DATE - 40, 'Periodic Maintenance', now() - interval '40 days');

  -- ── 12. Fuel Logs ──────────────────────────────────────────────────────────
  INSERT INTO public.fuel_logs (vehicle_id, liters, cost, date, odometer_reading)
  VALUES
    (v_v1, 180, 17100, CURRENT_DATE - 2, 48200),
    (v_v1, 165, 15675, CURRENT_DATE - 8, 47600),
    (v_v2, 210, 19950, CURRENT_DATE - 1, 64500),
    (v_v2, 195, 18525, CURRENT_DATE - 6, 63800),
    (v_v3, 175, 16625, CURRENT_DATE - 3, 89100),
    (v_v3, 180, 17100, CURRENT_DATE - 10, 88400),
    (v_v4, 240, 22800, CURRENT_DATE - 12, 31400),
    (v_v5, 85, 8075, CURRENT_DATE - 2, 22800),
    (v_v7, 190, 18050, CURRENT_DATE - 3, 55700);

  RAISE NOTICE 'Showcase demo data populated successfully.';
END $$;
