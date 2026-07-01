import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ReservationsDashboard from '@/components/admin/reservations/reservations-dashboard';

export const dynamic = 'force-dynamic';

type Props = {
  searchParams: Promise<{
    status?: string;
    date?: string;
    query?: string;
  }>;
};

export default async function AdminReservationsPage({ searchParams }: Props) {
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

  // 3. Load active dining tables for manual allocation
  const { data: tables } = await supabase
    .from('dining_tables')
    .select('*')
    .eq('is_active', true)
    .order('table_number', { ascending: true });

  // 4. Calculate timezone bounds for metrics in Europe/Warsaw
  const nowInWarsaw = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Warsaw' }));
  const year = nowInWarsaw.getFullYear();
  const month = String(nowInWarsaw.getMonth() + 1).padStart(2, '0');
  const day = String(nowInWarsaw.getDate()).padStart(2, '0');
  const todayLocalDate = `${year}-${month}-${day}`;

  const todayStart = `${todayLocalDate} 00:00:00 Europe/Warsaw`;
  const todayEnd = `${todayLocalDate} 23:59:59 Europe/Warsaw`;
  const nowString = nowInWarsaw.toISOString(); // UTC equivalent baseline

  // 5. Gather global statistics
  const [
    pendingRes,
    confirmedTodayRes,
    upcomingRes,
    cancelledRejectedRes
  ] = await Promise.all([
    supabase
      .from('reservations')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending'),
    supabase
      .from('reservations')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'confirmed')
      .gte('reservation_start_at', todayStart)
      .lte('reservation_start_at', todayEnd),
    supabase
      .from('reservations')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'confirmed')
      .gte('reservation_start_at', nowString),
    supabase
      .from('reservations')
      .select('id', { count: 'exact', head: true })
      .in('status', ['cancelled', 'rejected'])
  ]);

  const metrics = {
    pendingCount: pendingRes.count || 0,
    confirmedToday: confirmedTodayRes.count || 0,
    upcomingCount: upcomingRes.count || 0,
    cancelledCount: cancelledRejectedRes.count || 0,
  };

  // 6. Build the filtered list query
  const resolvedSearchParams = await searchParams;
  const status = resolvedSearchParams.status || 'all';
  const date = resolvedSearchParams.date || '';
  const query = resolvedSearchParams.query || '';

  let queryBuilder = supabase
    .from('reservations')
    .select(`
      *,
      dining_tables (
        table_number,
        capacity,
        section
      )
    `)
    .order('reservation_start_at', { ascending: true });

  if (status !== 'all') {
    queryBuilder = queryBuilder.eq('status', status);
  }

  if (date) {
    const filterStart = `${date} 00:00:00 Europe/Warsaw`;
    const filterEnd = `${date} 23:59:59 Europe/Warsaw`;
    queryBuilder = queryBuilder.gte('reservation_start_at', filterStart).lte('reservation_start_at', filterEnd);
  }

  if (query) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const cleanQuery = query.trim();
    if (uuidRegex.test(cleanQuery)) {
      queryBuilder = queryBuilder.or(`id.eq.${cleanQuery},token.eq.${cleanQuery}`);
    } else {
      queryBuilder = queryBuilder.or(`customer_name.ilike.%${query}%,customer_email.ilike.%${query}%,customer_phone.ilike.%${query}%`);
    }
  }

  const { data: reservations, error: resError } = await queryBuilder;

  if (resError) {
    console.error('Error fetching reservations list in admin grid:', resError);
  }

  return (
    <ReservationsDashboard
      initialReservations={(reservations || []) as any[]}
      tables={tables || []}
      metrics={metrics}
      filters={{
        status,
        date,
        query
      }}
    />
  );
}
