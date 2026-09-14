# SupplyShield L2 — Setup & Deployment Guide

> **Official Setup Guide for SupplyShield & the L2 Supply Chain Disruption / Cold Chain Extension.**

---

## 1. Prerequisites
- **Node.js**: v18.0.0 or higher (v20+ recommended)
- **npm**: v9.0.0 or higher
- **Supabase Account**: A Supabase project (new or existing PostgreSQL instance)
- **Modern Web Browser**: Chrome, Firefox, Edge, or Safari

---

## 2. Environment Variables

Create a `.env.local` file in the project root:

```bash
cp .env.example .env.local
```

Configure your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

| Variable | Description | Required |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project API URL | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase project public anon key | Yes |

---

## 3. Database Migration & Schema Setup

Run the SQL migration scripts in your **Supabase Dashboard → SQL Editor → New Query**:

### Step 1: Base Fleet Management Tables (if setting up from scratch)
Ensure the core tables exist: `vehicles`, `drivers`, `trips`, `maintenance_logs`, `fuel_logs`, `profiles`.
Apply migration scripts in root:
- `add_vehicle_columns.sql`
- `add_trip_columns.sql`
- `add_fuel_columns.sql`
- `add_maintenance_columns.sql`

### Step 2: L2 Supply Chain & Cold Chain Extension Tables
Execute:
- [`migrations/001_l2_supply_chain_tables.sql`](../migrations/001_l2_supply_chain_tables.sql)
  - Creates: `disruptions`, `shipment_disruption_impact`, `fleet_redeployment_suggestions`, `cold_chain_shipments`, `cold_chain_sensor_logs`, `temperature_excursions`, `carrier_alternatives`.
  - Configures indexes and Row Level Security (RLS) policies.

### Step 3: Seed Demo Data (Optional for testing & demonstrations)
Execute:
- [`migrations/002_seed_demo_data.sql`](../migrations/002_seed_demo_data.sql)
  - Dynamically populates realistic disruption events, affected shipment impacts, cold chain manifests, sensor telemetry streams, and temperature excursions.

---

## 4. Installation & Running Locally

```bash
# 1. Install dependencies
npm install

# 2. Start the development server
npm run dev
```

The application will be live at: **`http://localhost:3000`**

---

## 5. Verification & Production Build

```bash
# Verify that the build succeeds without errors
npm run build

# Start production server
npm run start
```

---

## 6. Testing & Live Simulation Workflow

1. **Test Disruption Impact Analysis:**
   - Navigate to `/disruptions`.
   - Click **Add Disruption** or select an existing disruption (e.g. "Typhoon In-fa").
   - Click **Analyze Impact** → observe the Disruption Engine evaluate all active trips.
   - Click **Accept Action** to apply the recommended reroute or delay.

2. **Test Fleet Redeployment:**
   - Navigate to `/redeployment`.
   - Click **Generate AI Suggestions** → view idle vehicles scored by regional demand.
   - Click **Redeploy** to launch an instant draft trip.

3. **Test Cold Chain Telemetry & Excursion Auto-Detection:**
   - Navigate to `/cold-chain`.
   - Click **Simulate IoT Feed**.
   - Select a shipment (e.g., Vaccine shipment with 2°C to 8°C limits).
   - Click **Critical Spike (15.2°C)** or enter custom degrees → click **Emit Sensor Reading**.
   - Observe the live alert toast, automatic excursion entry in the log table, and shipment status update.
