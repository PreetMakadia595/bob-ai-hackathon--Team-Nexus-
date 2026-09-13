'use client';

const ICONS = {
  vehicles:    '🚛',
  drivers:     '👥',
  trips:       '🗺️',
  maintenance: '🔧',
  fuel:        '⛽',
  analytics:   '📊',
  default:     '📭',
};

export default function EmptyState({ type = 'default', title, description, action }) {
  const icon = ICONS[type] ?? ICONS.default;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '60px 24px', textAlign: 'center',
    }}>
      <div style={{
        fontSize: '56px', marginBottom: '20px',
        filter: 'grayscale(20%)',
        animation: 'float 3s ease-in-out infinite',
      }}>
        {icon}
      </div>
      <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px', color: 'var(--text-primary)' }}>
        {title ?? 'Nothing here yet'}
      </h3>
      <p style={{ fontSize: '14px', color: 'var(--text-muted)', maxWidth: '300px', lineHeight: '1.6', marginBottom: action ? '24px' : 0 }}>
        {description ?? 'Add your first record to get started.'}
      </p>
      {action && (
        <button className="btn btn-primary btn-sm" onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  );
}
