import React from 'react';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { fetchDashboardData } from '@/lib/admin/dashboard';
import DashboardOverview from '@/components/admin/dashboard/dashboard-overview';

export const revalidate = 0; // Enforce dynamic rendering for fresh stats

export default async function AdminDashboardPage() {
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

  if (profile.role !== 'owner' && profile.role !== 'manager') {
    redirect('/admin/login');
  }

  const cookieStore = await cookies();
  const locale = cookieStore.get('NEXT_LOCALE')?.value || 'pl';

  // Fetch initial stats and operational data on the server
  const initialData = await fetchDashboardData(locale);

  return <DashboardOverview initialData={initialData} />;
}
