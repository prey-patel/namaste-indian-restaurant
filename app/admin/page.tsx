import React from 'react';
import { cookies } from 'next/headers';
import { fetchDashboardData } from '@/lib/admin/dashboard';
import DashboardOverview from '@/components/admin/dashboard/dashboard-overview';

export const revalidate = 0; // Enforce dynamic rendering for fresh stats

export default async function AdminDashboardPage() {
  const cookieStore = await cookies();
  const locale = cookieStore.get('NEXT_LOCALE')?.value || 'pl';

  // Fetch initial stats and operational data on the server
  const initialData = await fetchDashboardData(locale);

  return <DashboardOverview initialData={initialData} />;
}
