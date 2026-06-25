import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import OrdersDashboard from '@/components/admin/orders/orders-dashboard';

export const dynamic = 'force-dynamic';

type Props = {
  searchParams: Promise<{
    status?: string;
    type?: string;
    date?: string;
    query?: string;
    payment_status?: string;
  }>;
};

export default async function AdminOrdersPage({ searchParams }: Props) {
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

  // 3. Calculate timezone bounds for completed orders today (Warsaw)
  const nowInWarsaw = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Warsaw' }));
  const year = nowInWarsaw.getFullYear();
  const month = String(nowInWarsaw.getMonth() + 1).padStart(2, '0');
  const day = String(nowInWarsaw.getDate()).padStart(2, '0');
  const todayLocalDate = `${year}-${month}-${day}`;

  const todayStart = `${todayLocalDate} 00:00:00 Europe/Warsaw`;
  const todayEnd = `${todayLocalDate} 23:59:59 Europe/Warsaw`;

  // 4. Gather global statistics
  const [
    pendingRes,
    confirmedRes,
    readyRes,
    completedTodayRes
  ] = await Promise.all([
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending'),
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .in('status', ['approved', 'preparing']),
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .in('status', ['ready_for_pickup', 'out_for_delivery']),
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'completed')
      .gte('completed_at', todayStart)
      .lte('completed_at', todayEnd)
  ]);

  const metrics = {
    pendingCount: pendingRes.count || 0,
    confirmedCount: confirmedRes.count || 0,
    readyCount: readyRes.count || 0,
    completedCount: completedTodayRes.count || 0,
  };

  // 5. Build filtered orders query
  const resolvedSearchParams = await searchParams;
  const status = resolvedSearchParams.status || 'all';
  const type = resolvedSearchParams.type || 'all';
  const date = resolvedSearchParams.date || '';
  const query = resolvedSearchParams.query || '';
  const payment_status = resolvedSearchParams.payment_status || 'all';

  let queryBuilder = supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });

  if (status !== 'all') {
    // Map 'confirmed' search filter to database status 'approved'
    const dbStatus = status === 'confirmed' ? 'approved' : status;
    queryBuilder = queryBuilder.eq('status', dbStatus);
  }

  if (type !== 'all') {
    queryBuilder = queryBuilder.eq('order_type', type);
  }

  if (payment_status !== 'all') {
    queryBuilder = queryBuilder.eq('payment_status', payment_status);
  }

  if (date) {
    if (date === 'today') {
      const nowInWarsaw = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Warsaw' }));
      const year = nowInWarsaw.getFullYear();
      const month = String(nowInWarsaw.getMonth() + 1).padStart(2, '0');
      const day = String(nowInWarsaw.getDate()).padStart(2, '0');
      const todayLocalDate = `${year}-${month}-${day}`;
      const filterStart = `${todayLocalDate} 00:00:00 Europe/Warsaw`;
      const filterEnd = `${todayLocalDate} 23:59:59 Europe/Warsaw`;
      queryBuilder = queryBuilder.gte('created_at', filterStart).lte('created_at', filterEnd);
    } else if (date === 'yesterday') {
      const nowInWarsaw = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Warsaw' }));
      const yesterdayInWarsaw = new Date(nowInWarsaw);
      yesterdayInWarsaw.setDate(yesterdayInWarsaw.getDate() - 1);
      const yYear = yesterdayInWarsaw.getFullYear();
      const yMonth = String(yesterdayInWarsaw.getMonth() + 1).padStart(2, '0');
      const yDay = String(yesterdayInWarsaw.getDate()).padStart(2, '0');
      const yesterdayLocalDate = `${yYear}-${yMonth}-${yDay}`;
      const filterStart = `${yesterdayLocalDate} 00:00:00 Europe/Warsaw`;
      const filterEnd = `${yesterdayLocalDate} 23:59:59 Europe/Warsaw`;
      queryBuilder = queryBuilder.gte('created_at', filterStart).lte('created_at', filterEnd);
    } else if (date === 'this_week') {
      const nowInWarsaw = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Warsaw' }));
      const mondayInWarsaw = new Date(nowInWarsaw);
      const dayOfWeek = mondayInWarsaw.getDay();
      const diff = mondayInWarsaw.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      mondayInWarsaw.setDate(diff);
      const mYear = mondayInWarsaw.getFullYear();
      const mMonth = String(mondayInWarsaw.getMonth() + 1).padStart(2, '0');
      const mDay = String(mondayInWarsaw.getDate()).padStart(2, '0');
      const mondayLocalDate = `${mYear}-${mMonth}-${mDay}`;

      const year = nowInWarsaw.getFullYear();
      const month = String(nowInWarsaw.getMonth() + 1).padStart(2, '0');
      const day = String(nowInWarsaw.getDate()).padStart(2, '0');
      const todayLocalDate = `${year}-${month}-${day}`;

      const filterStart = `${mondayLocalDate} 00:00:00 Europe/Warsaw`;
      const filterEnd = `${todayLocalDate} 23:59:59 Europe/Warsaw`;
      queryBuilder = queryBuilder.gte('created_at', filterStart).lte('created_at', filterEnd);
    } else {
      const filterStart = `${date} 00:00:00 Europe/Warsaw`;
      const filterEnd = `${date} 23:59:59 Europe/Warsaw`;
      queryBuilder = queryBuilder.gte('created_at', filterStart).lte('created_at', filterEnd);
    }
  }

  if (query) {
    queryBuilder = queryBuilder.or(`customer_name.ilike.%${query}%,customer_email.ilike.%${query}%,customer_phone.ilike.%${query}%,delivery_address.ilike.%${query}%,delivery_postal_code.ilike.%${query}%,id_text.ilike.%${query}%`);
  }

  const { data: orders, error: ordersError } = await queryBuilder;

  if (ordersError) {
    console.error('Error fetching orders list in admin dashboard:', ordersError);
  }

  return (
    <OrdersDashboard
      initialOrders={(orders || []) as any[]}
      metrics={metrics}
      filters={{
        status,
        type,
        date,
        query,
        payment_status
      }}
    />
  );
}
