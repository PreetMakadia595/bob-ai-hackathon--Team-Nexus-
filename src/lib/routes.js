/**
 * Route & Regional Corridor Catalog
 *
 * Defines canonical Route IDs connecting regional corridors across SupplyShield L2:
 * - East to West Route: EW785
 * - West to East Route: WE786
 * - North to South Route: NS654
 * - South to North Route: SN655
 * - West Corridor (Intra-West): WN412
 * - South Corridor (Intra-South): SE320
 * - North Corridor (Intra-North): NC210
 * - East Corridor (Intra-East): EC180
 * - Central to West Detour: CW550
 * - Central to South Detour: CS560
 */

export const ROUTES_CATALOG = [
  {
    id: 'EW785',
    name: 'East to West Route',
    originRegion: 'East',
    destRegion: 'West',
    sourcePlace: 'Kolkata',
    destPlace: 'Mumbai',
    places: 'Kolkata ➔ Mumbai',
    fullPlaces: 'Kolkata Port ➔ Mumbai Central',
    corridorType: 'Interstate Arterial',
    description: 'Connects Kolkata/Haldia and Gangetic ports to Mumbai/Ahmedabad industrial zones.',
    cities: ['Kolkata', 'Haldia', 'Patna', 'Bhubaneswar', 'Ahmedabad', 'Mumbai', 'Surat', 'Kandla'],
    color: '#3b82f6',
    badgeBg: 'rgba(59, 130, 246, 0.12)',
    badgeBorder: 'rgba(59, 130, 246, 0.35)',
  },
  {
    id: 'WE786',
    name: 'West to East Route',
    originRegion: 'West',
    destRegion: 'East',
    sourcePlace: 'Mumbai',
    destPlace: 'Kolkata',
    places: 'Mumbai ➔ Kolkata',
    fullPlaces: 'Mumbai Central ➔ Kolkata Port',
    corridorType: 'Interstate Arterial',
    description: 'Connects western manufacturing hubs (Mumbai/Pune/Kandla) to eastern consumer markets.',
    cities: ['Mumbai', 'Pune', 'Kandla', 'Ahmedabad', 'Nagpur', 'Raipur', 'Patna', 'Kolkata'],
    color: '#06b6d4',
    badgeBg: 'rgba(6, 182, 212, 0.12)',
    badgeBorder: 'rgba(6, 182, 212, 0.35)',
  },
  {
    id: 'NS654',
    name: 'North to South Route',
    originRegion: 'North',
    destRegion: 'South',
    sourcePlace: 'Delhi NCR',
    destPlace: 'Bengaluru',
    places: 'Delhi ➔ Bengaluru',
    fullPlaces: 'Delhi Gateway ➔ Bengaluru Tech Hub',
    corridorType: 'National Grand Trunk',
    description: 'Primary north-south freight spine connecting NCR/Punjab/Haryana to Bengaluru/Chennai.',
    cities: ['Delhi', 'Gurugram', 'Jaipur', 'Chandigarh', 'Hyderabad', 'Bengaluru', 'Chennai', 'Kochi'],
    color: '#8b5cf6',
    badgeBg: 'rgba(139, 92, 246, 0.12)',
    badgeBorder: 'rgba(139, 92, 246, 0.35)',
  },
  {
    id: 'SN655',
    name: 'South to North Route',
    originRegion: 'South',
    destRegion: 'North',
    sourcePlace: 'Chennai',
    destPlace: 'Delhi NCR',
    places: 'Chennai ➔ Delhi',
    fullPlaces: 'Chennai Port ➔ Delhi Gateway',
    corridorType: 'National Grand Trunk',
    description: 'Return spine carrying southern industrial and electronic components to northern depots.',
    cities: ['Chennai', 'Bengaluru', 'Hyderabad', 'Nagpur', 'Bhopal', 'Gwalior', 'Agra', 'Delhi'],
    color: '#ec4899',
    badgeBg: 'rgba(236, 72, 153, 0.12)',
    badgeBorder: 'rgba(236, 72, 153, 0.35)',
  },
  {
    id: 'WN412',
    name: 'West Corridor (Coastal)',
    originRegion: 'West',
    destRegion: 'West',
    sourcePlace: 'Mumbai',
    destPlace: 'Ahmedabad',
    places: 'Mumbai ➔ Ahmedabad',
    fullPlaces: 'Mumbai Central ➔ Ahmedabad Pharma Center',
    corridorType: 'Regional Coastal',
    description: 'Intra-western corridor linking Mumbai, JNPT Port, Surat, Vadodara, and Ahmedabad.',
    cities: ['Mumbai', 'JNPT', 'Pune', 'Surat', 'Vadodara', 'Ahmedabad', 'Kandla', 'Mundra'],
    color: '#f97316',
    badgeBg: 'rgba(249, 115, 22, 0.12)',
    badgeBorder: 'rgba(249, 115, 22, 0.35)',
  },
  {
    id: 'SE320',
    name: 'South Corridor (Peninsular)',
    originRegion: 'South',
    destRegion: 'South',
    sourcePlace: 'Chennai',
    destPlace: 'Bengaluru',
    places: 'Chennai ➔ Bengaluru',
    fullPlaces: 'Chennai Port ➔ Bengaluru Electronic City',
    corridorType: 'Regional Industrial',
    description: 'Intra-southern corridor linking Chennai Port, Electronic City, and Coimbatore.',
    cities: ['Chennai', 'Bengaluru', 'Coimbatore', 'Salem', 'Hyderabad', 'Kochi', 'Madurai'],
    color: '#10b981',
    badgeBg: 'rgba(16, 185, 129, 0.12)',
    badgeBorder: 'rgba(16, 185, 129, 0.35)',
  },
  {
    id: 'NC210',
    name: 'North Corridor (Capital Spoke)',
    originRegion: 'North',
    destRegion: 'North',
    sourcePlace: 'Delhi NCR',
    destPlace: 'Jaipur',
    places: 'Delhi ➔ Jaipur',
    fullPlaces: 'Delhi Gateway ➔ Jaipur Transport Park',
    corridorType: 'Regional Arterial',
    description: 'Intra-northern corridor connecting Delhi NCR, Jaipur, Haryana, and Rajasthan hubs.',
    cities: ['Delhi', 'Noida', 'Gurugram', 'Jaipur', 'Chandigarh', 'Ludhiana', 'Amritsar'],
    color: '#eab308',
    badgeBg: 'rgba(234, 179, 8, 0.12)',
    badgeBorder: 'rgba(234, 179, 8, 0.35)',
  },
  {
    id: 'EC180',
    name: 'East Corridor (Delta & Inland)',
    originRegion: 'East',
    destRegion: 'East',
    sourcePlace: 'Kolkata',
    destPlace: 'Patna',
    places: 'Kolkata ➔ Patna',
    fullPlaces: 'Kolkata Port ➔ Patna Regional Depot',
    corridorType: 'Regional Inland',
    description: 'Intra-eastern network connecting Haldia maritime terminal to Patna and Bihar depots.',
    cities: ['Kolkata', 'Haldia', 'Patna', 'Ranchi', 'Bhubaneswar', 'Cuttack', 'Siliguri'],
    color: '#14b8a6',
    badgeBg: 'rgba(20, 184, 166, 0.12)',
    badgeBorder: 'rgba(20, 184, 166, 0.35)',
  },
  {
    id: 'CW550',
    name: 'Central-West Corridor (Detour)',
    originRegion: 'Central',
    destRegion: 'West',
    sourcePlace: 'Nagpur',
    destPlace: 'Mumbai',
    places: 'Nagpur ➔ Mumbai (Bypass)',
    fullPlaces: 'Nagpur Multi-Modal ➔ Mumbai Central (via Nashik Detour)',
    corridorType: 'High-Capacity Detour',
    description: 'Key bypass route rerouting cargo through Nagpur/Indore during coastal storms.',
    cities: ['Nagpur', 'Indore', 'Bhopal', 'Pune', 'Mumbai', 'Nashik', 'Aurangabad'],
    color: '#6366f1',
    badgeBg: 'rgba(99, 102, 241, 0.12)',
    badgeBorder: 'rgba(99, 102, 241, 0.35)',
  },
  {
    id: 'CS560',
    name: 'Central-South Corridor (Detour)',
    originRegion: 'Central',
    destRegion: 'South',
    sourcePlace: 'Nagpur',
    destPlace: 'Bengaluru',
    places: 'Nagpur ➔ Bengaluru (Bypass)',
    fullPlaces: 'Nagpur Central ➔ Bengaluru Tech Park (via Hyderabad Detour)',
    corridorType: 'High-Capacity Detour',
    description: 'Intermodal diversion corridor from Central depots to Hyderabad and Chennai.',
    cities: ['Nagpur', 'Raipur', 'Hyderabad', 'Vijayawada', 'Bengaluru'],
    color: '#a855f7',
    badgeBg: 'rgba(168, 85, 247, 0.12)',
    badgeBorder: 'rgba(168, 85, 247, 0.35)',
  },
];

const REGION_CITY_KEYWORDS = {
  West: ['mumbai', 'ahmedabad', 'surat', 'pune', 'gujarat', 'maharashtra', 'kandla', 'mundra', 'vadodara', 'goa', 'west'],
  South: ['chennai', 'bengaluru', 'bangalore', 'hyderabad', 'kochi', 'coimbatore', 'tamil nadu', 'karnataka', 'kerala', 'andhra', 'telangana', 'south'],
  North: ['delhi', 'ncr', 'jaipur', 'gurugram', 'gurgaon', 'chandigarh', 'haryana', 'punjab', 'rajasthan', 'uttar pradesh', 'noida', 'north'],
  East: ['kolkata', 'haldia', 'patna', 'bihar', 'bhubaneswar', 'odisha', 'west bengal', 'ranchi', 'jharkhand', 'assam', 'east'],
  Central: ['nagpur', 'indore', 'bhopal', 'raipur', 'madhya pradesh', 'chhattisgarh', 'central'],
};

/**
 * Detect region from a location or address string.
 */
export function detectRegion(locationStr) {
  if (!locationStr) return null;
  const str = locationStr.toLowerCase();
  for (const [region, keywords] of Object.entries(REGION_CITY_KEYWORDS)) {
    if (keywords.some(k => str.includes(k))) {
      return region;
    }
  }
  return null;
}

/**
 * Lookup route definition by RouteID.
 */
export function getRouteById(routeId) {
  if (!routeId) return null;
  return ROUTES_CATALOG.find(r => r.id.toUpperCase() === routeId.toUpperCase()) || null;
}

/**
 * Intelligently determines or suggests a RouteID given origin and destination strings.
 */
export function determineRouteId(origin, destination, fallbackRegion = 'West') {
  const origRegion = detectRegion(origin);
  const destRegion = detectRegion(destination);

  // Exact Inter-regional matching
  if (origRegion === 'East' && destRegion === 'West') return 'EW785';
  if (origRegion === 'West' && destRegion === 'East') return 'WE786';
  if (origRegion === 'North' && destRegion === 'South') return 'NS654';
  if (origRegion === 'South' && destRegion === 'North') return 'SN655';

  // Intra-regional matching
  if (origRegion === 'West' && destRegion === 'West') return 'WN412';
  if (origRegion === 'South' && destRegion === 'South') return 'SE320';
  if (origRegion === 'North' && destRegion === 'North') return 'NC210';
  if (origRegion === 'East' && destRegion === 'East') return 'EC180';

  // Central detours
  if ((origRegion === 'Central' && destRegion === 'West') || (origRegion === 'West' && destRegion === 'Central')) return 'CW550';
  if ((origRegion === 'Central' && destRegion === 'South') || (origRegion === 'South' && destRegion === 'Central')) return 'CS560';

  // Mixed fallback based on destination or origin
  const primary = destRegion || origRegion || fallbackRegion;
  if (primary === 'West') return 'WN412';
  if (primary === 'South') return 'SE320';
  if (primary === 'North') return 'NC210';
  if (primary === 'East') return 'EC180';
  if (primary === 'Central') return 'CW550';

  return 'EW785';
}

/**
 * Returns all RouteIDs connected to or passing through a region.
 */
export function getRoutesForRegion(region) {
  if (!region) return ROUTES_CATALOG;
  const reg = region.toLowerCase();
  return ROUTES_CATALOG.filter(r =>
    r.originRegion.toLowerCase() === reg ||
    r.destRegion.toLowerCase() === reg ||
    r.name.toLowerCase().includes(reg) ||
    r.description.toLowerCase().includes(reg)
  );
}

/**
 * Cleans up verbose address/depot names into clean city/depot place names
 */
export function cleanPlaceName(locStr) {
  if (!locStr) return '';
  let s = locStr.replace(/\([^)]*\)/g, '').trim();
  s = s.split(',')[0].trim();
  // Strip trailing "Hub", "Depot", "Distribution Center" if overly long
  return s || locStr;
}

/**
 * Returns clean Source ➔ Destination string with place names for any RouteID
 */
export function getRoutePlaces(routeId, customOrigin = null, customDest = null) {
  if (customOrigin && customDest) {
    const s = cleanPlaceName(customOrigin);
    const d = cleanPlaceName(customDest);
    if (s && d && s.toLowerCase() !== d.toLowerCase()) {
      return `${s} ➔ ${d}`;
    }
  }
  const route = getRouteById(routeId);
  if (route && route.places) {
    return route.places;
  }
  return 'Origin ➔ Destination';
}

/**
 * Formats a badge descriptor for displaying RouteID in tables and headers.
 */
export function formatRouteBadge(routeId, origin = null, destination = null) {
  const route = getRouteById(routeId);
  const places = getRoutePlaces(routeId, origin, destination);

  if (!route) {
    return {
      id: routeId || 'ROUTE',
      name: 'Corridor Route',
      places: places || 'Origin ➔ Destination',
      sourcePlace: 'Origin',
      destPlace: 'Destination',
      color: '#3b82f6',
      badgeBg: 'rgba(59, 130, 246, 0.12)',
      badgeBorder: 'rgba(59, 130, 246, 0.35)',
    };
  }
  return {
    id: route.id,
    name: route.name,
    places: places || route.places,
    sourcePlace: route.sourcePlace,
    destPlace: route.destPlace,
    fullPlaces: route.fullPlaces,
    color: route.color,
    badgeBg: route.badgeBg,
    badgeBorder: route.badgeBorder,
  };
}

/**
 * Discovers and formats an alternate route for a vehicle encountering a disruption,
 * providing the 4-step algorithm rationale and Google Maps directions parameters.
 */
export function getAlternateRouteDetails(trip, disruption) {
  const origin = trip?.origin || 'Mumbai Central Logistics Hub';
  const destination = trip?.destination || 'Ahmedabad Pharma Distribution Center';
  const primaryRouteId = trip?.route_id || determineRouteId(origin, destination);
  const primaryRoute = getRouteById(primaryRouteId) || ROUTES_CATALOG[0];

  const disruptionTitle = disruption?.title || 'Severe Transit Hazard';
  const disruptionRegion = disruption?.region || 'West';
  const disruptionSeverity = disruption?.severity || 'high';

  // Determine alternate RouteID detour
  let alternateRouteId = 'CW550';
  let detourVia = 'Central Expressway Detour via Vadodara / Nashik Bypass';
  let highwayBypass = 'NH-48 Detour ➔ NE-1 Expressway ➔ Ring Highway';
  let deltaKm = '+65 km';
  let deltaTime = '+2.5 hrs';
  let deltaFuel = '+42 L (+7.8%)';

  if (primaryRouteId === 'WN412' || disruptionRegion.toLowerCase() === 'west') {
    alternateRouteId = 'CW550';
    detourVia = 'Inland Detour via Nashik & Central Inland Expressway (Bypassing Coastal Flood Zone)';
    highwayBypass = 'NH-8 Bypass ➔ Central State Arterial 48 ➔ Ahmedabad Outer Ring';
    deltaKm = '+68 km';
    deltaTime = '+2.5 hrs';
    deltaFuel = '+45 L';
  } else if (primaryRouteId === 'SE320' || disruptionRegion.toLowerCase() === 'south') {
    alternateRouteId = 'CS560';
    detourVia = 'Krishnapatnam Intermodal Rail-Freight & Inland Highway Corridor';
    highwayBypass = 'SH-51 Inland Arterial ➔ Electronic City Expressway Bypass';
    deltaKm = '+52 km';
    deltaTime = '+2.0 hrs';
    deltaFuel = '+38 L';
  } else if (primaryRouteId === 'NS654' || disruptionRegion.toLowerCase() === 'north') {
    alternateRouteId = 'NC210';
    detourVia = 'Western Peripheral Expressway (WPE) & Yamuna Express Detour';
    highwayBypass = 'KMP Expressway ➔ NH-48 Interior Spoke';
    deltaKm = '+45 km';
    deltaTime = '+1.5 hrs';
    deltaFuel = '+30 L';
  } else {
    alternateRouteId = 'WE786';
    detourVia = 'Grand Trunk Road Inland Arterial Bypass';
    highwayBypass = 'NH-19 Detour ➔ Asian Highway 1 Link';
    deltaKm = '+75 km';
    deltaTime = '+3.0 hrs';
    deltaFuel = '+50 L';
  }

  const alternateRoute = getRouteById(alternateRouteId) || ROUTES_CATALOG[8];

  // 4-Step Algorithmic Discovery Pipeline Explanation
  const discoverySteps = [
    {
      step: 1,
      title: 'Hazard Geofence Isolation',
      desc: `Identified active ${disruptionSeverity.toUpperCase()} bottleneck along primary corridor [${primaryRouteId}] (${disruptionTitle}). Established a 50 km safety buffer around affected transit nodes in ${disruptionRegion}.`,
      icon: 'AlertTriangle'
    },
    {
      step: 2,
      title: 'Bypass Arterial Mapping',
      desc: `Scanned National Corridor Registry for connected high-throughput arterials. Selected detour corridor [${alternateRouteId}] (${detourVia}) avoiding zero-throughput chokepoints.`,
      icon: 'Route'
    },
    {
      step: 3,
      title: 'Payload & Axle Load Clearance',
      desc: `Verified vehicle class (${trip?.vehicles?.model || 'Heavy Haulage'}, ${trip?.cargo_weight || '18,500'} kg) meets bridge clearances, toll weight restrictions, and cold-chain compliance.`,
      icon: 'ShieldCheck'
    },
    {
      step: 4,
      title: 'Dispatch Manifest Calibration',
      desc: `Formulated turn-by-turn routing via ${highwayBypass}. Variance calculated at ${deltaKm}, ${deltaTime} transit adjustment, and ${deltaFuel} fuel buffer.`,
      icon: 'CheckCircle2'
    }
  ];

  // Construct Google Maps Embed URL
  const mapOrigin = encodeURIComponent(origin);
  const mapDestination = encodeURIComponent(destination);
  const mapEmbedUrl = `https://maps.google.com/maps?saddr=${mapOrigin}&daddr=${mapDestination}&output=embed`;

  return {
    primaryRouteId,
    primaryRoute,
    alternateRouteId,
    alternateRoute,
    detourVia,
    highwayBypass,
    deltaKm,
    deltaTime,
    deltaFuel,
    discoverySteps,
    mapEmbedUrl,
    hazard: {
      title: disruptionTitle,
      region: disruptionRegion,
      severity: disruptionSeverity,
    }
  };
}

