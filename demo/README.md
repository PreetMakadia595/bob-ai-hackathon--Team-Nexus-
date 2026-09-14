# Demo Artifacts & Evidence Guide

This directory contains the demonstration evidence for **SupplyShield L2 — Supply Chain Disruption Assistant & Fleet Utilisation Optimizer**.

---

## 1. Demo Video (`demo-video-link.txt`)
- **Status:** Currently set to `VIDEO_NOT_ADDED_YET`.
- When ready, replace the content of `demo-video-link.txt` with a single line containing the video URL (e.g., Loom, YouTube unlisted, IBM Box, or Google Drive).
- **Recommended Video Flow (3–5 minutes):**
  1. **Architecture & Startup:** Show the application running locally via `npm run dev` and the MCP server initialized via `npm run mcp:start`.
  2. **Disruption Command Panel (`/disruptions`):** Select an active disruption event (e.g. Typhoon or Port Strike), trigger **Analyze Impact**, view affected trips, and accept an automated rerouting recommendation.
  3. **Fleet Redeployment Optimizer (`/redeployment`):** Show idle vehicle discovery, multi-factor scoring (0–100), and one-click draft dispatch.
  4. **Cold Chain Monitoring & Telemetry (`/cold-chain`):** Open the IoT simulator, simulate a temperature spike breach on vaccine cargo, and show automated excursion detection and severity classification.
  5. **IBM Bob Assistant (Header "Ask Bob AI"):** Open the drawer, run a natural language query, and show the live Model Context Protocol (MCP) tool execution traces against Supabase.

---

## 2. Live Demo URL (`live-demo-url.txt`)
- **Status:** Currently set to `NOT DEPLOYED`.
- If the project is deployed to a cloud platform (e.g. Vercel, IBM Cloud Code Engine), place the URL in `demo/live-demo-url.txt`.

---

## 3. Screenshots (`demo/screenshots/`)
The required screenshots capture actual application features:
- `01-home-dashboard.png`: Command Center dashboard featuring real-time L2 KPI tiles alongside core fleet metrics.
- `02-query-input.png`: The IBM Bob AI Assistant drawer open with live query input and operational prompt chips.
- `03-result-output.png`: Disruption impact analysis, corridor rerouting mitigation, and idle asset redeployment ranking outputs.
