# SupplyShield L2 — Complete Setup & Deployment Guide

> **Official Step-by-Step Setup Guide for Judges, Evaluators, and Developers.**  
> Follow this guide to set up, run, and verify the application, database, and IBM Bob MCP server.

---

## 1. Prerequisites

Ensure the following runtimes and tools are installed on your workstation:

| Requirement | Minimum Version | Recommended Version | Verification Command |
|---|---|---|---|
| **Node.js** | `v18.0.0` | `v20.x` or `v22.x` | `node --version` |
| **npm** | `v9.0.0` | `v10.x`+ | `npm --version` |
| **Git** | `v2.30.0`+ | Latest | `git --version` |
| **Web Browser** | Modern Chromium / Firefox / Safari / Edge | Latest | — |
| **Supabase Account** | Cloud (free tier) or Local Docker | Hosted Cloud | [supabase.com](https://supabase.com) |

---

## 2. Clone the Repository

Clone the repository to your local development environment:

```bash
git clone https://github.com/PreetMakadia595/bob-ai-hackathon--Team-Nexus-.git
cd bob-ai-hackathon--Team-Nexus-
```

---

## 3. Environment Variable Configuration

The project includes an environment template at `src/.env.example` (and `.env.example`).  
Create your local environment file in the project root:

```bash
cp .env.example .env.local
```

Open `.env.local` and populate your Supabase credentials:

```env
# ── Supabase / PostgreSQL Configuration ──────────────────────────────────────
# Retrieve these from your Supabase Dashboard: Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key-here

# Optional: Service role key for running the showcase seeder script
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key-here

# ── IBM watsonx.ai Configuration (Optional) ──────────────────────────────────
# If using IBM watsonx Granite reasoning:
WATSONX_API_KEY=your-watsonx-api-key-here
WATSONX_PROJECT_ID=your-watsonx-project-id-here
WATSONX_URL=https://us-south.ml.cloud.ibm.com

# ── Server Port ──────────────────────────────────────────────────────────────
PORT=3000
```

> ⚠️ **Security Reminder:** Never commit `.env` or `.env.local`. Secrets are strictly ignored by `.gitignore`.

---

## 4. Install Dependencies

Install all required production dependencies (including Next.js 16, React 19, Recharts, Lucide Icons, and `@modelcontextprotocol/sdk`):

```bash
npm install
```

---

## 5. Database Schema & Seed Setup

> ⚠️ **Important:** Do NOT drop or delete existing tables if connecting to an existing Supabase project. The migration scripts use `CREATE TABLE IF NOT EXISTS`.

If you are configuring a fresh Supabase database:

1. Log in to your **Supabase Dashboard** and open your project.
2. Navigate to **SQL Editor** → click **New Query**.
3. Apply the complete database setup schema:
   - Open and copy [`migrations/complete_database_setup.sql`](../migrations/complete_database_setup.sql)
   - Paste into the SQL Editor and click **Run**.
   - *This creates all 13 core and L2 tables (`vehicles`, `drivers`, `trips`, `disruptions`, `cold_chain_shipments`, etc.) with indexes and RLS policies.*

4. *(Optional but Recommended for Demo Evaluation)* Seed rich demonstration data:
   - Run the seed script via Node.js:
     ```bash
     node seed_showcase.js
     ```
   - *This seeds realistic vehicles, active dispatched trips, regional weather and port strike disruptions, and IoT cold chain sensor streams.*

---

## 6. IBM Bob & MCP Server Configuration

SupplyShield L2 provides a production **Model Context Protocol (MCP)** server exposing **13 live operational tools**.

### A. Testing the MCP Server Directly (CLI Mode)
To launch the MCP Server on stdio transport for connection with the **IBM Bob CLI**, Claude Desktop, or Cursor:

```bash
npm run mcp:start
```

*Expected output:*
```text
[IBM Bob MCP] SupplyShield L2 MCP Server running on stdio transport.
[IBM Bob MCP] Ready to receive tool requests from IBM Bob CLI / MCP client.
```

### B. Configuring IBM Bob CLI / MCP Client
To configure IBM Bob CLI or your MCP client to interact with SupplyShield, add the server to your `mcp_config.json`:

```json
{
  "mcpServers": {
    "bob-supplyshield": {
      "command": "node",
      "args": ["src/mcp/cli.js"],
      "cwd": "/path/to/bob-ai-hackathon--Team-Nexus-"
    }
  }
}
```

---

## 7. Run the Application

Start the Next.js full-stack development server:

```bash
npm run dev
```

The application will be live at: **`http://localhost:3000`**

To verify a production build:
```bash
npm run build
npm run start
```

---

## 8. Verification Checklist for Evaluators

Follow this 7-step checklist to confirm full system functionality:

- [ ] **1. Server Starts:** Development server boots without compilation warnings on `http://localhost:3000`.
- [ ] **2. Database Connects:** The Executive Command Center (`/`) loads real-time counters from Supabase without database error alerts.
- [ ] **3. Disruption Triage Works:** Navigate to `/disruptions`. Select an active event (e.g. *Typhoon In-fa*). Click **Analyze Impact** → observe computed impact levels (`blocked`, `high`) and recommended actions (`reroute`, `delay`).
- [ ] **4. Redeployment Optimizer Works:** Navigate to `/redeployment`. View idle vehicles scored 0–100 based on idle duration and regional disruption pressure. Click **Redeploy** to preview draft dispatch.
- [ ] **5. Cold Chain Monitoring Works:** Navigate to `/cold-chain`. Open **Simulate IoT Feed**, select a vaccine shipment (2°C–8°C limits), emit a high temperature spike (e.g. 15.2°C), and observe automated excursion detection and severity classification (`critical` / `regulatory_violation`).
- [ ] **6. IBM Bob Assistant Works:** In the top header bar, click **"Ask Bob AI"**. The slide-out drawer opens.
- [ ] **7. Live Tool Execution Verified:** Click any suggested prompt chip (e.g., *"Analyze active disruptions and corridor impacts"*). Observe that IBM Bob executes the real MCP tools (`get_active_disruptions`, `get_affected_shipments`) and returns live data with full audit traces.

---

## 9. Troubleshooting Guide

| Problem | Potential Cause | Verified Resolution |
|---|---|---|
| **Database Connection Fails** | Missing or incorrect Supabase credentials | Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`. Restart `npm run dev`. |
| **Tables Missing Error (`relation does not exist`)** | SQL schema not yet executed in Supabase | In Supabase Dashboard → SQL Editor, run `migrations/complete_database_setup.sql`. |
| **Empty Dashboard Counters** | Database is connected but has no records | Run `node seed_showcase.js` to populate rich demonstration data. |
| **MCP Server Won't Start** | Node version or path issue | Ensure Node.js $\ge$ v18.0.0. Run `node src/mcp/cli.js` directly from the repository root. |
| **"Ask Bob AI" Shows Network Error** | Backend API route unreachable | Ensure Next.js dev server is actively running on `http://localhost:3000` and check server terminal for error logs. |
| **Port 3000 Already in Use** | Another process is binding port 3000 | Specify an alternate port: `PORT=3001 npm run dev` or terminate the existing process. |
