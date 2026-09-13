'use client';
import { usePathname, useRouter } from 'next/navigation';
import { Bell, LogOut, User, ChevronDown } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useState } from 'react';

const pageTitles = {
  '/': 'Dashboard',
  '/vehicles': 'Vehicle Registry',
  '/drivers': 'Driver Management',
  '/trips': 'Trip Dispatcher',
  '/maintenance': 'Maintenance Logs',
  '/fuel': 'Fuel & Expenses',
  '/analytics': 'Analytics & Reports',
};

const roleColors = {
  manager: '#3b82f6',
  dispatcher: '#22c55e',
  safety: '#f97316',
  finance: '#a855f7',
};

export default function Navbar({ user, role }) {
  const pathname = usePathname();
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);

  const title = pageTitles[pathname] || 'FleetFlow';
  const email = user?.email || 'User';
  const initials = email.substring(0, 2).toUpperCase();
  const roleColor = roleColors[role] || '#3b82f6';
  const roleLabel = role ? role.charAt(0).toUpperCase() + role.slice(1) : 'User';

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <header style={{
      height: '64px',
      background: 'var(--bg-surface)',
      borderBottom: '1px solid var(--border-default)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      position: 'sticky',
      top: 0,
      zIndex: 30,
    }}>
      {/* Page Title */}
      <div>
        <h1 style={{ fontSize: '18px', fontWeight: '700', letterSpacing: '-0.01em' }}>{title}</h1>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '1px' }}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Right Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Notifications */}
        <button
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-default)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'var(--text-secondary)',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
        >
          <Bell size={16} />
        </button>

        {/* User menu */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowMenu(!showMenu)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '6px 12px 6px 6px',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-default)',
              borderRadius: '12px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--brand-primary)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-default)'}
          >
            {/* Avatar */}
            <div style={{
              width: '30px',
              height: '30px',
              borderRadius: '8px',
              background: `linear-gradient(135deg, ${roleColor}, ${roleColor}99)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: '700',
              color: 'white',
            }}>
              {initials}
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', lineHeight: 1, maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {email.split('@')[0]}
              </div>
              <div style={{ fontSize: '11px', color: roleColor, marginTop: '2px', fontWeight: '600' }}>
                {roleLabel}
              </div>
            </div>
            <ChevronDown size={14} color="var(--text-muted)" style={{ transform: showMenu ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
          </button>

          {/* Dropdown */}
          {showMenu && (
            <div style={{
              position: 'absolute',
              top: '52px',
              right: 0,
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-default)',
              borderRadius: '12px',
              padding: '8px',
              minWidth: '180px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
              zIndex: 50,
              animation: 'fadeIn 0.15s ease',
            }}>
              <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-default)', marginBottom: '6px' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Signed in as</div>
                <div style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: '500', marginTop: '2px', wordBreak: 'break-all' }}>{email}</div>
              </div>
              <button
                onClick={handleSignOut}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 12px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#ef4444',
                  fontSize: '14px',
                  borderRadius: '8px',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                <LogOut size={15} /> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
