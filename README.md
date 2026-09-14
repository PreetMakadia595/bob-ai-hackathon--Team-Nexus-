# 🚀 SupplyShield — Smart Fleet Management & L2 Supply Chain Disruption Optimizer

A comprehensive, real-time fleet operations and logistics management platform, extended with the **L2 Supply Chain Disruption Assistant, Fleet Redeployment Optimizer, and Cold Chain Telemetry System**.

---

## 👥 Team

| Field | Value |
|---|---|
| **Team Name** | Team Nexus |
| **Track** | Open |
| **Team Lead** | Preet Makadia — [24it044@charusat.edu.in] |
| **Members** | Ronak Chhaniyara, Jeel Parsaniya, Yaman Ladani |

---

## 🎯 Problem Statement

Fleet operators face severe operational vulnerabilities when unexpected transit disruptions occur—such as extreme weather, port strikes, and geopolitical blockades. Without intelligent tooling, identifying stranded shipments and rerouting cargo requires hours of manual coordination. Furthermore, transporting temperature-sensitive pharmaceuticals, vaccines, and perishables demands continuous, unbroken cold chain verification under strict regulatory standards (e.g. WHO PQS, CDC, FDA CFR). Undetected temperature excursions lead to total cargo spoilage and compliance failure.

---

## 💡 Solution: SupplyShield L2

**SupplyShield L2** is an enterprise-grade, real-time fleet management platform built with **Next.js 16 (App Router)** and **Supabase (PostgreSQL + Realtime WebSockets)**. It combines core fleet lifecycle management with proactive supply chain disruption intelligence:

1. **Disruption Command Panel:** Real-time event tracking, corridor intersection analysis, and automated shipment rerouting recommendations with one-click dispatch acceptance.
2. **Fleet Redeployment Optimizer:** Algorithmic scoring (0–100) of idle assets based on idle hours, regional demand pressures, and vehicle capacity to balance fleet distribution.
3. **Cold Chain Telemetry & Excursion Monitoring:** Continuous IoT sensor logging (temperature, humidity, GPS), interactive Recharts telemetry curves with regulatory threshold overlays, and automated excursion detection with severity grading.

---

## ✨ Key Features

### 🌟 L2 Supply Chain & Cold Chain Operations
- **Disruption Command Panel (`/disruptions`):** Track extreme weather, port strikes, and geopolitical alerts. Run rule-based impact analyses across all active trips and execute mitigation actions (`reroute`, `delay`, `reassign_carrier`).
- **Fleet Redeployment (`/redeployment`):** Automatically detect available vehicles, quantify idle duration, calculate multi-factor priority scores, and dispatch redeployment trips.
- **Cold Chain Monitoring (`/cold-chain`):** Live temperature curves, cargo manifest cards, IoT telemetry simulation, automated excursion detection (`minor`, `major`, `critical`, `regulatory_violation`), and incident acknowledgment workflows.
- **Enhanced Command Center (`/`):** 4 real-time L2 KPI tiles (Active Disruptions, Shipments Impacted, Idle Assets, Open Excursions) alongside standard fleet metrics.

### 🚛 Core Fleet Management Foundation
- **Vehicle Registry (`/vehicles`):** Full lifecycle CRUD, capacity limits, odometer tracking, and service status toggles.
- **Trip Dispatcher (`/trips`):** Draft-to-completion workflow with driver assignment, cargo weight capacity validation, and route notes.
- **Driver Management (`/drivers`):** License expiry monitoring, safety scoring, and duty status tracking.
- **Maintenance Logs (`/maintenance`):** Preventative service logs, cost tracking, and automatic vehicle status synchronization (`In Shop`).
- **Fuel & Expenses (`/fuel`):** Fuel purchase logging, efficiency calculations (km/L), and cost-per-vehicle metrics.
- **Operational Analytics (`/analytics`):** Comprehensive financial and utilization reports powered by Recharts.
- **Granular RBAC:** 4 operational roles (Fleet Manager, Dispatcher, Safety Officer, Financial Analyst) protecting sensitive workflows.

---

## 🛠️ Tech Stack

| Category | Technologies |
|---|---|
| **Framework & Language** | Next.js 16 (App Router), React 19, JavaScript (ES6+) |
| **Backend & Database** | Supabase (PostgreSQL 15+, GoTrue Auth, Realtime WebSockets) |
| **Styling & Icons** | Vanilla CSS Design System, Tailwind CSS 4, Lucide React Icons |
| **Data Visualization** | Recharts (Line curves, Bar charts, Pie distribution) |
| **Business Logic Engines** | Rule-Based Disruption Engine, Cold Chain Excursion Engine |

---

## 📁 Repository Structure

```
├── .github/                      # GitHub Actions workflows & configurations
├── demo/                         # Demo video links & screenshots
├── docs/                         # In-depth architectural & solution documentation
│   ├── architecture.md           # Mermaid system diagrams & ER models
│   ├── problem-statement.md      # Detailed supply chain challenge analysis
│   ├── solution-overview.md      # Features, design decisions & impact
│   └── setup-guide.md            # Comprehensive deployment & test guide
├── migrations/                   # L2 Database migrations
│   ├── 001_l2_supply_chain_tables.sql  # 7 new tables + RLS + indexes
│   └── 002_seed_demo_data.sql          # Seed data for demo & testing
├── presentation/                 # Presentation slides
├── public/                       # Static web assets
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── (dashboard)/
│   │   │   ├── page.js           # Command Center with L2 KPI tiles
│   │   │   ├── disruptions/      # Disruption Command Panel
│   │   │   ├── redeployment/     # Fleet Redeployment Optimizer
│   │   │   ├── cold-chain/       # Cold Chain Monitoring & Telemetry
│   │   │   ├── vehicles/         # Vehicle Registry
│   │   │   ├── trips/            # Trip Dispatcher
│   │   │   ├── drivers/          # Driver Management
│   │   │   ├── maintenance/      # Maintenance Logs
│   │   │   ├── fuel/             # Fuel & Expenses
│   │   │   └── analytics/        # Analytics & Financial Reports
│   │   ├── login/                # Authentication page
│   │   └── layout.js             # Root layout & providers
│   ├── components/               # StatusBadge, DataTable, FormModal, etc.
│   └── lib/                      # Supabase client, RBAC, disruption & cold chain engines
├── package.json                  # Dependencies & scripts
└── submission.yaml               # Hackathon submission metadata
```

---

## ⚡ Quick Start & Run

### 1. Clone & Install
```bash
git clone https://github.com/PreetMakadia595/bob-ai-hackathon--Team-Nexus-.git
cd bob-ai-hackathon--Team-Nexus-
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env.local
```
Add your Supabase credentials in `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 3. Apply SQL Migrations
In your Supabase SQL Editor:
1. Run `migrations/001_l2_supply_chain_tables.sql` to create all L2 tables and RLS policies.
2. (Optional) Run `migrations/002_seed_demo_data.sql` to populate sample disruptions and cold chain shipments.

### 4. Launch Application
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to access the Command Center.

---

## 📄 Documentation

- [Architecture & ER Diagrams](docs/architecture.md)
- [Problem Statement](docs/problem-statement.md)
- [Solution Overview](docs/solution-overview.md)
- [Setup & Deployment Guide](docs/setup-guide.md)
