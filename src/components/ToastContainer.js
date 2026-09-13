'use client';
import { useToastState } from '@/lib/toast-context';
import { X, CheckCircle2, AlertCircle, AlertTriangle, Info } from 'lucide-react';

const ICONS = {
  success: CheckCircle2,
  error:   AlertCircle,
  warning: AlertTriangle,
  info:    Info,
};

const COLORS = {
  success: { bg: 'rgba(34,197,94,0.12)',  border: 'rgba(34,197,94,0.3)',  icon: '#22c55e' },
  error:   { bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.3)',  icon: '#ef4444' },
  warning: { bg: 'rgba(234,179,8,0.12)',  border: 'rgba(234,179,8,0.3)',  icon: '#eab308' },
  info:    { bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.3)', icon: '#3b82f6' },
};

export default function ToastContainer() {
  const { toasts, removeToast } = useToastState();

  if (!toasts.length) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      maxWidth: '380px',
      width: '100%',
    }}>
      {toasts.map(t => {
        const Icon = ICONS[t.type] ?? Info;
        const c = COLORS[t.type] ?? COLORS.info;
        return (
          <div key={t.id} style={{
            background: 'var(--bg-surface)',
            border: `1px solid ${c.border}`,
            borderLeft: `3px solid ${c.icon}`,
            borderRadius: '10px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            animation: 'slideInRight 0.25s ease forwards',
            backdropFilter: 'blur(8px)',
          }}>
            <Icon size={16} color={c.icon} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span style={{ fontSize: '13px', color: 'var(--text-primary)', flex: 1, lineHeight: '1.5' }}>{t.message}</span>
            <button
              onClick={() => removeToast(t.id)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0', flexShrink: 0, display: 'flex' }}
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
