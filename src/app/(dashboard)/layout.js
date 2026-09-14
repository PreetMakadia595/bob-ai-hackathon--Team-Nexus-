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
    async function checkAuth() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        let activeUser = session?.user || null;
        let userRole = null;

        if (activeUser) {
          const { data } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', activeUser.id)
            .single();
          userRole = data?.role || activeUser.user_metadata?.role || 'manager';
        } else if (typeof window !== 'undefined') {
          // Check for registered user session fallback
          const localSessionStr = localStorage.getItem('supplyshield_user_session');
          if (localSessionStr) {
            try {
              const parsed = JSON.parse(localSessionStr);
              if (parsed?.email) {
                activeUser = parsed;
                userRole = parsed.role || 'manager';
              }
            } catch (e) {}
          }
        }

        if (!activeUser) {
          router.push('/login');
          return;
        }

        setUser(activeUser);
        setRole(userRole || 'manager');

        // RBAC check — redirect to /403 if role can't access this route
        if (!isAllowed(userRole || 'manager', pathname)) {
          router.replace('/403');
          return;
        }
        setChecking(false);
      } catch (err) {
        console.warn('Auth check warning:', err);
        setChecking(false);
      }
    }

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        if (typeof window !== 'undefined') {
          const localSession = localStorage.getItem('supplyshield_user_session');
          if (!localSession) {
            router.push('/login');
          }
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [router, pathname]);

  if (checking) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ width: '40px', height: '40px', borderWidth: '3px', margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Loading SupplyShield...</p>
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
