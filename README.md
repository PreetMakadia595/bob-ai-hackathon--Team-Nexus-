# 🚀 FleetFlow - Smart Fleet Management System

Comprehensive, real-time fleet operations and logistics management platform designed for modern transport and dispatch workflows.

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

Fleet operators face significant challenges in tracking vehicle availability, monitoring maintenance schedules, optimizing fuel consumption, and coordinating trip assignments across multiple drivers. Fragmented tools lead to vehicle downtime, unexpected maintenance costs, delayed shipments, and inefficient fuel utilization.

---

## 💡 Solution

**FleetFlow** is a unified, real-time fleet management platform built with Next.js and Supabase. It provides complete operational visibility across vehicles, drivers, trips, maintenance logs, and fuel expenditures. Featuring role-based access control, interactive operational analytics, and automated status management, FleetFlow streamlines fleet dispatch and resource planning.

---

## ✨ Key Features

- **Real-Time Fleet Overview:** Interactive dashboard monitoring active trips, available vehicles, fuel consumption trends, and pending maintenance alerts.
- **Vehicle Lifecycle & Status Management:** Full vehicle registry tracking status (Available, In Service, Maintenance), specifications, and operational metrics.
- **Trip Dispatch & Driver Assignment:** End-to-end trip workflow from dispatch to completion with driver assignment and route details.
- **Maintenance Tracking & Scheduling:** Preventative and reactive maintenance logging, cost tracking, and vehicle status synchronization.
- **Fuel Expense & Efficiency Logging:** Track fuel purchases, odometer readings, fuel efficiency (km/L), and associated operational costs.
- **Operational Analytics:** Visual data insights powered by Recharts covering expense breakdowns, vehicle utilization, and trip completion rates.
- **Role-Based Access Control (RBAC):** Secure authentication and granular permissions for fleet managers, dispatchers, and operators.

---

## 🛠️ Tech Stack

| Category | Technologies |
|---|---|
| **Languages** | JavaScript (ES6+), SQL |
| **Frameworks** | Next.js 16 (App Router), React 19 |
| **Styling** | Tailwind CSS 4, Lucide React Icons |
| **Databases & Backend** | Supabase (PostgreSQL, Auth, Real-time) |
| **Visualization** | Recharts |
| **Linting & Tooling** | ESLint, PostCSS |

---

## 📁 Repository Structure

```
├── .github/              # GitHub Actions workflows & issue templates
├── demo/                 # Demo artifacts (video link, screenshots)
├── docs/                 # Hackathon documentation
├── presentation/         # Presentation slide deck
├── public/               # Static assets & icons
├── src/
│   ├── app/              # Next.js App Router pages & layouts
│   │   ├── (dashboard)/  # Main dashboard, vehicles, trips, fuel, maintenance
│   │   ├── 403/          # Unauthorized access page
│   │   └── login/        # Authentication page
│   ├── components/       # Reusable UI components & navigation
│   ├── lib/              # Supabase client, auth context, RBAC & utilities
│   └── middleware.js     # Route protection & auth middleware
├── add_fuel_columns.sql          # Database schema migrations
├── add_maintenance_columns.sql
├── add_trip_columns.sql
├── add_vehicle_columns.sql
├── package.json          # Project dependencies & scripts
└── submission.yaml       # Hackathon submission metadata
```

---

## ⚡ How to Run

### 1. Clone the repository
```bash
git clone https://github.com/PreetMakadia595/bob-ai-hackathon--Team-Nexus-.git
cd bob-ai-hackathon--Team-Nexus-
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment variables
Create a `.env.local` file in the root directory:
```bash
cp .env.example .env.local
```
Add your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 4. Setup Database Schema
Execute the SQL migration scripts in your Supabase SQL editor in the following order:
- `add_vehicle_columns.sql`
- `add_trip_columns.sql`
- `add_fuel_columns.sql`
- `add_maintenance_columns.sql`

### 5. Run the development server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to explore FleetFlow.

---

## 🖥️ Demo

| Artifact | Link |
|---|---|
| 📹 Demo Video | [See demo/demo-video-link.txt](demo/demo-video-link.txt) |
| 🌐 Live Demo | [See demo/live-demo-url.txt](demo/live-demo-url.txt) |
| 🖼️ Screenshots | [See demo/screenshots/](demo/screenshots/) |
| 📊 Presentation | [See presentation/slides.pdf](presentation/) |

---

## ⚠️ Known Limitations

- Real-time GPS device telemetry integration requires hardware IoT gateway integration.
- Offline-first caching with automatic sync is in active development.

---

## 🏅 What We're Most Proud Of

- Clean, modular Next.js 16 App Router architecture paired with Supabase for real-time reactivity.
- Seamless role-based access control protecting fleet operations workflows and sensitive operational logs.
- Intuitive, high-performance UI tailored for rapid dispatch and fleet monitoring.
