# 🚀 SupplyShield L2 — Supply Chain Disruption Assistant & Fleet Utilisation Optimizer

SupplyShield L2 is an enterprise-grade, real-time fleet operations and logistics management platform featuring an automated **Supply Chain Disruption Assistant**, an algorithmic **Fleet Redeployment Optimizer**, and a real-time **IoT Cold Chain Telemetry System** — powered by **IBM Bob** via the **Model Context Protocol (MCP)**.

---

## 👥 Team Nexus

| Role | Details |
|---|---|
| **Team Name** | Team Nexus |
| **Track** | AI Track |
| **Team Lead** | Preet Makadia (24it044@charusat.edu.in) |
| **Members** | Ronak Chhaniyara, Jeel Parsaniya, Yaman Ladani |

---

## 🎯 Problem Statement

Modern logistics networks operate in volatile environments vulnerable to severe weather events, labor strikes, geopolitical conflicts, and unexpected infrastructure bottlenecks. Fleet management systems are traditionally designed as static, passive registries: they track where a truck is, but fail to anticipate how emerging environmental and corridor disruptions will cascade across active shipments downstream. When a major transit corridor or maritime terminal is blocked, dispatchers must spend hours manually cross-referencing dozens of active shipments to identify stranded cargo, leading to delayed decision latency and missed delivery appointments.

At the same time, logistics operators suffer from severe asset utilization imbalances. While one corridor is shut down by strikes or storms, available fleet vehicles in neighboring terminals sit idle with zero revenue generation. Dispatchers lack automated algorithmic tools to quantify cumulative idle duration and score redeployment opportunities based on regional freight demand spikes. This results in the costly paradox of idle capital depreciation in low-demand hubs alongside severe capacity bottlenecks in high-demand zones.

Finally, transporting temperature-sensitive pharmaceuticals, vaccines, and perishables demands continuous, unbroken cold chain verification under strict regulatory standards (such as WHO PQS and FDA 21 CFR Part 11). When refrigeration units fail or stall in corridor traffic, temperature excursions frequently go undetected until delivery at the receiving dock. This causes catastrophic cargo spoilage, regulatory penalties, and compromised public health outcomes.

---

## 💡 Solution: SupplyShield L2

**SupplyShield L2** combines full-lifecycle fleet operations with proactive supply chain disruption intelligence, built with **Next.js 16 (App Router)**, **React 19**, and **Supabase (PostgreSQL 15+ with Realtime WebSockets)**:

1. **Disruption Command Panel:** Real-time event tracking, corridor intersection analysis, and automated shipment rerouting recommendations with one-click dispatch acceptance.
2. **Fleet Redeployment Optimizer:** Algorithmic scoring (0–100) of idle assets based on idle hours, regional demand pressures, and vehicle payload capacity to balance fleet distribution.
3. **Cold Chain Telemetry & Excursion Monitoring:** Continuous IoT sensor logging (temperature, humidity, GPS), interactive Recharts telemetry curves with regulatory threshold overlays, and automated excursion detection with severity grading.
4. **IBM Bob Agentic Assistant:** A dedicated Model Context Protocol (MCP) server providing 13 live operational tools that enable IBM Bob to inspect live database records, perform deterministic supply chain triage, and formulate actionable dispatch mitigations.

---

## ✨ Key Features

### 🤖 IBM Bob Operational Assistant
- **13 Production Model Context Protocol (MCP) Tools:** Connects IBM Bob directly to live PostgreSQL tables and deterministic business logic engines via stdio JSON-RPC 2.0.
- **In-App Assistant Drawer:** Slide-out operational triage assistant accessible from the top navbar, displaying live MCP tool execution traces alongside explainable AI rationales.
- **Two-Phase Action Safeguards:** High-impact operations (rerouting, carrier reassignment, asset redeployment) generate recommendations requiring explicit operator approval.

### 🌪️ L2 Disruption Command Panel (`/disruptions`)
- **Corridor Impact Matching:** Automatically cross-references active disruption events with origin and destination points of active trips.
- **Rule-Based Impact Grading:** Categorizes trips into `low`, `medium`, `high`, or `blocked` based on severity matrices.
- **One-Click Mitigation:** Dispatchers accept recommendations (`reroute`, `delay`, `reassign_carrier`) with automatic manifest updates.

### 🚛 Fleet Redeployment Optimizer (`/redeployment`)
- **Idle Asset Discovery:** Automatically detects vehicles in `Available` status and quantifies elapsed idle hours since last trip completion.
- **Multi-Factor Priority Scoring (0–100):** Combines idle duration, regional disruption demand spikes, and vehicle payload class.
- **One-Click Dispatch:** Converts recommendations into draft trips with pre-populated vehicle and regional route parameters.

### ❄️ Cold Chain Telemetry & Compliance (`/cold-chain`)
- **IoT Telemetry Stream:** Tracks ambient and container readings (temperature, humidity, GPS coordinates).
- **Automated Severity Classification:** Categorizes breaches into `minor`, `major`, `critical`, or `regulatory_violation` according to WHO PQS and FDA 21 CFR Part 11 guidelines.
- **Interactive Recharts Curves:** Live visualization graphing temperature history against upper (+8°C) and lower (+2°C) regulatory limits.

### 🏢 Core Fleet Lifecycle Foundation
- **Vehicle Registry (`/vehicles`):** Full lifecycle CRUD, capacity limits, odometer tracking, and service status toggles.
- **Trip Dispatcher (`/trips`):** Multi-stage dispatch workflow with driver assignment and payload capacity validation.
- **Driver Management (`/drivers`):** License verification, duty status tracking, and safety performance scoring.
- **Maintenance Logs (`/maintenance`):** Scheduled preventative maintenance logging with automatic vehicle status synchronization.
- **Fuel & Expenses (`/fuel`):** Fuel purchase logging, efficiency calculations (km/L), and per-vehicle operating cost analysis.
- **Operational Analytics (`/analytics`):** Financial and utilization reports powered by Recharts.
- **Granular RBAC:** 4 operational roles (Fleet Manager, Dispatcher, Safety Officer, Financial Analyst) protecting sensitive workflows.

---

## 🤖 IBM Bob Integration (Load-Bearing Architecture)

IBM Bob is not merely an external chat widget — it is genuinely **load-bearing** in the architecture of SupplyShield L2:

### Architectural Data Movement
```text
IBM Bob (CLI / Agent or In-App Drawer)
   ↓
Model Context Protocol (MCP) Server (src/mcp/server.js)
   ↓
13 Live Operational Tools (src/mcp/tools.js)
   ↓
Deterministic Engines (disruption-engine.js & cold-chain-engine.js)
   ↓
Supabase PostgreSQL Database (trips, vehicles, disruptions, cold chain)
```

### The 13 Implemented MCP Tools
1. `get_shipments`: List active and dispatched shipments with vehicle and driver assignments.
2. `get_shipment`: Retrieve detailed shipment metadata, linked cold chain manifests, and disruption records.
3. `get_active_disruptions`: Query active weather, port strike, and geopolitical disruptions.
4. `get_affected_shipments`: Correlate active trips against disruption corridors with impact levels.
5. `get_fleet_assets`: Query all fleet vehicles with operational status and regional hub locations.
6. `get_idle_fleet_assets`: Discover available assets with idle duration and priority redeployment scores.
7. `get_sensor_logs`: Fetch IoT temperature, humidity, and GPS telemetry for a cold chain shipment.
8. `get_cold_chain_status`: Inspect cold chain shipments, temperature limits, and open excursion incidents.
9. `analyze_disruption`: Run rule-based impact evaluation on live shipments for a specific disruption event.
10. `recommend_route`: Formulate alternate corridor bypass routes with time and fuel variance estimates.
11. `recommend_carrier`: Identify available internal fleet vehicles or external partner carriers for cargo reassignment.
12. `recommend_fleet_redeployment`: Rank idle vehicles for redeployment to high-demand disruption corridors.
13. `analyze_temperature_excursion`: Evaluate sensor readings against WHO PQS and FDA regulations, classifying severity.

### Why Bob is Load-Bearing
- **Direct Database Grounding:** Every tool call retrieves real records from PostgreSQL; zero data is mocked or hallucinated.
- **Deterministic Explainability:** Mathematical scoring formulas and regulatory rule matrices guarantee auditable rationales.
- **Dual Interface Access:** Operates via standard stdio JSON-RPC 2.0 (compatible with the IBM Bob CLI) and via an integrated in-app drawer for web dispatchers.

---

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| **Framework & Frontend** | Next.js 16 (App Router), React 19, Vanilla CSS Design System, Tailwind CSS 4 |
| **Backend & Database** | Supabase (PostgreSQL 15+, GoTrue Auth, Realtime WebSockets) |
| **AI & Agent Integration** | IBM Bob, Model Context Protocol (@modelcontextprotocol/sdk), IBM watsonx.ai Granite |
| **Data Visualization** | Recharts (Line curves, Bar charts, Donut charts) |
| **Icons & UI Utilities** | Lucide React Icons |
| **Business Logic Engines** | Deterministic Disruption Impact Engine, Cold Chain Excursion Engine |

---

## ⚡ How to Run

For complete step-by-step instructions, refer to the [Setup Guide](docs/setup-guide.md).

### 1. Clone and Install
```bash
git clone https://github.com/PreetMakadia595/bob-ai-hackathon--Team-Nexus-.git
cd bob-ai-hackathon--Team-Nexus-
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env.local
```
Add your Supabase project credentials in `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 3. Apply Database Schema & Seed Data
In your Supabase SQL Editor, run `migrations/complete_database_setup.sql`.  
Then seed demonstration records:
```bash
node seed_showcase.js
```

### 4. Start the Application & MCP Server
```bash
# Start the full-stack web application
npm run dev

# Start the IBM Bob MCP server (in a separate terminal)
npm run mcp:start
```
Open [http://localhost:3000](http://localhost:3000) in your web browser.

---

## 🎥 Demo & Evidence

- **Demo Video:** Link available in [demo/demo-video-link.txt](demo/demo-video-link.txt)
- **Live Deployment:** URL available in [demo/live-demo-url.txt](demo/live-demo-url.txt)
- **Screenshots:** High-resolution screenshots captured in [demo/screenshots/](demo/screenshots/)
  - `01-home-dashboard.png`: Executive Command Center with L2 risk counters.
  - `02-query-input.png`: IBM Bob AI Assistant drawer with live query input.
  - `03-result-output.png`: Disruption impact analysis and redeployment outputs.
- **Presentation Deck:** Available as a PDF in [presentation/slides.pdf](presentation/slides.pdf).

---

## ⚠️ Known Limitations

1. **IoT Telemetry Streaming:** Hardware gateway connectivity currently operates via web-based telemetry simulation. Direct MQTT/CoAP edge hardware gateway ingestion is scheduled for subsequent releases.
2. **Offline Edge Caching:** Cellular dead zones in remote rural corridors currently rely on periodic re-synchronization rather than local SQLite edge replica buffers.

---

## 🏆 What We're Most Proud Of

We are most proud of building a genuinely **load-bearing IBM Bob agent integration via the Model Context Protocol (MCP)** that operates directly against a production PostgreSQL database and deterministic logistics engines. Rather than creating a superficial chatbot, we gave IBM Bob 13 real operational tools, enabling logistics dispatchers to triage multi-corridor transit disruptions, prevent cold chain pharmaceutical spoilage, and redeploy idle fleet capital with complete explainability and auditability.
