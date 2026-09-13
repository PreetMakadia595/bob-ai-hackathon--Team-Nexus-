import { AlertCircle } from 'lucide-react';

export default function ErrorState({ message, onRetry }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '60px 20px' }}>
      <div style={{
        width: '52px', height: '52px', borderRadius: '50%',
        background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <AlertCircle size={26} color="#ef4444" />
      </div>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>Something went wrong</p>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{message || 'Failed to load data.'}</p>
      </div>
      {onRetry && (
        <button className="btn btn-secondary btn-sm" onClick={onRetry}>Try Again</button>
      )}
    </div>
  );
}
