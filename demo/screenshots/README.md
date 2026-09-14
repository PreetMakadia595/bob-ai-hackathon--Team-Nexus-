# Screenshots Guide

This directory stores the official application screenshots demonstrating **SupplyShield L2** running with live data.

---

## 📸 Required Screenshot Files

Place the following 3 screenshots in this directory:

### 1. `01-home-dashboard.png`
- **What to capture:** The main **Executive Command Center** (`http://localhost:3000`).
- **Key elements to show:**
  - Real-time L2 KPI metric tiles: *Active Disruptions*, *Shipments Impacted*, *Idle Assets*, and *Open Excursions*.
  - Core fleet overview charts (Fleet Status distribution, Vehicle Type breakdown).
  - Recent Dispatched Trips table showing live status badges.
  - The top navigation bar displaying the **"Ask Bob AI"** button.

---

### 2. `02-query-input.png`
- **What to capture:** The **IBM Bob AI Assistant Drawer** open on the right side of the screen.
- **Key elements to show:**
  - Click the **"Ask Bob AI"** button in the header to open the slide-out drawer.
  - The header badge showing: *IBM Bob AI • MCP LOAD-BEARING • Live Supabase & Deterministic Engines*.
  - Suggested query chips: *"Analyze active disruptions and corridor impacts"*, *"Check cold chain shipments for temperature excursions"*, *"Recommend idle fleet assets for redeployment"*.
  - User typing a prompt or selecting an operational action chip.

---

### 3. `03-result-output.png`
- **What to capture:** The **IBM Bob Response & Live MCP Tool Execution Trace**.
- **Key elements to show:**
  - IBM Bob's structured intelligence report displaying active disruptions, impacted corridors, and recommended dispatch actions.
  - The expanded **"MCP Tools Executed"** badge displaying the real underlying tool calls (e.g. `get_active_disruptions`, `get_affected_shipments`) and live data payloads retrieved from Supabase.
  - Actionable mitigation recommendations with rationales.

---

## 💡 How to Capture
1. Ensure your Next.js application is running: `npm run dev` at `http://localhost:3000`.
2. Open your browser (recommended: 1440x900 resolution or full HD).
3. Capture the 3 views described above using standard screenshot tools (e.g. Windows Snipping Tool `Win + Shift + S`).
4. Save them directly into this folder (`demo/screenshots/`) with the exact filenames:
   - `01-home-dashboard.png`
   - `02-query-input.png`
   - `03-result-output.png`
