import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

function getServiceRoleKey() {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.SUPABASE_SERVICE_ROLE_KEY.includes('your-service-role-key')) {
    return process.env.SUPABASE_SERVICE_ROLE_KEY;
  }
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
        const val = trimmed.split('=')[1]?.trim();
        if (val && !val.includes('your-service-role-key') && val.length > 20) {
          return val;
        }
      }
    }
  }
  return null;
}

export async function POST(request) {
  try {
    const { email, password, fullName, role } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const serviceKey = getServiceRoleKey();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    // If service role key is configured, use admin API to create and auto-confirm user
    if (serviceKey && supabaseUrl) {
      const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      });

      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: email.trim(),
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName || email.split('@')[0],
          role: role || 'manager'
        }
      });

      if (error) {
        return NextResponse.json({ error: error.message, code: error.code }, { status: 400 });
      }

      // Upsert profile in public.profiles table
      if (data?.user) {
        await supabaseAdmin.from('profiles').upsert({
          id: data.user.id,
          email: data.user.email,
          role: role || 'manager'
        });
      }

      return NextResponse.json({
        success: true,
        user: data.user,
        autoConfirmed: true
      });
    }

    // If service role key is not configured, signal client to use anon signUp
    return NextResponse.json({ fallbackToClient: true });

  } catch (err) {
    console.error('Server signup error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
