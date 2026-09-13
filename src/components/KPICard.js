export default function KPICard({ title, value, subtitle, icon: Icon, color = '#3b82f6', trend }) {
  const trendUp = trend > 0;
  const trendDown = trend < 0;

  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border-default)',
      borderRadius: '16px',
      padding: '20px',
      position: 'relative',
      overflow: 'hidden',
      transition: 'transform 0.15s ease, box-shadow 0.15s ease',
      cursor: 'default',
    }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = `0 8px 24px rgba(0,0,0,0.2)`;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* Background glow */}
      <div style={{
        position: 'absolute',
        top: '-20px',
        right: '-20px',
        width: '100px',
        height: '100px',
        borderRadius: '50%',
        background: `radial-gradient(circle, ${color}18 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{
          width: '44px',
          height: '44px',
          borderRadius: '12px',
          background: `${color}18`,
          border: `1px solid ${color}30`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {Icon && <Icon size={22} color={color} />}
        </div>

        {trend !== undefined && trend !== null && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '3px',
            fontSize: '12px',
            fontWeight: '600',
            color: trendUp ? '#22c55e' : trendDown ? '#ef4444' : 'var(--text-muted)',
            background: trendUp ? 'rgba(34,197,94,0.1)' : trendDown ? 'rgba(239,68,68,0.1)' : 'var(--bg-elevated)',
            padding: '4px 8px',
            borderRadius: '20px',
          }}>
            {trendUp ? '↑' : trendDown ? '↓' : '—'} {Math.abs(trend)}%
          </div>
        )}
      </div>

      {/* Value */}
      <div style={{ fontSize: '32px', fontWeight: '800', color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1, marginBottom: '6px' }}>
        {value ?? '—'}
      </div>

      {/* Title */}
      <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>
        {title}
      </div>

      {/* Subtitle */}
      {subtitle && (
        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{subtitle}</div>
      )}
    </div>
  );
}
