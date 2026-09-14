# Solution Overview: SupplyShield L2 & IBM Bob Integration

---

## 1. Core Mechanism

**SupplyShield L2** is an enterprise-grade fleet management and proactive supply chain disruption mitigation platform. Built upon **Next.js 16 (App Router)**, **React 19**, and **Supabase (PostgreSQL 15+ with Realtime WebSockets)**, the platform pairs full-lifecycle fleet operations with intelligent disruption resilience.

The core mechanism unites:
1. **Deterministic Rule Engines:** Transparent, auditable mathematical and corridor-matching algorithms executing in pure JavaScript for disruption impact classification, redeployment priority scoring, and temperature excursion grading.
2. **Model Context Protocol (MCP) Integration:** A custom MCP Server exposing 13 live operational tools that connect the **IBM Bob agent** directly to enterprise PostgreSQL tables.
3. **Live Operational Command Center:** A real-time executive dashboard combining mission-critical L2 risk counters with core fleet dispatch workflows.

---

## 2. Existing Application Functionality

SupplyShield provides a production-tested foundation for day-to-day fleet logistics:
- **Vehicle Registry (`/vehicles`):** Complete fleet lifecycle management with payload capacity tracking, odometer monitoring, regional hub assignment, and operational status management (`Available`, `On Trip`, `In Shop`, `Suspended`).
- **Trip Dispatcher (`/trips`):** Multi-stage dispatch workflow (`Draft` → `Dispatched` → `Completed`) with payload weight validation, vehicle-driver pairing, and real-time transit notes.
- **Driver Management (`/drivers`):** License verification, duty status tracking (`Active`, `On Leave`, `Suspended`), and safety performance scoring.
- **Maintenance Logs (`/maintenance`):** Scheduled preventative maintenance logging, service cost tracking, and automatic vehicle status synchronization to `In Shop`.
- **Fuel & Operating Expenses (`/fuel`):** Fuel purchase logging, efficiency calculations (km/L), and per-vehicle operating cost analysis.
- **Operational Analytics (`/analytics`):** Financial and asset utilization reporting powered by interactive Recharts visualizations.
- **Granular RBAC:** 4 distinct operational roles (Fleet Manager, Dispatcher, Safety Officer, Financial Analyst) protecting sensitive workflows and data mutations.

---

## 3. IBM Bob Technology Integration

**IBM Bob** serves as an intelligent, load-bearing operational assistant for freight dispatchers and logistics managers:
- Rather than merely answering generic questions, Bob is granted direct tool-calling agency over live logistics records via the **Model Context Protocol (MCP)**.
- Bob autonomously queries active transit trips, cross-references emerging weather and labor disruptions, evaluates cold chain sensor streams, and generates prioritized redeployment plans.
- Bob operates both as an external agent via the standard **IBM Bob CLI (stdio transport)** and through an integrated **"Ask Bob AI" drawer** directly within the web application.

---

## 4. MCP / API Integration Architecture

The integration utilizes the official `@modelcontextprotocol/sdk`:
- **Server Implementation (`src/mcp/server.js`):** Defines the `bob-supplyshield-mcp` server, registering JSON Schema definitions for 13 operational tools.
- **CLI Stdio Transport (`src/mcp/cli.js`):** Enables direct connection from IBM Bob CLI or developer environments using standard input/output JSON-RPC 2.0 communication.
- **Web API Endpoint (`src/app/api/bob/chat/route.js`):** Bridges browser user queries to MCP tool execution, formatting live database records and engine outputs into structured conversational responses.

---

## 5. Shipment Disruption Analysis

The **Disruption Command Panel (`/disruptions`)** and MCP tool `analyze_disruption` implement multi-factor corridor risk evaluation:
- **Regional Corridor Matching:** Evaluates active trip origin and destination points against disruption zones (e.g. Typhoon in West corridor, Port Strike in South terminal).
- **Severity Matrix:**
  - `critical` disruption → trips in transit flagged as `blocked`.
  - `high` disruption + Dispatched trip → flagged as `high` impact.
  - `medium` disruption → flagged as `medium` impact.
  - `low` disruption → schedule buffer absorbed (`low` impact).
- **Automated Mitigation Generation:** Selects appropriate operational response: `reroute` (for weather/geopolitical corridor blockage), `delay` (for port terminal strikes), or `reassign_carrier`.

---

## 6. Route & Carrier Recommendations

When a disruption impacts active shipments:
- **Bypass Route Formulation (`recommend_route`):** Computes detour paths avoiding the impacted corridor, estimating transit time variance (+2.5 hrs) and fuel impact estimates (+45 L diesel).
- **Alternative Asset & Carrier Matching (`recommend_carrier`):** Discovers unassigned fleet vehicles with sufficient payload capacity or retrieves verified partner freight carriers from `carrier_alternatives`.

---

## 7. Fleet Utilisation & Redeployment Optimization

The **Fleet Redeployment Optimizer (`/redeployment`)** and MCP tool `recommend_fleet_redeployment` resolve fleet asset imbalances:
- **Idle Duration Tracking:** Queries trip completion histories to identify vehicles in `Available` status and calculate idle hours since last dispatch.
- **Multi-Factor Priority Scoring (0–100):**
  - *Idle Component (0–50 pts):* $1.5 \times \text{idle hours}$ (capped at 50).
  - *Disruption Pressure Component (0–30 pts):* Active disruptions in nearby corridors add 15–30 pts.
  - *Capacity Component (0–20 pts):* Heavy haulage vehicles (>15,000 kg) receive maximum priority.
- **One-Click Dispatch:** Dispatchers can convert redeployment recommendations into draft trips with pre-filled vehicle, origin, and destination fields.

---

## 8. Cold Chain Telemetry & Automated Excursion Triage

The **Cold Chain Telemetry System (`/cold-chain`)** and MCP tool `analyze_temperature_excursion` safeguard sensitive cargo:
- **IoT Telemetry Stream:** Ingests ambient and container readings (temperature, relative humidity, GPS coordinates).
- **Automated Severity Classification Engine:**
  - `minor`: Deviation $\le 2^\circ\text{C}$, duration $< 15\text{ min}$.
  - `major`: Deviation $2^\circ\text{C}$ to $5^\circ\text{C}$, or duration $15\text{–}60\text{ min}$.
  - `critical`: Deviation $> 5^\circ\text{C}$, or duration $> 60\text{ min}$. Automatically updates shipment status to `compromised`.
  - `regulatory_violation`: Vaccine or pharmaceutical cargo exceeding $3^\circ\text{C}$ deviation or $30\text{ min}$ cumulative breach duration.
- **Interactive Recharts Curves:** Live visualization of temperature history against product-specific upper (+8°C) and lower (+2°C) regulatory thresholds.

---

## 9. Explainability & Auditability

In enterprise logistics and regulated pharmaceutical transport, black-box AI outputs are unacceptable:
- Every recommendation formulated by IBM Bob includes a transparent **rationale statement** explaining why the action was selected.
- Calculations derive from deterministic mathematical matrices rather than non-deterministic text prediction.
- All sensor readings, impact calculations, and redeployment scores are permanently recorded in PostgreSQL audit tables with ISO timestamps.

---

## 10. Human Approval & Safety Safeguards

To prevent unauthorized or erroneous alterations to operational logistics:
- **Two-Phase Commit:** MCP tools and Bob recommendations produce actionable advice with `status: requires_approval` or `status: pending`.
- Operational records (such as rerouting an active trip or reassigning a carrier) require explicit dispatcher or manager approval before taking effect in production manifests.
- Role-Based Access Control (RBAC) ensures only authorized roles can sign off on regulatory cold chain incidents or approve trip dispatches.

---

## 11. What Makes SupplyShield Different from a Basic Chatbot

| Feature | Generic AI Chatbot | SupplyShield L2 + IBM Bob |
|---|---|---|
| **Data Source** | Static prompt context or mocked JSON | Live Supabase PostgreSQL database |
| **Integration Model** | Standalone chat widget | Standard Model Context Protocol (MCP) Server |
| **Operational Impact** | Passive text suggestions | Actionable dispatch recommendations & one-click actions |
| **Calculations** | Probabilistic text estimation | Deterministic mathematical scoring engines |
| **Regulatory Compliance**| No compliance awareness | Automated WHO PQS & FDA 21 CFR Part 11 classification |
| **Enterprise Safety** | Unrestricted or ungrounded responses | Granular RBAC & two-phase dispatcher approval safeguards |
