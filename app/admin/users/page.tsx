import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import UsersDashboard from '@/components/admin/users/users-dashboard';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Użytkownicy i Uprawnienia / Users & Roles — Namaste Admin',
  robots: { index: false, follow: false },
};

function formatLastLogin(dateStr: string | undefined | null): string | null {
  if (!dateStr) return null;
  try {
    const date = new Date(dateStr);
    const now = new Date();
    
    // Check if same calendar day
    const isToday = now.toDateString() === date.toDateString();
    
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = yesterday.toDateString() === date.toDateString();

    const timeStr = date.toLocaleTimeString('pl-PL', { 
      hour: '2-digit', 
      minute: '2-digit', 
      timeZone: 'Europe/Warsaw' 
    });
    
    if (isToday) {
      return `Today, ${timeStr}`;
    }
    if (isYesterday) {
      return `Yesterday, ${timeStr}`;
    }
    
    return date.toLocaleDateString('en-GB', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric', 
      timeZone: 'Europe/Warsaw' 
    });
  } catch (e) {
    return null;
  }
}

export default async function AdminUsersPage() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  // 1. Auth check
  if (authError || !user) {
    redirect('/admin/login');
  }

  // 2. Role check
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .single();

  if (profileError || !profile || !profile.is_active) {
    redirect('/admin/login');
  }

  // Only Owner and Manager are allowed
  if (profile.role !== 'owner' && profile.role !== 'manager') {
    redirect('/admin');
  }

  // 3. Fetch data using secure server-only admin client
  let users: any[] = [];
  try {
    const adminClient = createAdminClient();
    const [profilesResult, authUsersResult] = await Promise.all([
      adminClient.from('profiles').select('*').order('created_at', { ascending: true }),
      adminClient.auth.admin.listUsers(),
    ]);

    const rawProfiles = profilesResult.data || [];
    const authUsers = authUsersResult.data?.users || [];

    // Merge profile and auth details
    users = rawProfiles.map((p: any) => {
      const authUser = authUsers.find((au: any) => au.id === p.id);
      return {
        id: p.id,
        email: p.email,
        role: p.role,
        full_name: p.full_name,
        phone: p.phone,
        is_active: p.is_active,
        created_at: p.created_at,
        last_login: authUser ? formatLastLogin(authUser.last_sign_in_at) : null,
      };
    });
  } catch (err) {
    console.error('Failed to load users for dashboard:', err);
  }

  return (
    <UsersDashboard
      initialUsers={users}
      caller={{
        id: user.id,
        role: profile.role as 'owner' | 'manager',
      }}
    />
  );
}
