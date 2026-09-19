const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local if available
let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
let serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const envPath = path.resolve(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
      supabaseUrl = trimmed.split('=')[1]?.trim();
    }
    if (trimmed.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
      const val = trimmed.split('=')[1]?.trim();
      if (val && !val.includes('your-')) serviceRoleKey = val;
    }
    if (trimmed.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=') && !serviceRoleKey) {
      serviceRoleKey = trimmed.split('=')[1]?.trim();
    }
  }
}

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (or SUPABASE_SERVICE_ROLE_KEY) must be set in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function seed() {
  console.log('Seeding rich demonstration data for SupplyShield L2...');

  // 1. Clear existing sample records
  await supabase.from('temperature_excursions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('cold_chain_sensor_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('cold_chain_shipments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('carrier_alternatives').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('fleet_redeployment_suggestions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('shipment_disruption_impact').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('disruptions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('fuel_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('maintenance_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('trips').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('drivers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('vehicles').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  // 2. Vehicles
  const vehiclesData = [
    { model: 'Tata Prima 4028.S (Heavy Haulage)', license_plate: 'MH12AB1001', type: 'Truck', region: 'West', max_capacity: 28000, odometer: 48200, status: 'Available' },
    { model: 'BharatBenz 3528C Reefer (Cold Chain)', license_plate: 'DL01EF3003', type: 'Truck', region: 'North', max_capacity: 26000, odometer: 64500, status: 'On Trip' },
    { model: 'Ashok Leyland 2820 Multi-Axle', license_plate: 'TN09CD2002', type: 'Truck', region: 'South', max_capacity: 20000, odometer: 89100, status: 'On Trip' },
    { model: 'Volvo FM 420 Heavy Cargo', license_plate: 'GJ01XY7788', type: 'Truck', region: 'West', max_capacity: 32000, odometer: 31400, status: 'Available' },
    { model: 'Mahindra Furio 14 Reefer Van', license_plate: 'MH04KL5521', type: 'Van', region: 'West', max_capacity: 9000, odometer: 22800, status: 'On Trip' },
    { model: 'Isuzu D-Max Rapid Dispatch', license_plate: 'KA02MN9912', type: 'Van', region: 'South', max_capacity: 3500, odometer: 18300, status: 'Available' },
    { model: 'Eicher Pro 6028 Heavy Tipper', license_plate: 'WB02OP3344', type: 'Truck', region: 'East', max_capacity: 22000, odometer: 55700, status: 'On Trip' },
    { model: 'Scania R500 Long Haul', license_plate: 'HR55QR6611', type: 'Truck', region: 'North', max_capacity: 30000, odometer: 112000, status: 'In Shop' },
    { model: 'Tata Ultra T.16 Reefer', license_plate: 'TS07ST8899', type: 'Van', region: 'South', max_capacity: 12000, odometer: 34900, status: 'Available' },
    { model: 'Force Traveller Express Cargo', license_plate: 'RJ14UV2233', type: 'Van', region: 'North', max_capacity: 4500, odometer: 41200, status: 'Available' },
    { model: 'Ashok Leyland Captain 40i', license_plate: 'KL07WX4455', type: 'Truck', region: 'South', max_capacity: 24000, odometer: 78500, status: 'Suspended' },
  ];
  const { data: vList, error: vErr } = await supabase.from('vehicles').insert(vehiclesData).select();
  if (vErr) throw vErr;
  console.log('Vehicles inserted:', vList.length);

  const vMap = {};
  vList.forEach(v => { vMap[v.license_plate] = v.id; });

  // 3. Drivers
  const now = new Date();
  const addDays = (d) => new Date(now.getTime() + d * 86400000).toISOString();
  const driversData = [
    { name: 'Rajesh Sharma', license_type: 'Commercial', license_expiry: addDays(180), status: 'On Duty', safety_score: 98 },
    { name: 'Suresh Patil', license_type: 'Heavy Motor Vehicle', license_expiry: addDays(90), status: 'On Duty', safety_score: 94 },
    { name: 'Amit Kumar', license_type: 'Hazardous Goods', license_expiry: addDays(300), status: 'On Duty', safety_score: 99 },
    { name: 'Kiran Yadav', license_type: 'Commercial', license_expiry: addDays(14), status: 'Off Duty', safety_score: 88 },
    { name: 'Venkatesh Rao', license_type: 'Heavy Motor Vehicle', license_expiry: addDays(240), status: 'On Duty', safety_score: 95 },
    { name: 'Manpreet Singh', license_type: 'Commercial', license_expiry: addDays(320), status: 'Off Duty', safety_score: 97 },
    { name: 'Pooja Deshmukh', license_type: 'Passenger', license_expiry: addDays(210), status: 'Off Duty', safety_score: 99 },
    { name: 'Rameshwar Nath', license_type: 'Heavy Motor Vehicle', license_expiry: addDays(-20), status: 'Suspended', safety_score: 72 },
  ];
  const { data: dList, error: dErr } = await supabase.from('drivers').insert(driversData).select();
  if (dErr) throw dErr;
  console.log('Drivers inserted:', dList.length);
  const dMap = {};
  dList.forEach(d => { dMap[d.name] = d.id; });

  // 4. Trips
  const tripsData = [
    {
      vehicle_id: vMap['DL01EF3003'],
      driver_id: dMap['Amit Kumar'],
      cargo_weight: 6800,
      origin: 'Mumbai Central Logistics Hub (Cold Depot)',
      destination: 'Ahmedabad Pharma Distribution Center',
      route_id: 'WN412', // West Corridor
      notes: 'URGENT: Rotavirus & MMR Vaccine Batch #VX-8842. Maintain 2°C - 8°C unbroken cold chain.',
      status: 'Dispatched'
    },
    {
      vehicle_id: vMap['TN09CD2002'],
      driver_id: dMap['Venkatesh Rao'],
      cargo_weight: 18500,
      origin: 'Chennai Port Container Terminal 2',
      destination: 'Bengaluru Electronic City Tech Park',
      route_id: 'SE320', // South Corridor
      notes: 'High-value semiconductor fabrication components and server racks.',
      status: 'Dispatched'
    },
    {
      vehicle_id: vMap['MH04KL5521'],
      driver_id: dMap['Rajesh Sharma'],
      cargo_weight: 3200,
      origin: 'Pune Serum Bio-Tech Cluster',
      destination: 'Hyderabad Genome Valley Research Depot',
      route_id: 'CW550', // Central-West Corridor
      notes: 'Monoclonal antibody therapeutics ($100K+ value). Continuous sensor logging active.',
      status: 'Dispatched'
    },
    {
      vehicle_id: vMap['WB02OP3344'],
      driver_id: dMap['Suresh Patil'],
      cargo_weight: 16000,
      origin: 'Kolkata Haldia Marine Port',
      destination: 'Patna Central Regional Logistics Park',
      route_id: 'EW785', // East to West Route
      notes: 'FMCG and packaged consumer goods transit.',
      status: 'Dispatched'
    },
    {
      vehicle_id: vMap['GJ01XY7788'],
      driver_id: dMap['Manpreet Singh'],
      cargo_weight: 24000,
      origin: 'Kandla Heavy Machinery Dock',
      destination: 'Nagpur Multi-modal International Cargo Hub',
      route_id: 'WE786', // West to East Route
      notes: 'Heavy industrial pump turbines and replacement assemblies.',
      status: 'Draft'
    },
    {
      vehicle_id: vMap['MH12AB1001'],
      driver_id: dMap['Rajesh Sharma'],
      cargo_weight: 21500,
      origin: 'Delhi Gateway Cargo Terminal',
      destination: 'Jaipur Integrated Transport Hub',
      route_id: 'NC210', // North Corridor
      notes: 'Automotive tier-1 transmission units. Delivered without defect.',
      status: 'Completed',
      final_odometer: 48200
    },
    {
      vehicle_id: vMap['HR55QR6611'],
      driver_id: dMap['Kiran Yadav'],
      cargo_weight: 14000,
      origin: 'Kochi Port Maritime Terminal',
      destination: 'Coimbatore Textile Engineering Complex',
      route_id: 'SE320', // South Corridor
      notes: 'Cancelled due to severe early monsoon alert.',
      status: 'Cancelled'
    }
  ];
  const { data: tList, error: tErr } = await supabase.from('trips').insert(tripsData).select();
  if (tErr) throw tErr;
  console.log('Trips inserted:', tList.length);

  // 5. Disruptions
  const disruptionsData = [
    {
      type: 'weather',
      title: 'Severe Cyclone Biparjoy — Western Coastline (Gujarat/Maharashtra)',
      description: 'Category 3 cyclone making landfall near Kandla/Mundra coastal corridor. Severe flooding on NH-8 & NH-27. Kandla port container terminals suspended for 48 hours.',
      region: 'West',
      route_id: 'WN412',
      severity: 'critical',
      status: 'active',
      start_date: new Date(Date.now() - 4 * 3600000).toISOString(),
      source: 'IMD Meteorological Doppler Radar Advisory'
    },
    {
      type: 'port_strike',
      title: 'Dock Workers & Crane Operators Strike — Chennai Port Terminal',
      description: 'Indefinite labor stoppage by Chennai Port handling unions. Over 4,200 TEU container backlog. Inward & outward freight halted with estimated 72+ hour clearance delay.',
      region: 'South',
      route_id: 'SE320',
      severity: 'high',
      status: 'active',
      start_date: new Date(Date.now() - 26 * 3600000).toISOString(),
      source: 'Indian Ports Association & Reuters Trade Bulletin'
    },
    {
      type: 'weather',
      title: 'Monsoon Landslide & Highway Collapse — Western Ghats (Pune-Goa NH-66)',
      description: 'Major landslide blocking two arterial lanes on NH-66. Traffic diverted through interior mountain routes with heavy axle weight restrictions.',
      region: 'West',
      route_id: 'CW550',
      severity: 'high',
      status: 'active',
      start_date: new Date(Date.now() - 14 * 3600000).toISOString(),
      source: 'National Highway Authority of India (NHAI)'
    },
    {
      type: 'geopolitical',
      title: 'Interstate Transit Checkpoint Blockade — Northern Corridor',
      description: 'Emergency highway diversions and strict border freight inspections along Delhi-Jaipur highway causing 8-12 hour transit delays.',
      region: 'North',
      route_id: 'NC210',
      severity: 'medium',
      status: 'monitoring',
      start_date: new Date(Date.now() - 48 * 3600000).toISOString(),
      source: 'Ministry of Road Transport & Highways (MoRTH)'
    }
  ];
  const { data: disList, error: disErr } = await supabase.from('disruptions').insert(disruptionsData).select();
  if (disErr) throw disErr;
  console.log('Disruptions inserted:', disList.length);

  // 6. Shipment Disruption Impacts
  const impactsData = [
    {
      disruption_id: disList[0].id, // Cyclone
      trip_id: tList[0].id,         // Trip 1 (Mumbai -> Ahmedabad Vaccines)
      route_id: 'WN412',
      impact_level: 'high',
      recommended_action: 'reroute',
      notes: 'Direct route NH-8 on [WN412] flooded near Surat. Reroute recommendation: Divert via NH-48 -> Central Inland Expressway (Vadodara bypass). Adds 65 km (+2.5 hrs).'
    },
    {
      disruption_id: disList[1].id, // Port Strike
      trip_id: tList[1].id,         // Trip 2 (Chennai -> Bengaluru)
      route_id: 'SE320',
      impact_level: 'blocked',
      recommended_action: 'redeployment',
      notes: 'Chennai Port gate operations at full standstill on [SE320]. Recommended Status: REDEPLOYMENT. Reposition idle container chassis to Krishnapatnam Deepwater Port.'
    },
    {
      disruption_id: disList[2].id, // Landslide
      trip_id: tList[2].id,         // Trip 3 (Pune -> Hyderabad)
      route_id: 'CW550',
      impact_level: 'high',
      recommended_action: 'delay',
      notes: 'NH-66 on [CW550] closed for heavy freight. Recommended Status: DELAY. Hold shipment at Pune Temperature-Controlled Warehouse for 12 hours.'
    },
    {
      disruption_id: disList[3].id, // Checkpoint
      trip_id: tList[3].id,         // Trip 4 (East)
      route_id: 'EW785',
      impact_level: 'low',
      recommended_action: 'delay',
      notes: 'Buffer time in delivery schedule on [EW785] is 4.5 hours. Recommended Status: DELAY. Adjust arrival window by 30 minutes.'
    }
  ];
  const { error: impErr } = await supabase.from('shipment_disruption_impact').insert(impactsData);
  if (impErr) throw impErr;
  console.log('Shipment Disruption Impacts inserted');

  // 7. Carrier Alternatives
  const carrierAlts = [
    {
      disruption_id: disList[0].id,
      original_carrier: 'Western Express Logistics',
      suggested_carrier: 'Central Inland Freight Logistics',
      estimated_delay_change: -28,
      cost_delta: 14500
    },
    {
      disruption_id: disList[0].id,
      original_carrier: 'Gujarat Coastal Roadways',
      suggested_carrier: 'Apex Intermodal Rail Freight',
      estimated_delay_change: -36,
      cost_delta: 22000
    },
    {
      disruption_id: disList[1].id,
      original_carrier: 'Chennai Coastal Container Line',
      suggested_carrier: 'Krishnapatnam Express Line',
      estimated_delay_change: -54,
      cost_delta: 18000
    },
    {
      disruption_id: disList[1].id,
      original_carrier: 'Southern Maritime Transport',
      suggested_carrier: 'Ennore Multimodal Cargo Hub',
      estimated_delay_change: -40,
      cost_delta: 11500
    }
  ];
  await supabase.from('carrier_alternatives').insert(carrierAlts);
  console.log('Carrier Alternatives inserted');

  // 8. Fleet Redeployment Suggestions
  const redeployData = [
    {
      vehicle_id: vMap['MH12AB1001'],
      current_status: 'Available',
      idle_since: new Date(Date.now() - 38 * 3600000).toISOString(),
      suggested_region: 'West Corridor (Surat/Ahmedabad Detour)',
      reason: 'Severe surge in freight demand along Central detour route due to coastal cyclone diversion. 28T capacity perfectly matches stranded container loads.',
      priority_score: 94,
      status: 'pending'
    },
    {
      vehicle_id: vMap['GJ01XY7788'],
      current_status: 'Available',
      idle_since: new Date(Date.now() - 52 * 3600000).toISOString(),
      suggested_region: 'Central Hub (Indore/Nagpur)',
      reason: 'Extreme idle duration (52h). Industrial freight backlog in Central zone requires heavy tractor-trailer capacity.',
      priority_score: 88,
      status: 'pending'
    },
    {
      vehicle_id: vMap['TS07ST8899'],
      current_status: 'Available',
      idle_since: new Date(Date.now() - 28 * 3600000).toISOString(),
      suggested_region: 'South (Bengaluru Cold Hub)',
      reason: 'High-value temperature-controlled pharmaceutical consignment awaiting reefer dispatch following Chennai port diversion.',
      priority_score: 82,
      status: 'pending'
    },
    {
      vehicle_id: vMap['KA02MN9912'],
      current_status: 'Available',
      idle_since: new Date(Date.now() - 14 * 3600000).toISOString(),
      suggested_region: 'South (Chennai Suburban Emergency Relays)',
      reason: 'Rapid last-mile dispatch vehicle suited for urgent medical supply bypass around congested arterial checkpoints.',
      priority_score: 68,
      status: 'pending'
    }
  ];
  await supabase.from('fleet_redeployment_suggestions').insert(redeployData);
  console.log('Redeployment suggestions inserted');

  // 9. Cold Chain Shipments
  const ccData = [
    {
      trip_id: tList[0].id,
      cargo_type: 'vaccine',
      required_min_temp: 2.0,
      required_max_temp: 8.0,
      cargo_value: 4200000,
      regulatory_class: 'WHO PQS E006 / CDC Vaccine Standards',
      status: 'active'
    },
    {
      trip_id: tList[2].id,
      cargo_type: 'pharma',
      required_min_temp: 2.0,
      required_max_temp: 8.0,
      cargo_value: 8500000,
      regulatory_class: 'FDA 21 CFR Part 11 / EU GDP Compliance',
      status: 'compromised'
    }
  ];
  const { data: ccList, error: ccErr } = await supabase.from('cold_chain_shipments').insert(ccData).select();
  if (ccErr) throw ccErr;
  console.log('Cold Chain shipments inserted:', ccList.length);

  // 10. Cold Chain Sensor Logs
  // Shipment 1: Normal healthy curve
  const sensorLogsS1 = [
    { cold_chain_shipment_id: ccList[0].id, timestamp: new Date(Date.now() - 5 * 3600000).toISOString(), temperature: 3.8, humidity: 45, gps_lat: 19.0760, gps_lng: 72.8777, leg_number: 1 },
    { cold_chain_shipment_id: ccList[0].id, timestamp: new Date(Date.now() - 4 * 3600000).toISOString(), temperature: 4.2, humidity: 46, gps_lat: 19.2183, gps_lng: 72.9781, leg_number: 1 },
    { cold_chain_shipment_id: ccList[0].id, timestamp: new Date(Date.now() - 3 * 3600000).toISOString(), temperature: 4.9, humidity: 48, gps_lat: 19.5500, gps_lng: 73.0800, leg_number: 1 },
    { cold_chain_shipment_id: ccList[0].id, timestamp: new Date(Date.now() - 2 * 3600000).toISOString(), temperature: 5.3, humidity: 47, gps_lat: 20.1200, gps_lng: 73.1500, leg_number: 1 },
    { cold_chain_shipment_id: ccList[0].id, timestamp: new Date(Date.now() - 1 * 3600000).toISOString(), temperature: 4.8, humidity: 45, gps_lat: 20.6500, gps_lng: 73.0200, leg_number: 1 },
  ];
  await supabase.from('cold_chain_sensor_logs').insert(sensorLogsS1);

  // Shipment 2: Excursion curve with temperature breach!
  const sensorLogsS2 = [
    { cold_chain_shipment_id: ccList[1].id, timestamp: new Date(Date.now() - 4 * 3600000).toISOString(), temperature: 4.2, humidity: 44, gps_lat: 18.5204, gps_lng: 73.8567, leg_number: 1 },
    { cold_chain_shipment_id: ccList[1].id, timestamp: new Date(Date.now() - 3 * 3600000).toISOString(), temperature: 5.6, humidity: 49, gps_lat: 18.3100, gps_lng: 74.2200, leg_number: 1 },
    { cold_chain_shipment_id: ccList[1].id, timestamp: new Date(Date.now() - 2 * 3600000).toISOString(), temperature: 8.9, humidity: 55, gps_lat: 18.0500, gps_lng: 74.8500, leg_number: 1 },
    { cold_chain_shipment_id: ccList[1].id, timestamp: new Date(Date.now() - 1 * 3600000).toISOString(), temperature: 13.5, humidity: 62, gps_lat: 17.6800, gps_lng: 75.9000, leg_number: 1 },
    { cold_chain_shipment_id: ccList[1].id, timestamp: new Date(Date.now() - 20 * 60000).toISOString(), temperature: 14.8, humidity: 66, gps_lat: 17.4500, gps_lng: 76.5500, leg_number: 1 },
  ];
  const { data: s2Logs, error: s2Err } = await supabase.from('cold_chain_sensor_logs').insert(sensorLogsS2).select();
  if (s2Err) throw s2Err;
  console.log('Sensor logs inserted');

  // 11. Temperature Excursion for Shipment 2
  const excursionData = [
    {
      cold_chain_shipment_id: ccList[1].id,
      sensor_log_id: s2Logs[4].id,
      detected_at: new Date(Date.now() - 20 * 60000).toISOString(),
      excursion_temp: 14.8,
      threshold_breached: 'max',
      duration_minutes: 55,
      severity: 'regulatory_violation',
      classification_notes: 'CRITICAL FDA CFR 21 / EU GDP BREACH: Cargo temperature 14.8°C exceeded maximum limit (8.0°C) by +6.8°C for 55 minutes. Secondary reefer compressor failure flagged. Immediate dry-ice intervention mandatory.',
      status: 'open'
    }
  ];
  await supabase.from('temperature_excursions').insert(excursionData);
  console.log('Temperature excursion inserted');

  // 12. Maintenance Logs
  const maintLogs = [
    { vehicle_id: vMap['HR55QR6611'], description: 'Complete engine overhaul & turbocharger replacement', cost: 48500, date: '2026-09-10', service_type: 'Engine Overhaul' },
    { vehicle_id: vMap['DL01EF3003'], description: 'Carrier Transicold Reefer unit calibration and refrigerant recharge', cost: 16200, date: '2026-09-02', service_type: 'Refrigeration System', completed_at: new Date(Date.now() - 12 * 86400000).toISOString() },
    { vehicle_id: vMap['MH12AB1001'], description: 'Front axle brake pad replacement & ABS sensor diagnostic', cost: 11400, date: '2026-08-25', service_type: 'Braking System', completed_at: new Date(Date.now() - 20 * 86400000).toISOString() },
    { vehicle_id: vMap['TN09CD2002'], description: 'Multi-axle pneumatic suspension check and leaf spring greasing', cost: 8900, date: '2026-08-18', service_type: 'Suspension', completed_at: new Date(Date.now() - 27 * 86400000).toISOString() },
    { vehicle_id: vMap['GJ01XY7788'], description: 'Transmission fluid flush & 50,000km scheduled service', cost: 14500, date: '2026-08-05', service_type: 'Periodic Maintenance', completed_at: new Date(Date.now() - 40 * 86400000).toISOString() }
  ];
  await supabase.from('maintenance_logs').insert(maintLogs);
  console.log('Maintenance logs inserted');

  // 13. Fuel Logs
  const fuelLogs = [
    { vehicle_id: vMap['MH12AB1001'], liters: 180, cost: 17100, date: '2026-09-12', odometer_reading: 48200 },
    { vehicle_id: vMap['MH12AB1001'], liters: 165, cost: 15675, date: '2026-09-06', odometer_reading: 47600 },
    { vehicle_id: vMap['DL01EF3003'], liters: 210, cost: 19950, date: '2026-09-13', odometer_reading: 64500 },
    { vehicle_id: vMap['DL01EF3003'], liters: 195, cost: 18525, date: '2026-09-08', odometer_reading: 63800 },
    { vehicle_id: vMap['TN09CD2002'], liters: 175, cost: 16625, date: '2026-09-11', odometer_reading: 89100 },
    { vehicle_id: vMap['TN09CD2002'], liters: 180, cost: 17100, date: '2026-09-04', odometer_reading: 88400 },
    { vehicle_id: vMap['GJ01XY7788'], liters: 240, cost: 22800, date: '2026-09-02', odometer_reading: 31400 },
    { vehicle_id: vMap['MH04KL5521'], liters: 85, cost: 8075, date: '2026-09-12', odometer_reading: 22800 },
    { vehicle_id: vMap['WB02OP3344'], liters: 190, cost: 18050, date: '2026-09-11', odometer_reading: 55700 },
  ];
  await supabase.from('fuel_logs').insert(fuelLogs);
  console.log('Fuel logs inserted');

  console.log('>>> COMPLETE SHOWCASE DEMO DATA POPULATED IN SUPABASE SUCCESSFULLY! <<<');
}

seed().catch(err => { console.error('Seed error:', err); process.exit(1); });
