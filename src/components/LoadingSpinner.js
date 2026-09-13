export default function LoadingSpinner({ message = 'Loading...' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '14px', padding: '60px 20px' }}>
      <div className="spinner" style={{ width: '36px', height: '36px', borderWidth: '3px' }} />
      <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>{message}</span>
    </div>
  );
}
