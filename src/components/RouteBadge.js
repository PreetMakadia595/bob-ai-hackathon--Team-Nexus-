import { formatRouteBadge } from '@/lib/routes';
import { Route } from 'lucide-react';

export default function RouteBadge({
  routeId,
  origin = null,
  destination = null,
  showPlaces = true,
  showName = false,
  style = {}
}) {
  if (!routeId) return <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>—</span>;

  const badge = formatRouteBadge(routeId, origin, destination);

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        padding: '2.5px 8px',
        borderRadius: '6px',
        fontSize: '11px',
        fontWeight: '700',
        letterSpacing: '0.02em',
        background: badge.badgeBg,
        color: badge.color,
        border: `1px solid ${badge.badgeBorder}`,
        whiteSpace: 'nowrap',
        ...style,
      }}
      title={`${badge.id}: ${badge.places} (${badge.name})`}
    >
      <Route size={11} style={{ flexShrink: 0 }} />
      <span style={{ fontFamily: 'monospace', fontWeight: '800' }}>{badge.id}</span>
      {showPlaces && badge.places && (
        <span
          style={{
            fontWeight: '600',
            fontFamily: 'inherit',
            fontSize: '10.5px',
            opacity: 0.95,
            paddingLeft: '4px',
            borderLeft: `1px solid ${badge.badgeBorder}`,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '3px',
          }}
        >
          {badge.places}
        </span>
      )}
      {showName && (
        <span style={{ fontWeight: '500', fontFamily: 'inherit', color: 'var(--text-secondary)', marginLeft: '2px' }}>
          · {badge.name}
        </span>
      )}
    </span>
  );
}
