import { NextResponse } from 'next/server';

// Auth is handled client-side in (dashboard)/layout.js via supabase.auth.getSession().
// Supabase JS v2 stores the session in localStorage (not cookies), so server-side
// middleware cannot read tokens reliably without @supabase/ssr. Pass all requests through.
export function middleware(req) {
  return NextResponse.next();
}

export const config = {
  matcher: [],
};
