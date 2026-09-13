/**
 * Disruption Engine — Rule-based impact analysis and recommendation logic.
 *
 * Used by the Disruption Command Panel to:
 * 1. Match disruptions against active trips by region
 * 2. Compute impact levels based on disruption severity + trip status
 * 3. Generate recommended actions
 */

const SEVERITY_WEIGHT = { low: 1, medium: 2, high: 3, critical: 4 };

/**
 * Determines whether a trip is affected by a disruption based on region matching.
 * Matches disruption.region against trip.origin and trip.destination (case-insensitive contains).
 */
export function isTripAffected(trip, disruption) {
  const region = (disruption.region || '').toLowerCase();
  if (!region) return false;
  const origin = (trip.origin || '').toLowerCase();
  const destination = (trip.destination || '').toLowerCase();
  return origin.includes(region) || destination.includes(region) ||
         region.includes(origin) || region.includes(destination);
}

/**
 * Computes the impact level for a trip given a disruption.
 *
 * Rules:
 * - critical disruption → blocked (unless trip is Draft)
 * - high disruption + Dispatched trip → high
 * - high disruption + Draft trip → medium
 * - medium disruption → medium (Dispatched) or low (Draft)
 * - low disruption → low
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
 * Generates a recommended action based on impact level and disruption type.
 *
 * Rules:
 * - blocked → reroute (if weather/geopolitical) or delay (if port_strike)
 * - high → reroute
 * - medium → delay (if port_strike) or reassign_carrier (otherwise)
 * - low → no_action
 */
export function computeRecommendedAction(impactLevel, disruptionType) {
  if (impactLevel === 'blocked') {
    return disruptionType === 'port_strike' ? 'delay' : 'reroute';
  }
  if (impactLevel === 'high') {
    return 'reroute';
  }
  if (impactLevel === 'medium') {
    return disruptionType === 'port_strike' ? 'delay' : 'reassign_carrier';
  }
  return 'no_action';
}

/**
 * Generates a human-readable rationale for the recommendation.
 */
export function generateRationale(disruption, trip, impactLevel, action) {
  const region = disruption.region || 'affected region';
  const route = [trip.origin, trip.destination].filter(Boolean).join(' → ') || 'this route';

  const actionDescriptions = {
    reroute: `Recommend rerouting ${route} to avoid ${region} due to ${disruption.type.replace('_', ' ')} disruption (severity: ${disruption.severity}).`,
    delay: `Recommend delaying shipment on ${route} until ${disruption.type.replace('_', ' ')} disruption in ${region} is resolved.`,
    reassign_carrier: `Consider reassigning to an alternative carrier not operating through ${region}.`,
    no_action: `Impact is ${impactLevel}. Current schedule buffer should accommodate minor delays from ${disruption.type.replace('_', ' ')} in ${region}.`,
  };

  return actionDescriptions[action] || `Impact level: ${impactLevel}. Review manually.`;
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

      impacted.push({
        disruption_id: disruption.id,
        trip_id: trip.id,
        impact_level: impactLevel,
        recommended_action: action,
        notes,
      });
    }
  }

  return impacted;
}

/**
 * Computes a redeployment priority score for an idle vehicle.
 *
 * Score (0-100) based on:
 * - Idle duration: longer idle = higher score (max 50 pts)
 * - Region demand: active disruptions in nearby regions add 10-30 pts
 * - Vehicle capacity: larger capacity = slight boost (max 20 pts)
 */
export function computeRedeploymentScore(vehicle, idleHours, activeDisruptions) {
  let score = 0;

  // Idle duration component (0-50)
  score += Math.min(50, Math.round(idleHours * 1.5));

  // Disruption demand component (0-30)
  const regionDisruptions = activeDisruptions.filter(d =>
    (d.region || '').toLowerCase() === (vehicle.region || '').toLowerCase() ||
    (d.severity === 'critical' || d.severity === 'high')
  );
  score += Math.min(30, regionDisruptions.length * 15);

  // Vehicle capacity component (0-20)
  const capacity = vehicle.max_capacity || 0;
  if (capacity > 15000) score += 20;
  else if (capacity > 8000) score += 15;
  else if (capacity > 3000) score += 10;
  else score += 5;

  return Math.min(100, score);
}
