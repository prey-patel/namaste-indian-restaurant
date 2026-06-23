'use server';

import { createClient } from '@/lib/supabase/server';
import { fetchDashboardData, DashboardData } from '@/lib/admin/dashboard';
import { cookies } from 'next/headers';

/**
 * Validates that the current user has owner or manager access.
 */
async function validateAdminAccess() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('Unauthorized: Unauthenticated user');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    throw new Error('Unauthorized: Admin profile not found');
  }

  if (!profile.is_active) {
    throw new Error('Unauthorized: Admin account is inactive');
  }

  if (profile.role !== 'owner' && profile.role !== 'manager') {
    throw new Error('Unauthorized: Insufficient permissions');
  }

  return user.id;
}

/**
 * Fetches dashboard details. Re-verifies auth on call.
 */
export async function getDashboardDataAction(): Promise<DashboardData> {
  await validateAdminAccess();
  
  const cookieStore = await cookies();
  const locale = cookieStore.get('NEXT_LOCALE')?.value || 'pl';
  
  return await fetchDashboardData(locale);
}
