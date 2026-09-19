/**
 * Disruption Engine — Rule-based impact analysis, category mapping, and redeployment optimization logic.
 *
 * Used by the Disruption Command Panel & Fleet Redeployment Optimizer to:
 * 1. Match disruptions against active trips with assigned RouteIDs
 * 2. Map impact categories (Critical, High, Medium, Low) to Action Statuses (Delay, Reroute, Redeployment)
 * 3. Evaluate multi-variable optimization scores (0-100) dynamically tailored to selected disruptions
 */

import {
  determineRouteId,
  getRouteById,
  calculateShipmentCost,
  getExpectedTransitWindow,
  formatINR,
  FREIGHT_CONSTANTS
} from './routes.js';

const SEVERITY_WEIGHT = { low: 1, medium: 2, high: 3, critical: 4 };

/**
 * Calculates the active blockage time window for a disruption.
 */
export function getDisruptionTimeWindow(disruption) {
  let startDate = disruption?.start_date ? new Date(disruption.start_date) : new Date();
  if (isNaN(startDate.getTime())) startDate = new Date();

  let endDate;
  if (disruption?.end_date) {
    endDate = new Date(disruption.end_date);
    if (isNaN(endDate.getTime())) endDate = null;
  }

  if (!endDate) {
    // Estimate clearing duration based on disruption type and severity
    const sev = (disruption?.severity || 'medium').toLowerCase();
    const type = (disruption?.type || '').toLowerCase();
    let durationHours = 6;
    if (sev === 'critical' || type === 'port_strike') durationHours = 8;
    else if (sev === 'high') durationHours = 6;
    else if (sev === 'medium') durationHours = 4;
    else durationHours = 2.5;

    endDate = new Date(startDate.getTime() + durationHours * 3600000);
  }

  const durationHours = Math.max(1, Math.round(((endDate.getTime() - startDate.getTime()) / 3600000) * 10) / 10);

  const formatIST = (d) => {
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) + ' ' +
      d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }) + ' IST';
  };

  return {
    startDate,
    endDate,
    durationHours,
    startFormatted: formatIST(startDate),
    endFormatted: formatIST(endDate),
    windowLabel: `${formatIST(startDate)} — ${formatIST(endDate)} (${durationHours}h blockage)`,
  };
}

/**
 * Checks whether a trip's scheduled transit window falls inside the disruption's blockage time window.
 * Only trucks scheduled to transit during the blockage need to be diverted.
 */
export function isTransitInBlockageWindow(trip, disruption) {
  if (!disruption) return true;

  const disruptionWindow = getDisruptionTimeWindow(disruption);
  const transitWindow = getExpectedTransitWindow(trip);

  const tripDep = transitWindow.departureDate.getTime();
  const tripArr = transitWindow.arrivalDate.getTime();
  const disStart = disruptionWindow.startDate.getTime();
  const disEnd = disruptionWindow.endDate.getTime();

  // If trip completes BEFORE disruption begins: Safe, no diversion
  if (tripArr < disStart) {
    return false;
  }

  // If trip departs AFTER disruption clears: Safe, no diversion
  if (tripDep > disEnd) {
    return false;
  }

  // Otherwise, transit window intersects the active corridor blockage!
  return true;
}

/**
 * Provides a human-readable diagnosis of why a truck is or is not diverted based on time window.
 */
export function checkTripBlockageStatus(trip, disruption) {
  if (!disruption) {
    return { inWindow: true, status: 'Active Corridor Alert', reason: 'Active corridor advisory' };
  }

  const disWindow = getDisruptionTimeWindow(disruption);
  const transitWindow = getExpectedTransitWindow(trip);

  const tripDep = transitWindow.departureDate.getTime();
  const tripArr = transitWindow.arrivalDate.getTime();
  const disStart = disWindow.startDate.getTime();
  const disEnd = disWindow.endDate.getTime();

  if (tripArr < disStart) {
    return {
      inWindow: false,
      status: 'Unaffected (Pre-Disruption)',
      badgeColor: '#10b981',
      badgeBg: 'rgba(16, 185, 129, 0.12)',
      reason: `Truck arrives at ${transitWindow.etaFormatted}, before disruption begins at ${disWindow.startFormatted}. Safe to transit on primary corridor without diversion.`,
    };
  }

  if (tripDep > disEnd) {
    return {
      inWindow: false,
      status: 'Unaffected (Post-Clearance)',
      badgeColor: '#10b981',
      badgeBg: 'rgba(16, 185, 129, 0.12)',
      reason: `Truck departs at ${transitWindow.departureFormatted}, after estimated clearance at ${disWindow.endFormatted}. Safe to transit on primary corridor without diversion.`,
    };
  }

  return {
    inWindow: true,
    status: 'In Blockage Window ➔ Divert',
    badgeColor: '#ef4444',
    badgeBg: 'rgba(239, 68, 68, 0.15)',
    reason: `Transit window (${transitWindow.departureFormatted} ➔ ${transitWindow.etaFormatted}) intersects corridor blockage (${disWindow.startFormatted} ➔ ${disWindow.endFormatted}). Divert or redeployment required.`,
  };
}

/**
 * Determines whether a trip is affected by a disruption based on region, RouteID matching,
 * AND time-window intersection.
 */
export function isTripAffected(trip, disruption) {
  // If trip is already rerouted, redeployed, reassigned, or finalized, it is NOT affected by active disruption
  const tripNotes = (trip.notes || '').toUpperCase();
  if (
    tripNotes.includes('REROUTED') ||
    tripNotes.includes('REDEPLOYMENT') ||
    tripNotes.includes('REASSIGNED') ||
    trip.status === 'Completed' ||
    trip.status === 'Delivered' ||
    trip.status === 'Cancelled'
  ) {
    return false;
  }

  const disruptionRegion = (disruption.region || '').toLowerCase();
  const disruptionRoute = (disruption.route_id || '').toLowerCase();
  const tripRoute = (trip.route_id || determineRouteId(trip.origin, trip.destination)).toLowerCase();

  let corridorMatches = false;
  // Direct RouteID match
  if (disruptionRoute && tripRoute && disruptionRoute === tripRoute) {
    corridorMatches = true;
  } else if (disruptionRegion) {
    const origin = (trip.origin || '').toLowerCase();
    const destination = (trip.destination || '').toLowerCase();
    corridorMatches = origin.includes(disruptionRegion) ||
                      destination.includes(disruptionRegion) ||
                      disruptionRegion.includes(origin) ||
                      disruptionRegion.includes(destination);
  }

  if (!corridorMatches) {
    return false;
  }

  // TIME-WINDOW CHECK: Only divert trucks whose transit window intersects the active blockage window!
  return isTransitInBlockageWindow(trip, disruption);
}

/**
 * Computes the impact level for a trip given a disruption.
 */
export function computeImpactLevel(disruption, trip) {
  const sev = SEVERITY_WEIGHT[disruption.severity] || 1;
  const isActive = trip.status === 'Dispatched';

  if (sev >= 4) return isActive ? 'blocked' : 'high';
  if (sev >= 3) return isActive ? 'high' : 'medium';
  if (sev >= 2) return isActive ? 'medium' : 'low';
  return 'low';
}

/**
 * Generates recommended action mapped from impact category:
 * - Blocked / Critical ➔ 'redeployment' or 'reroute'
 * - High ➔ 'reroute'
 * - Medium ➔ 'delay' or 'reroute'
 * - Low ➔ 'delay'
 */
export function computeRecommendedAction(impactLevel, disruptionType) {
  if (impactLevel === 'blocked') {
    // Port strikes and severe corridor halts map to redeployment of fleet capacity
    return disruptionType === 'port_strike' ? 'redeployment' : 'reroute';
  }
  if (impactLevel === 'high') {
    return 'reroute';
  }
  if (impactLevel === 'medium') {
    return disruptionType === 'port_strike' ? 'delay' : 'reroute';
  }
  return 'delay';
}

/**
 * Generates a human-readable rationale for the recommendation.
 */
export function generateRationale(disruption, trip, impactLevel, action) {
  const region = disruption.region || 'affected corridor';
  const routeId = trip.route_id || determineRouteId(trip.origin, trip.destination);
  const routeDesc = [trip.origin, trip.destination].filter(Boolean).join(' → ') || 'active route';

  const actionDescriptions = {
    redeployment: `Impact is ${impactLevel.toUpperCase()}. Corridor on [${routeId}] is obstructed due to ${disruption.type.replace('_', ' ')} in ${region}. Recommend Fleet Redeployment to reposition assets around bottleneck.`,
    reroute: `Impact is ${impactLevel.toUpperCase()} on [${routeId}]. Recommend immediate rerouting around ${region} to avoid severe delay from ${disruption.type.replace('_', ' ')} (severity: ${disruption.severity}).`,
    delay: `Impact is ${impactLevel.toUpperCase()} on [${routeId}]. Recommend delaying departure on ${routeDesc} until disruption in ${region} clears.`,
    reassign_carrier: `Consider reassigning cargo to alternative multimodal carrier operating outside ${region}.`,
    no_action: `Impact is low on [${routeId}]. Existing schedule buffer accommodates anticipated delay.`,
  };

  return actionDescriptions[action] || `Impact level: ${impactLevel} on Route ${routeId}. Operator intervention recommended.`;
}

/**
 * Full analysis pipeline: given a disruption and list of trips, return impact records.
 */
export function analyzeDisruptionImpact(disruption, trips) {
  const activeTrips = trips.filter(t => t.status === 'Draft' || t.status === 'Dispatched');
  const impacted = [];

  for (const trip of activeTrips) {
    if (isTripAffected(trip, disruption)) {
      const impactLevel = computeImpactLevel(disruption, trip);
      const action = computeRecommendedAction(impactLevel, disruption.type);
      const notes = generateRationale(disruption, trip, impactLevel, action);
      const routeId = trip.route_id || determineRouteId(trip.origin, trip.destination);

      impacted.push({
        disruption_id: disruption.id,
        trip_id: trip.id,
        impact_level: impactLevel,
        recommended_action: action,
        notes,
        route_id: routeId,
      });
    }
  }

  return impacted;
}

/**
 * Computes a transparent, multi-variable redeployment score breakdown (0-100)
 * specifically tailored for an idle vehicle against a target disruption.
 *
 * Evaluation Factors:
 * 1. Idle Duration Component (0 - 35 points):
 *    - 0.8 points per hour, capped at 35 points (reached at ~44h idle)
 * 2. Regional & Corridor Proximity Fit (0 - 40 points):
 *    - Same region / corridor RouteID match:
 *        Critical: 40 pts, High: 35 pts, Medium: 25 pts, Low: 15 pts
 *    - Adjacent / connected bypass corridor:
 *        Critical: 25 pts, High: 20 pts, Medium: 15 pts
 *    - Distant region: 8 - 10 pts
 * 3. Payload & Vehicle Capacity Match (0 - 25 points):
 *    - Capacity > 24,000 kg: 25 pts (heavy haulage for bulk backlogs)
 *    - Capacity > 15,000 kg: 20 pts
 *    - Capacity > 6,000 kg: 15 pts
 *    - Light vehicle / Van: 10 pts (boosted to 25 pts if cold-chain reefer during pharma surge)
 *
 * Total = Idle (35) + Region/Route (40) + Capacity (25) = 100 max points.
 */
export function computeRedeploymentScoreBreakdown(vehicle, idleHours = 24, activeDisruptions = [], selectedDisruption = null) {
  const hours = Math.max(1, Number(idleHours) || 1);
  const capacity = Number(vehicle?.max_capacity) || 0;
  const vehicleRegion = (vehicle?.region || '').toLowerCase();
  const vehicleType = (vehicle?.type || '').toLowerCase();

  // 1. Idle Duration Factor (Max 35 pts)
  const idleScore = Math.min(35, Math.max(5, Math.round(hours * 0.8)));
  const idleDetail = `${hours}h idle (${idleScore}/35 pts)`;

  // Determine target disruption
  let target = selectedDisruption;
  if (!target && Array.isArray(activeDisruptions) && activeDisruptions.length > 0) {
    // If no specific disruption selected, pick top severity
    const sevWeight = { critical: 4, high: 3, medium: 2, low: 1 };
    target = [...activeDisruptions].sort((a, b) => (sevWeight[b.severity] || 0) - (sevWeight[a.severity] || 0))[0];
  }

  // 2. Regional & Route Proximity Factor (Max 40 pts)
  let regionScore = 10;
  let regionDetail = 'Distant corridor (10/40 pts)';

  if (target) {
    const targetRegion = (target.region || '').toLowerCase();
    const targetRoute = (target.route_id || '').toUpperCase();
    const sev = target.severity || 'high';

    const isExactRegion = vehicleRegion && targetRegion && vehicleRegion === targetRegion;
    const isAdjacent = (vehicleRegion === 'central' && (targetRegion === 'west' || targetRegion === 'south')) ||
                       (vehicleRegion === 'west' && targetRegion === 'central') ||
                       (vehicleRegion === 'north' && targetRegion === 'central');

    if (isExactRegion) {
      if (sev === 'critical') {
        regionScore = 40;
        regionDetail = `Exact match in ${target.region} (${targetRoute || 'Corridor'}) — Critical priority (40/40 pts)`;
      } else if (sev === 'high') {
        regionScore = 35;
        regionDetail = `Exact match in ${target.region} — High surge corridor (35/40 pts)`;
      } else if (sev === 'medium') {
        regionScore = 26;
        regionDetail = `Regional match in ${target.region} — Moderate surge (26/40 pts)`;
      } else {
        regionScore = 18;
        regionDetail = `Regional match in ${target.region} — Low surge (18/40 pts)`;
      }
    } else if (isAdjacent) {
      if (sev === 'critical') regionScore = 28;
      else if (sev === 'high') regionScore = 22;
      else regionScore = 16;
      regionDetail = `Adjacent bypass corridor to ${target.region} (${regionScore}/40 pts)`;
    } else {
      regionScore = 8;
      regionDetail = `Inter-region transit required to ${target.region} (8/40 pts)`;
    }
  } else {
    regionScore = 15;
    regionDetail = 'Global baseline regional readiness (15/40 pts)';
  }

  // 3. Payload & Vehicle Capacity Factor (Max 25 pts)
  let capacityScore = 10;
  let capacityDetail = 'Standard payload class (10/25 pts)';

  const isColdChainDemand = target && (
    target.title?.toLowerCase().includes('pharma') ||
    target.title?.toLowerCase().includes('vaccine') ||
    target.description?.toLowerCase().includes('cold')
  );

  if (isColdChainDemand && vehicleType.includes('van') && vehicle?.model?.toLowerCase().includes('reefer')) {
    capacityScore = 25;
    capacityDetail = 'Reefer cold-chain capability matched to temperature-sensitive cargo (25/25 pts)';
  } else if (capacity >= 25000) {
    capacityScore = 25;
    capacityDetail = `Heavy haulage ${Math.round(capacity / 1000)}T capacity (25/25 pts)`;
  } else if (capacity >= 16000) {
    capacityScore = 20;
    capacityDetail = `Multi-axle ${Math.round(capacity / 1000)}T capacity (20/25 pts)`;
  } else if (capacity >= 7000) {
    capacityScore = 15;
    capacityDetail = `Medium duty ${Math.round(capacity / 1000)}T capacity (15/25 pts)`;
  } else {
    capacityScore = 10;
    capacityDetail = `Rapid dispatch capacity ${capacity}kg (10/25 pts)`;
  }

  // Calculate Total
  const total = Math.min(100, Math.max(0, idleScore + regionScore + capacityScore));
  const formula = `${idleScore}/35 (Idle) + ${regionScore}/40 (Route/Region) + ${capacityScore}/25 (Capacity) = ${total}/100`;

  return {
    total,
    idleScore,
    regionScore,
    capacityScore,
    idleDetail,
    regionDetail,
    capacityDetail,
    formula,
    targetDisruption: target,
  };
}

/**
 * Computes a single redeployment priority score integer (0-100).
 * Kept for backwards compatibility with existing consumers.
 */
export function computeRedeploymentScore(vehicle, idleHours, activeDisruptions, selectedDisruption = null) {
  const result = computeRedeploymentScoreBreakdown(vehicle, idleHours, activeDisruptions, selectedDisruption);
  return result.total;
}

/**
 * 3-Tier Disruption Condition Check Engine for Vehicles:
 * Evaluates conditions affecting a vehicle/trip during a disruption.
 *
 * Rules:
 * - Low: System Decides 'Delay'
 * - Medium: System Decides 'Delay' OR 'Reroute'
 * - High: System Decides 'Reroute' OR 'Reassign to Other Vehicle'
 */
export function evaluateVehicleDisruptionCondition(trip, disruption, impactRecord = null) {
  const rawSev = (impactRecord?.impact_level || disruption?.severity || 'medium').toLowerCase();

  let category = 'medium';
  if (rawSev === 'low') {
    category = 'low';
  } else if (rawSev === 'medium') {
    category = 'medium';
  } else {
    // high, critical, blocked
    category = 'high';
  }

  // Financial & Transit Time Calculations
  const cost = calculateShipmentCost(trip);
  const transitWindow = getExpectedTransitWindow(trip);
  const timeStatus = checkTripBlockageStatus(trip, disruption);
  const disWindow = getDisruptionTimeWindow(disruption);

  const rerouteDelta = Math.round(cost * 0.16 + 1500);
  const delayDelta = Math.round(FREIGHT_CONSTANTS.DELAY_HOLDING_COST_PER_HOUR * (category === 'low' ? 2.0 : 3.5));
  const redeployDelta = Math.round(FREIGHT_CONSTANTS.REDEPLOYMENT_TRANSFER_FEE + 2200);

  const commonProps = {
    cost,
    formattedCost: formatINR(cost),
    transitWindow,
    timeStatus,
    disWindow,
    rerouteCostDelta: rerouteDelta,
    formattedRerouteCostDelta: formatINR(rerouteDelta, true),
    delayCostDelta: delayDelta,
    formattedDelayCostDelta: formatINR(delayDelta, true),
    redeployCostDelta: redeployDelta,
    formattedRedeployCostDelta: formatINR(redeployDelta, true),
    etaFormatted: transitWindow.etaFormatted,
    departureFormatted: transitWindow.departureFormatted,
  };

  if (category === 'low') {
    return {
      ...commonProps,
      category: 'low',
      categoryLabel: 'LOW IMPACT',
      categoryColor: '#22c55e',
      categoryBg: 'rgba(34, 197, 94, 0.12)',
      categoryBorder: 'rgba(34, 197, 94, 0.35)',
      decision: 'delay',
      decisionLabel: 'System Decision: DELAY',
      decisionSummary: 'Minor corridor slowdown detected (< 2 hrs). System automatically decides schedule buffer delay without altering vehicle assignment or route trajectory.',
      diagnostic: 'Corridor operational with light friction. Existing schedule buffer absorbs variance.',
      allowedActions: ['delay'],
    };
  }

  if (category === 'medium') {
    return {
      ...commonProps,
      category: 'medium',
      categoryLabel: 'MEDIUM IMPACT',
      categoryColor: '#eab308',
      categoryBg: 'rgba(234, 179, 8, 0.12)',
      categoryBorder: 'rgba(234, 179, 8, 0.35)',
      decision: 'delay_or_reroute',
      decisionLabel: 'System Decision: DELAY or REROUTE',
      decisionSummary: 'Moderate bottleneck or single-lane stoppage (3-6 hrs delay). System checks conditions and offers operator choice: apply buffer delay or engage alternate corridor detour.',
      diagnostic: 'Corridor bottleneck active. Recommended: evaluate local detour bypass vs holding staging buffer.',
      allowedActions: ['delay', 'reroute'],
    };
  }

  // High Category
  return {
    ...commonProps,
    category: 'high',
    categoryLabel: 'HIGH IMPACT',
    categoryColor: '#ef4444',
    categoryBg: 'rgba(239, 68, 68, 0.12)',
    categoryBorder: 'rgba(239, 68, 68, 0.35)',
    decision: 'reroute_or_reassign',
    decisionLabel: 'System Decision: REROUTE or REASSIGN TO OTHER VEHICLE',
    decisionSummary: 'Severe corridor stoppage, port strike, or critical hazard (> 8 hrs delay). System checks conditions and mandates either detour rerouting OR reassigning cargo payload immediately to an idle fleet vehicle.',
    diagnostic: 'Critical corridor impassable or vehicle immobilized. High priority: divert route or reassign payload to available fleet asset.',
    allowedActions: ['reroute', 'reassign_vehicle'],
  };
}

