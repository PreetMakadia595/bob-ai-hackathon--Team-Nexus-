/**
 * Seed Demo Scenarios for SupplyShield L2 Hackathon Showcase
 *
 * Scenarios populated:
 * 1. HIGH Impact in Blockage Window: Port Strike on EW785 [Kolkata ➔ Mumbai] (Blockage 08:00-22:00) -> In window -> Reroute / Reassign
 * 2. MEDIUM Impact in Blockage Window: Landslide on NS654 [Delhi ➔ Bengaluru] (Blockage 11:00-19:00) -> In window -> Delay / Reroute
 * 3. LOW Impact in Blockage Window: Monsoon Slowdown on WN412 [Mumbai ➔ Ahmedabad] (Blockage 06:00-14:00) -> In window -> Delay buffer
 * 4. Outside-Window Safe Shipment: EW785 [Kolkata ➔ Mumbai] departing after clearance -> Unaffected (Post-Clearance)
 * 5. Available Idle Assets across strategic hubs ready for transparent redeployment scoring
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
const envPath = path.resolve(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const idx = trimmed.indexOf('=');
    if (idx > -1) {
      env[trimmed.substring(0, idx).trim()] = trimmed.substring(idx + 1).trim();
    }
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  console.log('🚀 Checking and seeding demo scenarios in Supabase...');

  // 1. Fetch existing vehicles
  const { data: vehicles } = await supabase.from('vehicles').select('*');
  console.log(`Found ${vehicles?.length || 0} existing vehicles.`);

  // 2. Fetch existing drivers
  const { data: drivers } = await supabase.from('drivers').select('*');
  console.log(`Found ${drivers?.length || 0} existing drivers.`);

  let vList = vehicles || [];
  let dList = drivers || [];

  // Reset at least 3 vehicles to Available for redeployment
  if (vList.length > 3) {
    await supabase.from('vehicles').update({ status: 'Available' }).in('id', [vList[2].id, vList[3].id, vList[4].id]);
  }

  // 3. Sync Disruptions with Corridor RouteIDs and Time Windows
  console.log('Syncing disruptions for presentation...');
  const today = new Date().toISOString().split('T')[0];

  const demoDisruptions = [
    {
      title: 'Haldia-Kolkata Port Terminal Railhead Congestion',
      description: 'Critical corridor stoppage and dockworkers strike obstructing outward highway lanes. Total transit blockage estimated 14 hours. Only trucks scheduled during daylight transit window require bypass diversion.',
      severity: 'high',
      type: 'port_strike',
      status: 'active',
      region: 'East',
      route_id: 'EW785',
      source: 'Kolkata Port Authority & NHAI',
      start_date: `${today}T08:00:00Z`,
      end_date: `${today}T22:00:00Z`,
    },
    {
      title: 'NH-44 Penukonda Ghat Landslide & Lane Closure',
      description: 'Rockfall and mudslide restricting transit to alternating single-lane bottleneck between Hyderabad and Bengaluru spine. Clearance scheduled by dusk.',
      severity: 'medium',
      type: 'weather_event',
      status: 'active',
      region: 'South',
      route_id: 'NS654',
      source: 'State Disaster Management Authority',
      start_date: `${today}T11:00:00Z`,
      end_date: `${today}T19:00:00Z`,
    },
    {
      title: 'Western Expressway Monsoon Waterlogging Slowdown',
      description: 'Heavy precipitation causing localized puddling and 15-20 km/h traffic slowdown between Mumbai and Surat. Minor friction manageable via schedule holding buffer.',
      severity: 'low',
      type: 'weather_event',
      status: 'active',
      region: 'West',
      route_id: 'WN412',
      source: 'India Meteorological Department (IMD)',
      start_date: `${today}T06:00:00Z`,
      end_date: `${today}T14:00:00Z`,
    },
  ];

  const createdDisruptions = [];
  for (const dd of demoDisruptions) {
    const { data: existing } = await supabase.from('disruptions').select('id').eq('title', dd.title).maybeSingle();
    if (existing) {
      const { data: updated } = await supabase.from('disruptions').update(dd).eq('id', existing.id).select().single();
      createdDisruptions.push(updated);
    } else {
      const { data: inserted, error: insErr } = await supabase.from('disruptions').insert(dd).select().single();
      if (insErr) console.error('Error inserting disruption:', insErr);
      if (inserted) createdDisruptions.push(inserted);
    }
  }

  const dHigh = createdDisruptions.find(d => d.severity === 'high');
  const dMed = createdDisruptions.find(d => d.severity === 'medium');
  const dLow = createdDisruptions.find(d => d.severity === 'low');

  // 4. Create or update realistic Trips
  console.log('Seeding trips with Cost in Rupees (₹) and Expected ETA...');

  const demoTrips = [
    {
      origin: 'Kolkata Port Terminal',
      destination: 'Mumbai Logistics Park',
      route_id: 'EW785',
      cargo_weight: 24000,
      status: 'Dispatched',
      vehicle_id: vList[0]?.id,
      driver_id: dList[0]?.id,
      notes: '[Cost: ₹94,000] [ETA: 20 Sep 20:00 IST] High-priority industrial machinery payload. Active during daylight blockage window.',
    },
    {
      origin: 'Delhi Gateway Logistics Hub',
      destination: 'Bengaluru Tech Park Hub',
      route_id: 'NS654',
      cargo_weight: 16500,
      status: 'Dispatched',
      vehicle_id: vList[1]?.id,
      driver_id: dList[1]?.id,
      notes: '[Cost: ₹78,000] [ETA: 20 Sep 14:00 IST] Telecommunications equipment and server rack hardware. Active during ghat landslide.',
    },
    {
      origin: 'Mumbai Central Depot',
      destination: 'Ahmedabad Distribution Center',
      route_id: 'WN412',
      cargo_weight: 12000,
      status: 'Dispatched',
      vehicle_id: vList[2]?.id,
      driver_id: dList[2]?.id,
      notes: '[Cost: ₹32,500] [ETA: 19 Sep 21:00 IST] FMCG dry goods delivery. Active during monsoon waterlogging.',
    },
    {
      origin: 'Kolkata Port Terminal',
      destination: 'Mumbai Logistics Park',
      route_id: 'EW785',
      cargo_weight: 19000,
      status: 'Draft',
      vehicle_id: vList[3]?.id,
      driver_id: dList[3]?.id,
      notes: '[Cost: ₹94,000] [ETA: 21 Sep 11:00 IST] Night departure scheduled at 23:00 IST (post-clearance). Safe on primary route.',
    },
  ];

  const createdTrips = [];
  for (const t of demoTrips) {
    const { data: existing } = await supabase
      .from('trips')
      .select('id')
      .eq('route_id', t.route_id)
      .eq('origin', t.origin)
      .eq('notes', t.notes)
      .maybeSingle();

    if (existing) {
      const { data: upd } = await supabase.from('trips').update(t).eq('id', existing.id).select().single();
      createdTrips.push(upd);
    } else {
      const { data: ins, error: insErr } = await supabase.from('trips').insert(t).select().single();
      if (insErr) console.error('Error inserting trip:', insErr);
      if (ins) createdTrips.push(ins);
    }
  }

  // 5. Connect Disruption Impacts
  console.log('Creating active shipment disruption impacts for condition checking...');
  const pairs = [
    { trip: createdTrips[0], disruption: dHigh, level: 'high', action: 'reroute' },
    { trip: createdTrips[1], disruption: dMed, level: 'medium', action: 'delay' },
    { trip: createdTrips[2], disruption: dLow, level: 'low', action: 'delay' },
  ];

  for (const p of pairs) {
    if (p.trip && p.disruption) {
      const { data: existing } = await supabase
        .from('shipment_disruption_impact')
        .select('id')
        .eq('trip_id', p.trip.id)
        .eq('disruption_id', p.disruption.id)
        .maybeSingle();

      const impactPayload = {
        trip_id: p.trip.id,
        disruption_id: p.disruption.id,
        impact_level: p.level,
        recommended_action: p.action,
        notes: `Corridor transit scheduled during active blockage window of ${p.disruption.title}. Condition category: ${p.level.toUpperCase()}.`,
        route_id: p.trip.route_id,
      };

      if (existing) {
        await supabase.from('shipment_disruption_impact').update(impactPayload).eq('id', existing.id);
      } else {
        const { error: impErr } = await supabase.from('shipment_disruption_impact').insert(impactPayload);
        if (impErr) console.error('Error inserting impact:', impErr);
      }
    }
  }

  console.log('✅ Demo scenario seeding successfully completed!');
}

seed().catch(err => {
  console.error('Seeding script failed:', err);
  process.exit(1);
});
