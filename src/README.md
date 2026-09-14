# SupplyShield L2 — Source Code Architecture & Layout

This directory contains the entire application codebase for **SupplyShield L2 — Supply Chain Disruption Assistant & Fleet Utilisation Optimizer**.

---

## 📁 Source Directory Map

```text
src/
├── .env.example                  # Environment variable configuration template
├── README.md                     # Source code architecture documentation (this file)
│
├── app/                          # Next.js 16 App Router (Frontend + Full-Stack API Layer)
│   ├── layout.js                 # Global application layout and theme providers
│   ├── globals.css               # Vanilla CSS design tokens, glassmorphism, and styling
│   ├── login/                    # Authentication page (Supabase GoTrue integration)
│   ├── 403/                      # RBAC unauthorized access boundary page
│   ├── api/                      # Backend Server-Side API Handlers
│   │   └── bob/                  # IBM Bob Integration Endpoints
│   │       └── chat/route.js     # Bob chat, reasoning & MCP tool invocation router
│   └── (dashboard)/              # Authenticated Operations Command Center
│       ├── layout.js             # Dashboard shell with persistent sidebar & header
│       ├── page.js               # Executive Command Center with L2 risk & fleet KPIs
│       ├── disruptions/          # Disruption Command Panel (corridor matching & reroutes)
│       ├── redeployment/         # Fleet Redeployment Optimizer (0–100 priority scoring)
│       ├── cold-chain/           # Cold Chain IoT Monitoring (telemetry curves & excursions)
│       ├── vehicles/             # Vehicle Registry (CRUD, lifecycle, statuses)
│       ├── trips/                # Trip Dispatcher (drafting, payload validation, dispatch)
│       ├── drivers/              # Driver Registry & Safety Compliance
│       ├── maintenance/          # Preventative Service & Maintenance Logs
│       ├── fuel/                 # Fuel Purchase Logging & Fleet Efficiency Metrics
│       └── analytics/            # Financial, Utilization & Environmental Reports (Recharts)
│
├── components/                   # Reusable UI Components & Modals
│   ├── Navbar.js                 # Top navigation bar with "Ask Bob AI" trigger & user menu
│   ├── Sidebar.js                # Core navigation drawer with role-filtered routes
│   ├── BobAssistantDrawer.js     # Slide-out IBM Bob AI assistant with live tool traces
│   ├── KPICard.js                # Metric card displaying real-time operational counters
│   ├── StatusBadge.js            # Semantic status indicators for trips, vehicles & cold chain
│   ├── DataTable.js              # Sortable, filterable, and paginated data table
│   ├── FormModal.js              # Reusable modal dialog for creating/updating entities
│   ├── ConfirmModal.js           # Danger-confirmation dialog for safeguards
│   ├── EmptyState.js             # Visual empty state display
│   ├── ErrorBoundary.js          # React error boundary component
│   ├── ErrorState.js             # Error alert widget with retry trigger
│   ├── LoadingSpinner.js         # Unified loading indicator
│   └── ToastContainer.js         # Real-time notification and alert banner host
│
├── lib/                          # Core Business Logic, State & Integration Engines
│   ├── supabase.js               # Supabase PostgreSQL client & connection validator
│   ├── rbac.js                   # Role-Based Access Control matrix (Manager, Dispatcher, Safety, Finance)
│   ├── auth-context.js           # Authentication & session state provider
│   ├── toast-context.js          # Global toast notification dispatcher
│   ├── disruption-engine.js      # Corridor matching, risk weighting, and rerouting rules
│   ├── cold-chain-engine.js      # IoT threshold breach evaluation & excursion grading (WHO/FDA)
│   └── hooks/                    # Domain Custom Hooks (State + Realtime WebSocket Subscriptions)
│       ├── useDisruptions.js     # Disruption CRUD & impact analysis state
│       ├── useShipmentImpact.js  # Impact record management & recommendation acceptance
│       ├── useRedeployment.js    # Idle asset scanning & draft trip creation
│       ├── useColdChain.js       # Sensor stream ingestion & excursion triage
│       ├── useVehicles.js        # Vehicle CRUD operations
│       ├── useTrips.js           # Trip lifecycle management
│       ├── useDrivers.js         # Driver licensing & status
│       ├── useMaintenance.js     # Maintenance logging
│       └── useFuel.js            # Fuel efficiency calculations
│
└── mcp/                          # IBM Bob Model Context Protocol (MCP) Server Layer
    ├── tools.js                  # 13 live operational tools querying Supabase & engines
    ├── server.js                 # MCP Server definition via @modelcontextprotocol/sdk
    └── cli.js                    # Executable stdio transport CLI entrypoint (npm run mcp:start)
```

---

## ⚙️ How Frontend & Backend Communicate
1. **Direct Relational Queries:** Dashboard views utilize `@supabase/supabase-js` with authenticated sessions and Row-Level Security (RLS) policies.
2. **Real-Time WebSockets:** Hooks subscribe to Supabase Realtime change data capture (`postgres_changes`), updating tables instantaneously without polling.
3. **IBM Bob Assistant Layer:** The frontend `BobAssistantDrawer` dispatches queries to `/api/bob/chat`, which executes MCP tools in `src/mcp/tools.js` to inspect database records and evaluate operational rules.
4. **IBM Bob MCP Server:** External AI clients (IBM Bob CLI, Claude Desktop, Cursor) connect directly to `src/mcp/cli.js` via stdio JSON-RPC transport to inspect and triage supply chain events.
