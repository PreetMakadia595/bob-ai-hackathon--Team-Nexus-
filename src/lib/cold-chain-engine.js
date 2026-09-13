/**
 * Cold Chain Engine — Excursion detection and severity classification.
 *
 * Severity Classification Rules (documented for demo explanation):
 *
 * ┌──────────────────────┬────────────────────────────────────────────────────┐
 * │ Severity             │ Criteria                                          │
 * ├──────────────────────┼────────────────────────────────────────────────────┤
 * │ minor                │ Deviation ≤ 2°C from threshold, duration < 15 min │
 * │ major                │ Deviation > 2°C and ≤ 5°C, OR duration 15–60 min  │
 * │ critical             │ Deviation > 5°C, OR duration > 60 min             │
 * │ regulatory_violation │ Vaccine/pharma cargo: deviation > 3°C             │
 * │                      │ OR duration > 30 min                              │
 * └──────────────────────┴────────────────────────────────────────────────────┘
 */

/**
 * Checks if a sensor reading breaches the shipment's temperature thresholds.
 * Returns null if in range, or { breachType, deviation } if out of range.
 */
export function checkThresholdBreach(temperature, minTemp, maxTemp) {
  if (temperature < minTemp) {
    return {
      breachType: 'min',
      deviation: Math.abs(minTemp - temperature),
    };
  }
  if (temperature > maxTemp) {
    return {
      breachType: 'max',
      deviation: Math.abs(temperature - maxTemp),
    };
  }
  return null;
}

/**
 * Classifies the severity of a temperature excursion.
 *
 * @param {number} deviation - Degrees beyond the threshold
 * @param {number} durationMinutes - Duration of the excursion so far
 * @param {string} cargoType - 'vaccine' | 'perishable' | 'pharma' | 'other'
 * @param {string} regulatoryClass - Regulatory classification string
 * @returns {{ severity: string, notes: string }}
 */
export function classifyExcursionSeverity(deviation, durationMinutes, cargoType, regulatoryClass) {
  const isRegulatedCargo = cargoType === 'vaccine' || cargoType === 'pharma';

  // Regulatory violation check (strictest — takes priority)
  if (isRegulatedCargo && (deviation > 3 || durationMinutes > 30)) {
    return {
      severity: 'regulatory_violation',
      notes: `${cargoType.charAt(0).toUpperCase() + cargoType.slice(1)} cargo (${regulatoryClass || 'regulated'}): ` +
        `${deviation.toFixed(1)}°C deviation for ${durationMinutes} min exceeds regulatory limits ` +
        `(max 3°C deviation or 30 min for ${cargoType}).`,
    };
  }

  // Critical: > 5°C deviation OR > 60 min duration
  if (deviation > 5 || durationMinutes > 60) {
    return {
      severity: 'critical',
      notes: `Critical excursion: ${deviation.toFixed(1)}°C deviation sustained for ${durationMinutes} min. ` +
        `Immediate intervention required. Cargo integrity at risk.`,
    };
  }

  // Major: > 2°C and ≤ 5°C deviation, OR 15-60 min duration
  if (deviation > 2 || durationMinutes >= 15) {
    return {
      severity: 'major',
      notes: `Major excursion: ${deviation.toFixed(1)}°C deviation for ${durationMinutes} min. ` +
        `Monitor closely and prepare contingency. ${isRegulatedCargo ? 'Approaching regulatory threshold.' : ''}`,
    };
  }

  // Minor: ≤ 2°C deviation, < 15 min duration
  return {
    severity: 'minor',
    notes: `Minor excursion: ${deviation.toFixed(1)}°C deviation for ${durationMinutes} min. ` +
      `Brief breach within acceptable recovery window.`,
  };
}

/**
 * Estimates excursion duration by looking at previous sensor logs.
 * Finds how long temperature has been continuously outside the range.
 *
 * @param {Array} sortedLogs - Sensor logs sorted by timestamp ascending
 * @param {number} currentIndex - Index of the current (breaching) log
 * @param {number} minTemp - Min threshold
 * @param {number} maxTemp - Max threshold
 * @returns {number} Duration in minutes
 */
export function estimateExcursionDuration(sortedLogs, currentIndex, minTemp, maxTemp) {
  if (currentIndex <= 0) return 0;

  let startTime = new Date(sortedLogs[currentIndex].timestamp);

  // Walk backwards to find when the excursion started
  for (let i = currentIndex - 1; i >= 0; i--) {
    const log = sortedLogs[i];
    const temp = parseFloat(log.temperature);
    if (temp >= minTemp && temp <= maxTemp) {
      // This log was in range — excursion started after this
      break;
    }
    startTime = new Date(log.timestamp);
  }

  const currentTime = new Date(sortedLogs[currentIndex].timestamp);
  return Math.round((currentTime - startTime) / (1000 * 60)); // minutes
}

/**
 * Processes a new sensor log and determines if an excursion should be created.
 *
 * @param {Object} sensorLog - The new sensor log record
 * @param {Object} shipment - The cold chain shipment (with required_min_temp, required_max_temp, cargo_type, regulatory_class)
 * @param {Array} existingLogs - All previous sensor logs for this shipment, sorted by timestamp
 * @returns {Object|null} Excursion record to insert, or null if no breach
 */
export function detectExcursion(sensorLog, shipment, existingLogs = []) {
  const temp = parseFloat(sensorLog.temperature);
  const minTemp = parseFloat(shipment.required_min_temp);
  const maxTemp = parseFloat(shipment.required_max_temp);

  const breach = checkThresholdBreach(temp, minTemp, maxTemp);
  if (!breach) return null;

  // Estimate duration from previous logs
  const allLogs = [...existingLogs, sensorLog].sort(
    (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
  );
  const currentIdx = allLogs.findIndex(l => l.id === sensorLog.id);
  const durationMinutes = estimateExcursionDuration(allLogs, currentIdx, minTemp, maxTemp);

  // Classify severity
  const { severity, notes } = classifyExcursionSeverity(
    breach.deviation,
    durationMinutes,
    shipment.cargo_type,
    shipment.regulatory_class
  );

  return {
    cold_chain_shipment_id: shipment.id,
    sensor_log_id: sensorLog.id,
    detected_at: sensorLog.timestamp || new Date().toISOString(),
    excursion_temp: temp,
    threshold_breached: breach.breachType,
    duration_minutes: durationMinutes,
    severity,
    classification_notes: notes,
    status: 'open',
  };
}
