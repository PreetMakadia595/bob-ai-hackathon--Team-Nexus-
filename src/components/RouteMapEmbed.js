'use client';
import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import RouteBadge from './RouteBadge';
import {
  Maximize2, Minimize2, Navigation, AlertTriangle,
  ExternalLink, ShieldCheck, Clock, Fuel, MapPin,
  Truck, Radio, Map as MapIcon, Activity, X
} from 'lucide-react';

// Geographic Coordinates for major regional logistics hubs across India
const CITY_COORDS = {
  mumbai: { lat: 18.922, lng: 72.834, name: 'Mumbai Central Logistics Hub, Maharashtra' },
  ahmedabad: { lat: 23.022, lng: 72.571, name: 'Ahmedabad Pharma Distribution Center, Gujarat' },
  surat: { lat: 21.170, lng: 72.831, name: 'Surat Cargo Transit Corridor, Gujarat' },
  vadodara: { lat: 22.307, lng: 73.181, name: 'Vadodara Express Interchange, Gujarat' },
  pune: { lat: 18.520, lng: 73.856, name: 'Pune Bio-Tech Logistics Hub, Maharashtra' },
  nashik: { lat: 19.997, lng: 73.789, name: 'Nashik Inland Detour Bypass, Maharashtra' },
  delhi: { lat: 28.613, lng: 77.209, name: 'Delhi Gateway Cargo Hub, Delhi NCR' },
  gurugram: { lat: 28.459, lng: 77.026, name: 'Gurugram Warehousing Depot, Haryana' },
  jaipur: { lat: 26.912, lng: 75.787, name: 'Jaipur Integrated Transport Park, Rajasthan' },
  chennai: { lat: 13.082, lng: 80.270, name: 'Chennai Port Maritime Terminal, Tamil Nadu' },
  bengaluru: { lat: 12.971, lng: 77.594, name: 'Bengaluru Tech Logistics Hub, Karnataka' },
  hyderabad: { lat: 17.385, lng: 78.486, name: 'Hyderabad Genome Valley Depot, Telangana' },
  kolkata: { lat: 22.572, lng: 88.363, name: 'Kolkata Haldia Marine Port, West Bengal' },
  haldia: { lat: 22.066, lng: 88.069, name: 'Haldia Deepwater Port, West Bengal' },
  patna: { lat: 25.594, lng: 85.137, name: 'Patna Regional Logistics Park, Bihar' },
  nagpur: { lat: 21.145, lng: 79.088, name: 'Nagpur Multi-Modal Cargo Hub, Maharashtra' },
  indore: { lat: 22.719, lng: 75.857, name: 'Indore Inland Freight Depot, Madhya Pradesh' },
  bhopal: { lat: 23.259, lng: 77.412, name: 'Bhopal Transport Hub, Madhya Pradesh' },
  kandla: { lat: 23.011, lng: 70.218, name: 'Kandla Heavy Machinery Dock, Gujarat' },
  coimbatore: { lat: 11.016, lng: 76.955, name: 'Coimbatore Textile Engineering Complex, Tamil Nadu' },
  kochi: { lat: 9.931, lng: 76.267, name: 'Kochi Port Maritime Terminal, Kerala' },
  chandigarh: { lat: 30.733, lng: 76.779, name: 'Chandigarh Northern Hub, Punjab' },
  ranchi: { lat: 23.344, lng: 85.309, name: 'Ranchi Regional Depot, Jharkhand' },
  raipur: { lat: 21.251, lng: 81.629, name: 'Raipur Cargo Yard, Chhattisgarh' }
};

// Normalize regional placeholder names into precise Indian logistics cities
function normalizeLocation(locStr, fallback = 'mumbai') {
  if (!locStr) return CITY_COORDS[fallback];
  const s = locStr.toLowerCase().trim();
  if (s === 'west') return CITY_COORDS.mumbai;
  if (s === 'south') return CITY_COORDS.chennai;
  if (s === 'north') return CITY_COORDS.delhi;
  if (s === 'east') return CITY_COORDS.kolkata;
  if (s === 'central') return CITY_COORDS.nagpur;

  for (const [k, v] of Object.entries(CITY_COORDS)) {
    if (s.includes(k) || k.includes(s)) return v;
  }
  return CITY_COORDS[fallback] || CITY_COORDS.mumbai;
}

// Resolves clean origin, destination, and intermediate detour waypoint
function resolveRouteEndpoints(origin, destination, routeId, detourVia) {
  let s = (origin || '').trim();
  let d = (destination || '').trim();
  const rId = (routeId || 'WN412').toUpperCase();

  if (s.toLowerCase() === 'west' && d.toLowerCase() === 'west') {
    s = 'Mumbai Central Logistics Hub, Maharashtra';
    d = 'Ahmedabad Pharma Distribution Center, Gujarat';
  } else if (s.toLowerCase() === 'south' && d.toLowerCase() === 'south') {
    s = 'Chennai Port Maritime Terminal, Tamil Nadu';
    d = 'Bengaluru Electronic City Tech Park, Karnataka';
  } else if (s.toLowerCase() === 'north' && d.toLowerCase() === 'north') {
    s = 'Delhi Gateway Cargo Hub, Delhi NCR';
    d = 'Jaipur Integrated Transport Park, Rajasthan';
  } else if (s.toLowerCase() === 'east' && d.toLowerCase() === 'east') {
    s = 'Kolkata Haldia Marine Port, West Bengal';
    d = 'Patna Regional Logistics Park, Bihar';
  } else if (s.toLowerCase() === 'central' || d.toLowerCase() === 'central') {
    if (s.toLowerCase() === 'central') s = 'Nagpur Multi-Modal Cargo Hub, Maharashtra';
    if (d.toLowerCase() === 'central') d = 'Indore Inland Freight Depot, Madhya Pradesh';
  } else {
    s = s.replace(/\([^)]*\)/g, '').trim();
    d = d.replace(/\([^)]*\)/g, '').trim();
    if (!s) s = 'Mumbai Central, Maharashtra';
    if (!d) d = 'Ahmedabad, Gujarat';
  }

  // Derive intermediate detour waypoint
  let waypoint = '';
  const dLower = (detourVia || '').toLowerCase();
  if (dLower.includes('nashik')) {
    waypoint = 'Nashik, Maharashtra';
  } else if (dLower.includes('vadodara') || dLower.includes('surat')) {
    waypoint = 'Vadodara, Gujarat';
  } else if (dLower.includes('indore') || dLower.includes('nagpur')) {
    waypoint = 'Indore, Madhya Pradesh';
  } else if (dLower.includes('jaipur')) {
    waypoint = 'Jaipur, Rajasthan';
  } else if (dLower.includes('tirupati') || dLower.includes('kolar')) {
    waypoint = 'Kolar, Karnataka';
  }

  if (!waypoint && (rId.includes('WN') || rId.includes('CW'))) {
    waypoint = 'Nashik, Maharashtra';
  } else if (!waypoint && (rId.includes('NS') || rId.includes('SN'))) {
    waypoint = 'Indore, Madhya Pradesh';
  } else if (!waypoint && (rId.includes('SE') || rId.includes('CS'))) {
    waypoint = 'Kolar, Karnataka';
  }

  return { originClean: s, destClean: d, waypoint };
}

export default function RouteMapEmbed({
  origin = 'Mumbai Central Logistics Hub',
  destination = 'Ahmedabad Pharma Distribution Center',
  routeId = 'WN412',
  alternateRouteId = 'CW550',
  vehicle = null,
  driver = null,
  disruption = null,
  deltaKm = '+68 km',
  deltaTime = '+2.5 hrs',
  deltaFuel = '+45 L',
  detourVia = 'Central Inland Expressway Detour',
  height = '480px',
}) {
  const [routeMode, setRouteMode] = useState('alternate'); // 'alternate' | 'primary'
  const [mapEngine, setMapEngine] = useState('google'); // 'google' | 'radar'
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [iframeLoading, setIframeLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Enter Fullscreen handler (syncs state and triggers HTML5 Fullscreen if supported)
  const enterFullscreen = async () => {
    setIsFullscreen(true);
    try {
      if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      // Graceful fallback; portal overlay guarantees full viewport coverage
    }
  };

  // Exit Fullscreen handler
  const exitFullscreen = async () => {
    setIsFullscreen(false);
    try {
      if (document.fullscreenElement && document.exitFullscreen) {
        await document.exitFullscreen();
      }
    } catch {
      // Graceful exit
    }
  };

  // Synchronize ESC key & browser-level fullscreen changes
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isFullscreen) {
        exitFullscreen();
      }
    };
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, [isFullscreen]);

  // Lock body scroll when in fullscreen
  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isFullscreen]);

  // Normalize endpoints & detour waypoints
  const { originClean, destClean, waypoint } = useMemo(() => {
    return resolveRouteEndpoints(origin, destination, routeId, detourVia);
  }, [origin, destination, routeId, detourVia]);

  // Build the live Google Maps directions URL with highlighted route polyline
  const googleMapsDirectionsEmbedUrl = useMemo(() => {
    const saddr = encodeURIComponent(originClean);
    let daddr = '';

    if (routeMode === 'alternate' && waypoint) {
      daddr = `${encodeURIComponent(waypoint)}+to:${encodeURIComponent(destClean)}`;
    } else {
      daddr = encodeURIComponent(destClean);
    }

    return `https://maps.google.com/maps?saddr=${saddr}&daddr=${daddr}&output=embed&z=8`;
  }, [originClean, destClean, waypoint, routeMode]);

  // External turn-by-turn Google Maps link
  const externalGoogleMapsUrl = useMemo(() => {
    if (routeMode === 'alternate' && waypoint) {
      return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(originClean)}&destination=${encodeURIComponent(destClean)}&waypoints=${encodeURIComponent(waypoint)}`;
    }
    return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(originClean)}&destination=${encodeURIComponent(destClean)}`;
  }, [originClean, destClean, waypoint, routeMode]);

  // Reset loading spinner on route switch
  useEffect(() => {
    setIframeLoading(true);
    const timer = setTimeout(() => setIframeLoading(false), 800);
    return () => clearTimeout(timer);
  }, [googleMapsDirectionsEmbedUrl]);

  // Dedicated 3-Part Command Center Layout (Header, Map Canvas, Footer)
  const renderMapApp = (isFs = false) => {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          background: '#070b13',
          borderRadius: isFs ? '0px' : '12px',
          boxSizing: 'border-box',
        }}
      >
        {/* ── 1. UPSIDE COMMAND & BUTTON BAR (ALWAYS VISIBLE & PINNED AT TOP) ── */}
        <header
          style={{
            flexShrink: 0,
            width: '100%',
            background: 'rgba(11, 17, 33, 0.98)',
            backdropFilter: 'blur(20px)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.14)',
            padding: isFs ? '12px 20px' : '10px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            zIndex: 50,
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
          }}
        >
          {/* Left: Route and Vehicle Info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <RouteBadge routeId={routeId} origin={originClean} destination={destClean} />
              <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>➔</span>
              <RouteBadge
                routeId={alternateRouteId}
                showName={false}
                style={{ background: 'rgba(34,197,94,0.18)', borderColor: 'rgba(34,197,94,0.45)', color: '#22c55e' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: isFs ? '14px' : '12px' }}>
              {vehicle && (
                <span style={{ fontWeight: '700', color: '#fff', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Truck size={15} color="#38bdf8" />
                  {vehicle.model} (<code>{vehicle.license_plate}</code>)
                </span>
              )}
              {driver && (
                <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                  · Driver: <strong style={{ color: '#e2e8f0' }}>{driver.name}</strong>
                </span>
              )}
            </div>

            {isFs && (
              <span style={{
                fontSize: '11px',
                fontWeight: '700',
                color: '#22c55e',
                background: 'rgba(34,197,94,0.15)',
                border: '1px solid rgba(34,197,94,0.3)',
                padding: '2px 8px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e' }} />
                Mission Control Fullscreen View
              </span>
            )}
          </div>

          {/* Right: Route Switcher, Engine Selector & Fullscreen Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {/* Route Mode Switcher */}
            <div style={{
              display: 'inline-flex',
              background: 'rgba(0,0,0,0.5)',
              padding: '2px',
              borderRadius: '7px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              fontSize: '11px'
            }}>
              <button
                type="button"
                onClick={() => setRouteMode('alternate')}
                style={{
                  padding: '5px 10px',
                  borderRadius: '5px',
                  background: routeMode === 'alternate' ? '#22c55e' : 'transparent',
                  color: routeMode === 'alternate' ? '#090d16' : 'var(--text-secondary)',
                  fontWeight: routeMode === 'alternate' ? '800' : '600',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  transition: 'all 0.2s'
                }}
                title="Show AI Recommended Detour Line on Google Map"
              >
                <ShieldCheck size={12} /> AI Detour Bypass
              </button>

              <button
                type="button"
                onClick={() => setRouteMode('primary')}
                style={{
                  padding: '5px 10px',
                  borderRadius: '5px',
                  background: routeMode === 'primary' ? '#ef4444' : 'transparent',
                  color: routeMode === 'primary' ? '#fff' : 'var(--text-secondary)',
                  fontWeight: routeMode === 'primary' ? '800' : '600',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  transition: 'all 0.2s'
                }}
                title="Show Direct Corridor Line on Google Map"
              >
                <AlertTriangle size={12} /> Hazard Corridor
              </button>
            </div>

            {/* Map Engine Toggle */}
            <button
              type="button"
              onClick={() => setMapEngine(e => (e === 'google' ? 'radar' : 'google'))}
              className="btn btn-sm"
              style={{
                fontSize: '11px', padding: '5px 9px', display: 'flex', alignItems: 'center', gap: '5px',
                background: mapEngine === 'google' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                color: mapEngine === 'google' ? '#38bdf8' : '#a5b4fc',
                border: `1px solid ${mapEngine === 'google' ? 'rgba(56, 189, 248, 0.35)' : 'rgba(99, 102, 241, 0.35)'}`,
                fontWeight: '700'
              }}
              title={mapEngine === 'google' ? 'Switch to High-Speed AI Radar HUD' : 'Switch to Live Google Map with Nearby Places'}
            >
              {mapEngine === 'google' ? <MapIcon size={12} /> : <Activity size={12} />}
              {mapEngine === 'google' ? 'Google Map Active' : 'AI Radar Active'}
            </button>

            {/* External Google Maps Button */}
            <a
              href={externalGoogleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-sm"
              style={{
                fontSize: '11px', padding: '5px 9px', display: 'flex', alignItems: 'center', gap: '4px',
                background: 'rgba(255, 255, 255, 0.08)', color: '#e2e8f0', border: '1px solid rgba(255, 255, 255, 0.15)',
                fontWeight: '600'
              }}
              title="Open turn-by-turn route directly in Google Maps application"
            >
              <ExternalLink size={12} /> Google Maps
            </a>

            {/* Fullscreen Mode Button */}
            {isFs ? (
              <button
                type="button"
                className="btn btn-sm"
                onClick={exitFullscreen}
                style={{
                  fontSize: '12px', padding: '6px 14px', display: 'flex', alignItems: 'center', gap: '6px',
                  background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: '#ffffff',
                  border: '1px solid #f87171', fontWeight: '800', borderRadius: '7px',
                  boxShadow: '0 2px 10px rgba(239, 68, 68, 0.4)', cursor: 'pointer'
                }}
                title="Exit Fullscreen Command Center (or press Escape)"
              >
                <X size={14} /> Exit Fullscreen (ESC)
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={enterFullscreen}
                style={{ fontSize: '11px', padding: '5px 9px', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: '700' }}
                title="Enter Fullscreen Command Center View"
              >
                <Maximize2 size={12} /> Full Screen
              </button>
            )}
          </div>
        </header>

        {/* ── 2. MAP CANVAS (FILLS 100% REMAINING SPACE, ZERO CLIPPING) ─────── */}
        <main
          style={{
            flex: 1,
            minHeight: 0,
            width: '100%',
            position: 'relative',
            overflow: 'hidden',
            background: '#070b13',
          }}
        >
          {/* Embedded Google Map */}
          {mapEngine === 'google' && (
            <div style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
              {iframeLoading && (
                <div style={{
                  position: 'absolute', inset: 0, zIndex: 10,
                  background: '#070b13', display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: '10px'
                }}>
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '50%',
                    border: '3px solid rgba(56, 189, 248, 0.2)', borderTopColor: '#38bdf8',
                    animation: 'spin 0.8s linear infinite'
                  }} />
                  <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600' }}>
                    Connecting to Google Maps live navigation stream...
                  </span>
                </div>
              )}

              <iframe
                title={`Live Google Map Route: ${originClean} to ${destClean}`}
                src={googleMapsDirectionsEmbedUrl}
                width="100%"
                height="100%"
                style={{
                  border: 'none',
                  filter: 'invert(90%) hue-rotate(180deg) contrast(95%) saturate(85%)',
                }}
                loading="eager"
                onLoad={() => setIframeLoading(false)}
              />
            </div>
          )}

          {/* AI Vector Radar View */}
          {mapEngine === 'radar' && (
            <div style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', background: '#070b13' }}>
              <svg width="100%" height="100%">
                <defs>
                  <pattern id="radar-grid" width="30" height="30" patternUnits="userSpaceOnUse">
                    <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="#070b13" />
                <rect width="100%" height="100%" fill="url(#radar-grid)" />

                {/* Glowing Detour Line */}
                <path
                  d="M 120 380 Q 280 260, 480 200 T 800 80"
                  fill="none"
                  stroke="#22c55e"
                  strokeWidth="6"
                  strokeDasharray="10 5"
                  style={{ filter: 'drop-shadow(0 0 8px #22c55e)' }}
                />

                {/* Blocked Hazard Line */}
                <path
                  d="M 120 380 Q 320 340, 520 280 T 800 80"
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="4"
                  strokeDasharray="8 6"
                  strokeOpacity="0.7"
                />

                {/* Waypoints */}
                <circle cx="120" cy="380" r="8" fill="#38bdf8" stroke="#fff" strokeWidth="2" />
                <text x="120" y="405" fill="#38bdf8" fontSize="11px" fontWeight="800" textAnchor="middle">
                  {originClean.split(',')[0]} (Origin)
                </text>

                <circle cx="480" cy="200" r="6" fill="#22c55e" stroke="#fff" strokeWidth="2" />
                <text x="480" y="185" fill="#4ade80" fontSize="10px" fontWeight="700" textAnchor="middle">
                  {waypoint ? waypoint.split(',')[0] : 'Inland Bypass'}
                </text>

                <circle cx="520" cy="280" r="8" fill="#ef4444" stroke="#fff" strokeWidth="2" />
                <text x="520" y="305" fill="#f87171" fontSize="10px" fontWeight="700" textAnchor="middle">
                  ⚠️ Corridor Blockage Zone
                </text>

                <circle cx="800" cy="80" r="8" fill="#4ade80" stroke="#fff" strokeWidth="2" />
                <text x="800" y="65" fill="#4ade80" fontSize="11px" fontWeight="800" textAnchor="middle">
                  {destClean.split(',')[0]} (Destination)
                </text>
              </svg>
            </div>
          )}
        </main>

        {/* ── 3. DOWNSIDE TELEMETRY INFO BAR (ALWAYS VISIBLE & PINNED AT BOTTOM) ── */}
        <footer
          style={{
            flexShrink: 0,
            width: '100%',
            background: 'rgba(11, 17, 33, 0.98)',
            backdropFilter: 'blur(20px)',
            borderTop: '1px solid rgba(255, 255, 255, 0.14)',
            padding: isFs ? '12px 20px' : '10px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            fontSize: isFs ? '13px' : '12px',
            zIndex: 50,
            boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.5)',
          }}
        >
          {/* Origin & Destination Display */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <MapPin size={15} color="#38bdf8" />
            <span style={{ fontWeight: '700', color: '#fff' }}>{originClean}</span>
            <span style={{ color: 'var(--text-muted)' }}>➔</span>
            <span style={{ fontWeight: '700', color: '#4ade80' }}>{destClean}</span>

            {routeMode === 'alternate' && waypoint && (
              <span style={{
                background: 'rgba(34,197,94,0.18)', color: '#4ade80',
                padding: '2px 8px', borderRadius: '5px', fontSize: '11px', fontWeight: '700',
                border: '1px solid rgba(34,197,94,0.35)'
              }}>
                Via Detour: {waypoint}
              </span>
            )}
          </div>

          {/* Live Variance Metrics */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#fb923c' }}>
              <Clock size={14} />
              <span>Time Delta: <strong>{deltaTime}</strong></span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#facc15' }}>
              <Navigation size={14} />
              <span>Distance: <strong>{deltaKm}</strong></span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#c084fc' }}>
              <Fuel size={14} />
              <span>Fuel Impact: <strong>{deltaFuel}</strong></span>
            </div>

            <div style={{
              display: 'flex', alignItems: 'center', gap: '5px', color: '#22c55e',
              fontSize: '11px', background: 'rgba(34,197,94,0.15)', padding: '3px 9px',
              borderRadius: '6px', border: '1px solid rgba(34,197,94,0.35)'
            }}>
              <Radio size={13} className="animate-pulse" />
              <span style={{ fontWeight: '700' }}>Live Telemetry Active</span>
            </div>
          </div>
        </footer>
      </div>
    );
  };

  return (
    <>
      {/* Inline Map View (inside dashboard card) */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height,
          borderRadius: '12px',
          overflow: 'hidden',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          background: '#0a0f1d',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }}
      >
        {isFullscreen ? (
          <div style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            background: 'radial-gradient(ellipse at center, rgba(56,189,248,0.1) 0%, #070b13 70%)',
            padding: '24px',
            textAlign: 'center'
          }}>
            <div style={{
              width: '48px', height: '48px', borderRadius: '50%',
              background: 'rgba(56,189,248,0.15)', border: '1px solid rgba(56,189,248,0.35)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38bdf8'
            }}>
              <Maximize2 size={24} />
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#f1f5f9' }}>
                Map Expanded in Fullscreen Command Center
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Press ESC or click below to restore inline view
              </div>
            </div>
            <button
              type="button"
              onClick={exitFullscreen}
              className="btn btn-sm btn-secondary"
              style={{ fontSize: '12px', padding: '6px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Minimize2 size={13} /> Return to Inline View
            </button>
          </div>
        ) : (
          renderMapApp(false)
        )}
      </div>

      {/* True Viewport Fullscreen Command Center Overlay (via React Portal) */}
      {mounted && isFullscreen && createPortal(
        <div
          style={{
            position: 'fixed',
            inset: 0,
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100%',
            height: '100%',
            height: '100dvh',
            zIndex: 9999999,
            margin: 0,
            padding: 0,
            background: '#070b13',
            boxSizing: 'border-box',
          }}
        >
          {renderMapApp(true)}
        </div>,
        document.body
      )}
    </>
  );
}
