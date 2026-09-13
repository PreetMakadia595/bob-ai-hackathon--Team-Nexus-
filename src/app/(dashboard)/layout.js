'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ToastProvider } from '@/lib/toast-context';
import { isAllowed } from '@/lib/rbac';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import ToastContainer from '@/components/ToastContainer';
import ErrorBoundary from '@/components/ErrorBoundary';

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        router.push('/login');
        return;
      }
      setUser(session.user);
      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();
      const userRole = data?.role || 'manager';
      setRole(userRole);

      // RBAC check — redirect to /403 if role can't access this route
      if (!isAllowed(userRole, pathname)) {
        router.replace('/403');
        return;
      }
      setChecking(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.push('/login');
    });

    return () => subscription.unsubscribe();
  }, [router, pathname]);

  if (checking) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ width: '40px', height: '40px', borderWidth: '3px', margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Loading FleetFlow...</p>
        </div>
      </div>
    );
  }

  return (
    <ToastProvider>
      <div className="app-shell">
        <Sidebar role={role} />
        <div className="main-content">
          <Navbar user={user} role={role} />
          <main className="page-content">
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
          </main>
        </div>
      </div>
      <ToastContainer />
    </ToastProvider>
  );
}
