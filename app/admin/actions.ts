'use server';

import { createClient } from '@/lib/supabase/server';
import { fetchDashboardData, DashboardData } from '@/lib/admin/dashboard';
import { cookies } from 'next/headers';
import { validateAdminAccess } from '@/lib/auth/guards';

/**
 * Fetches dashboard details. Re-verifies auth on call.
 */
export async function getDashboardDataAction(): Promise<DashboardData> {
  await validateAdminAccess();
  
  const cookieStore = await cookies();
  const locale = cookieStore.get('NEXT_LOCALE')?.value || 'pl';
  
  return await fetchDashboardData(locale);
}
