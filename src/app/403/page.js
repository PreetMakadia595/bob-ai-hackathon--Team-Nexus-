'use client';
import Link from 'next/link';
import { ShieldOff } from 'lucide-react';

export default function UnauthorizedPage() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '80vh', padding: '40px', textAlign: 'center',
    }}>
      <div style={{
        width: '80px', height: '80px', borderRadius: '24px',
        background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px',
      }}>
        <ShieldOff size={40} color="#ef4444" />
      </div>
      <h1 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '8px' }}>Access Denied</h1>
      <p style={{ color: '#ef4444', fontSize: '14px', fontWeight: '600', marginBottom: '12px', letterSpacing: '0.05em' }}>
        403 — UNAUTHORIZED
      </p>
      <p style={{ color: 'var(--text-muted)', fontSize: '14px', maxWidth: '380px', lineHeight: '1.6', marginBottom: '28px' }}>
        Your role doesn't have permission to access this section.
        Contact your Fleet Manager to request access.
      </p>
      <Link href="/" className="btn btn-primary">← Back to Dashboard</Link>
    </div>
  );
}
