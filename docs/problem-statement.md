# Problem Statement: Supply Chain Disruption & Cold Chain Fragility

## 1. Background
Modern supply chains and logistics networks operate in volatile environments vulnerable to severe weather events, labor strikes, geopolitical conflicts, and infrastructure bottlenecks. Concurrently, the global transport of perishable goods, biologics, and pharmaceuticals requires unbroken cold chain temperature maintenance under stringent regulations (such as WHO PQS, CDC Vaccine Storage Guidelines, and FDA 21 CFR Part 11).

## 2. The Problem
Fleet management systems are traditionally designed as static, siloed registries. They track where a truck is, but fail to answer the critical questions that arise during disruptions:
1. **Unseen Cascade Impacts:** When a port strike or blizzard shuts down a transit corridor, dispatchers must manually cross-reference dozens of active shipments to identify which trips will be blocked or stranded.
2. **Idle Asset Misallocation:** When routes become impassable, vehicles sit idle in unaffected hubs while neighboring regions experience sudden demand surges and delivery backlogs.
3. **Cold Chain Compliance Gaps:** Temperature excursions in pharmaceutical and perishable cargo are frequently discovered only upon arrival at the delivery dock — hours after spoilage has occurred — resulting in total cargo loss, regulatory fines, and public health hazards.
4. **Disjointed Communication:** Dispatchers, safety officers, and fleet managers lack a shared, real-time command surface to evaluate disruption severity, assess impact, and execute reroutes synchronously.

## 3. Who is Affected
- **Fleet & Logistics Managers:** Responsible for overall utilization rates, operational costs, and meeting service level agreements (SLAs).
- **Dispatchers:** Operational coordinators who must make high-stakes, time-critical decisions to reroute or delay active shipments under pressure.
- **Safety & Compliance Officers:** Charged with verifying driver qualifications, vehicle roadworthiness, and pharmaceutical temperature compliance standards.
- **Shippers & Consignees:** Enterprises, hospitals, and retailers relying on predictable deliveries and uncontaminated temperature-controlled products.

## 4. Why It Matters
- **Financial Cost:** Fleet idle time costs hundreds of dollars per day per vehicle in depreciation and lost revenue; cold chain spoilage accounts for over $35 billion in annual pharmaceutical losses globally.
- **Regulatory Penalties:** Non-compliant temperature logging for vaccines and biologics invalidates batches, resulting in severe regulatory audits and loss of transport licenses.
- **Operational Chaos:** Manual rerouting by phone or spreadsheet leads to driver confusion, fuel waste, and hours of unnecessary transit delays.

## 5. Why Existing Solutions Fall Short
- Legacy TMS (Transportation Management Systems) are bloated, non-reactive desktop software with no real-time WebSocket syncing.
- Telematics providers offer hardware trackers with basic email alerts, but do not provide an intelligent algorithmic engine to classify excursion severity or recommend rerouting actions.
- General fleet software lacks specialized cold chain compliance features, forcing operators to stitch together multiple third-party tools.
