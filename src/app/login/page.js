'use client';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [forgotMode, setForgotMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const isConfigured = isSupabaseConfigured();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    if (!isSupabaseConfigured()) {
      setError('Supabase is not configured. Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local and restart the dev server.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (!error) {
        window.location.href = '/';
        return;
      }

      // If Supabase Auth returned an error (e.g. user was registered via resilient fallback or email provider is disabled):
      if (typeof window !== 'undefined') {
        try {
          const registered = JSON.parse(localStorage.getItem('supplyshield_registered_users') || '[]');
          const matched = registered.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
          if (matched) {
            if (matched.password === password) {
              const userSession = {
                id: matched.id,
                email: matched.email,
                user_metadata: {
                  full_name: matched.fullName || matched.email.split('@')[0],
                  role: matched.role || 'manager',
                },
                role: matched.role || 'manager',
                created_at: new Date().toISOString(),
              };
              localStorage.setItem('supplyshield_user_session', JSON.stringify(userSession));
              window.location.href = '/';
              return;
            } else {
              throw new Error('Invalid password for this account. Please verify your credentials.');
            }
          }
        } catch (regErr) {
          if (regErr.message?.includes('Invalid')) throw regErr;
        }
      }

      // Check if error is Supabase provider disabled
      if (error.message?.toLowerCase().includes('disabled')) {
        setError('Supabase Email provider is currently disabled. You can still log in with demo accounts or accounts registered on this browser.');
        setLoading(false);
        return;
      }

      throw error;
    } catch (err) {
      if (err.name === 'TypeError' || err.message?.toLowerCase().includes('failed to fetch')) {
        setError('Cannot connect to Supabase. Please verify your NEXT_PUBLIC_SUPABASE_URL in .env.local and internet connection.');
      } else {
        setError(err.message || 'Login failed. Please try again.');
      }
      setLoading(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setError('');

    if (!isSupabaseConfigured()) {
      setError('Supabase is not configured. Please add your credentials to .env.local.');
      return;
    }

    setLoading(true);
    try {
      // Always show success — never reveal whether an email is registered (prevents enumeration)
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      setResetSent(true);
    } catch (err) {
      if (err.name === 'TypeError' || err.message?.toLowerCase().includes('failed to fetch')) {
        setError('Cannot connect to Supabase. Please verify your NEXT_PUBLIC_SUPABASE_URL in .env.local.');
      } else {
        setError(err.message || 'Password reset request failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  const goToForgot = () => { setForgotMode(true); setError(''); setResetSent(false); };
  const goToLogin  = () => { setForgotMode(false); setError(''); setResetSent(false); };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background decoration */}
      <div style={{
        position: 'absolute',
        top: '-200px',
        left: '-200px',
        width: '600px',
        height: '600px',
        background: 'radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute',
        bottom: '-200px',
        right: '-200px',
        width: '600px',
        height: '600px',
        background: 'radial-gradient(circle, rgba(6,182,212,0.06) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div className="animate-fade-in" style={{ width: '100%', maxWidth: '420px' }}>
        {/* Logo & Brand */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            overflow: 'hidden',
          }}>
            <Image src="/logo.svg" alt="SupplyShield" width={64} height={64} priority />
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: '800', letterSpacing: '-0.02em' }}>
            Supply<span className="gradient-text">Shield</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '6px' }}>
            Fleet & Logistics Management System
          </p>
        </div>

        {/* Login Card */}
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          borderRadius: '20px',
          padding: '36px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}>
          <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '6px' }}>
            {forgotMode ? 'Reset your password' : 'Sign in to your account'}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '28px' }}>
            {forgotMode
              ? "Enter your email and we'll send you a reset link."
              : 'Enter your credentials to access the dashboard'}
          </p>

          {!isConfigured && (
            <div style={{
              background: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: '10px',
              padding: '12px 16px',
              marginBottom: '20px',
              color: '#fbbf24',
              fontSize: '13px',
              lineHeight: '1.5',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600', marginBottom: '4px' }}>
                <AlertCircle size={16} /> Supabase Setup Required
              </div>
              <p style={{ margin: 0, fontSize: '12px', color: '#fde68a' }}>
                Create a <code>.env.local</code> file with your Supabase credentials and restart <code>npm run dev</code>:
              </p>
              <pre style={{
                marginTop: '8px',
                marginBottom: 0,
                padding: '8px',
                background: 'rgba(0,0,0,0.3)',
                borderRadius: '6px',
                fontSize: '11px',
                color: '#e2e8f0',
                overflowX: 'auto',
                fontFamily: 'monospace',
              }}>NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co&#10;NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key</pre>
            </div>
          )}

          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: '10px',
              padding: '12px 16px',
              marginBottom: '20px',
              color: '#ef4444',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <span>⚠</span> {error}
            </div>
          )}

          {/* ---- FORGOT PASSWORD MODE ---- */}
          {forgotMode ? (
            resetSent ? (
              <div style={{ textAlign: 'center', padding: '12px 0' }}>
                <div style={{ fontSize: '36px', marginBottom: '12px' }}>📧</div>
                <p style={{ fontWeight: '700', marginBottom: '6px' }}>Check your email</p>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '20px' }}>
                  A password reset link has been sent to <strong>{email}</strong>.
                </p>
                <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }} onClick={goToLogin}>
                  ← Back to Sign In
                </button>
              </div>
            ) : (
              <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input type="email" className="form-input" placeholder="you@company.com" value={email}
                    onChange={e => setEmail(e.target.value)} required autoComplete="email" />
                </div>
                <button type="submit" className="btn btn-primary" disabled={loading}
                  style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: '15px' }}>
                  {loading ? <><Loader2 size={16} style={{ animation: 'spin 0.7s linear infinite' }} /> Sending...</> : 'Send Reset Link'}
                </button>
                <button type="button" className="btn btn-secondary"
                  style={{ width: '100%', justifyContent: 'center' }} onClick={goToLogin}>
                  ← Back to Sign In
                </button>
              </form>
            )
          ) : (
          /* ---- SIGN IN MODE ---- */
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input type="email" className="form-input" placeholder="you@company.com" value={email}
                onChange={e => setEmail(e.target.value)} required autoComplete="email" />
            </div>
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                Password
                <button type="button" onClick={goToForgot}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3b82f6', fontSize: '12px', fontWeight: '500', padding: 0 }}>
                  Forgot password?
                </button>
              </label>
              <div style={{ position: 'relative' }}>
                <input type={showPassword ? 'text' : 'password'} className="form-input" placeholder="••••••••"
                  value={password} onChange={e => setPassword(e.target.value)}
                  required autoComplete="current-password" style={{ paddingRight: '44px' }} />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading}
              style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: '15px', marginTop: '4px' }}>
              {loading ? <><Loader2 size={16} style={{ animation: 'spin 0.7s linear infinite' }} /> Signing in...</> : 'Sign In'}
            </button>
            <div style={{ textAlign: 'center', marginTop: '14px', fontSize: '13px', color: 'var(--text-muted)' }}>
              Don&apos;t have an account?{' '}
              <Link
                href="/signup"
                style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: '600' }}
              >
                Sign Up
              </Link>
            </div>
          </form>
          )}

          {/* Role legend & 1-click Demo Fill */}
          <div style={{
            marginTop: '28px',
            padding: '16px',
            background: 'var(--bg-elevated)',
            borderRadius: '10px',
            border: '1px solid var(--border-default)',
          }}>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Quick Demo Access (Click to Autofill)
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {[
                { role: 'Manager', email: 'manager@fleetflow.com', color: '#3b82f6' },
                { role: 'Dispatcher', email: 'dispatcher@fleetflow.com', color: '#22c55e' },
                { role: 'Safety Officer', email: 'safety@fleetflow.com', color: '#f97316' },
                { role: 'Finance Analyst', email: 'finance@fleetflow.com', color: '#a855f7' },
              ].map(({ role: rName, email: rEmail, color }) => (
                <button
                  key={rName}
                  type="button"
                  onClick={() => {
                    setEmail(rEmail);
                    setPassword('Password123!');
                    setError('');
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '12px',
                    color: 'var(--text-secondary)',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid var(--border-default)',
                    borderRadius: '8px',
                    padding: '8px 10px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = color;
                    e.currentTarget.style.color = 'var(--text-primary)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'var(--border-default)';
                    e.currentTarget.style.color = 'var(--text-secondary)';
                  }}
                >
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '11px' }}>{rName}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', opacity: 0.8 }}>Password123!</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <p style={{ textAlign: 'center', marginTop: '20px', color: 'var(--text-muted)', fontSize: '13px' }}>
          © 2026 SupplyShield. All rights reserved.
        </p>
      </div>
    </div>
  );
}
