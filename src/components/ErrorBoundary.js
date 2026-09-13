'use client';
import { Component } from 'react';
import { AlertOctagon, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[FleetFlow ErrorBoundary]', error, info);
  }

  handleReset() {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        minHeight: '60vh', padding: '40px', textAlign: 'center',
      }}>
        <div style={{
          width: '72px', height: '72px', borderRadius: '20px',
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px',
        }}>
          <AlertOctagon size={36} color="#ef4444" />
        </div>
        <h2 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '8px' }}>Something went wrong</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', maxWidth: '400px', marginBottom: '24px', lineHeight: '1.6' }}>
          An unexpected error occurred in this section. Our team has been notified. Try refreshing the page.
        </p>
        {this.state.error && (
          <details style={{
            background: 'var(--bg-elevated)', border: '1px solid var(--border-default)',
            borderRadius: '8px', padding: '12px 16px', marginBottom: '20px',
            maxWidth: '500px', width: '100%', textAlign: 'left',
          }}>
            <summary style={{ fontSize: '12px', color: 'var(--text-muted)', cursor: 'pointer' }}>Error details</summary>
            <pre style={{ fontSize: '11px', color: '#ef4444', marginTop: '8px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {this.state.error.message}
            </pre>
          </details>
        )}
        <button
          className="btn btn-primary"
          onClick={() => this.handleReset()}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <RefreshCw size={14} /> Reload Page
        </button>
      </div>
    );
  }
}
