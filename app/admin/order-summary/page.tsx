import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import OrderSummaryDashboard from '@/components/admin/order-summary/order-summary-dashboard';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Order Summary — Namaste Admin',
  description: 'Smart search, advanced filters and customer CRM intelligence.',
};

type Props = {
  searchParams: Promise<{
    query?: string;
    status?: string;
    type?: string;
    payment_status?: string;
    date?: string;
    selected_email?: string;
    stats_from?: string;
    stats_to?: string;
  }>;
};

// ─── Timezone helpers (Europe/Warsaw) ────────────────────────────────────────

function warsawDateStr(d: Date): string {
  const loc = new Date(d.toLocaleString('en-US', { timeZone: 'Europe/Warsaw' }));
  const y = loc.getFullYear();
  const m = String(loc.getMonth() + 1).padStart(2, '0');
  const day = String(loc.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function warsawRange(date: string): [string, string] {
  return [`${date} 00:00:00 Europe/Warsaw`, `${date} 23:59:59 Europe/Warsaw`];
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AdminOrderSummaryPage({ searchParams }: Props) {
  const supabase = await createClient();

  // 1. Auth guard
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) redirect('/admin/login');

  // 2. Role guard (owner / manager only)
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .single();

  if (profileError || !profile || !profile.is_active) redirect('/admin/login');
  if (profile.role !== 'owner' && profile.role !== 'manager') redirect('/admin/login');

  // 3. Parse search params
  const sp = await searchParams;
  const query = sp.query?.trim() || '';
  const status = sp.status || 'all';
  const type = sp.type || 'all';
  const payment_status = sp.payment_status || 'all';
  const date = sp.date || '';
  const selected_email = sp.selected_email?.trim() || '';

  // Stats date range — defaults to current month in Warsaw timezone
  const nowWarsaw = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Warsaw' }));
  const defaultFrom = `${nowWarsaw.getFullYear()}-${String(nowWarsaw.getMonth() + 1).padStart(2, '0')}-01`;
  const defaultTo = warsawDateStr(new Date());
  const statsFrom = sp.stats_from || defaultFrom;
  const statsTo = sp.stats_to || defaultTo;

  // 4. Build filtered orders query
  let qb = supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500); // reasonable cap — prevents huge SSR payloads

  // Status filter
  if (status !== 'all') {
    const dbStatus = status === 'confirmed' ? 'approved' : status;
    qb = qb.eq('status', dbStatus);
  }

  // Type filter
  if (type !== 'all') {
    qb = qb.eq('order_type', type);
  }

  // Payment status filter
  if (payment_status !== 'all') {
    qb = qb.eq('payment_status', payment_status);
  }

  // Date range filter
  if (date) {
    const now = new Date();
    if (date === 'today') {
      const [start, end] = warsawRange(warsawDateStr(now));
      qb = qb.gte('created_at', start).lte('created_at', end);
    } else if (date === 'yesterday') {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const [start, end] = warsawRange(warsawDateStr(yesterday));
      qb = qb.gte('created_at', start).lte('created_at', end);
    } else if (date === 'this_week') {
      const monday = new Date(now);
      const dow = monday.getDay(); // 0 = Sun
      monday.setDate(monday.getDate() - (dow === 0 ? 6 : dow - 1));
      const [start] = warsawRange(warsawDateStr(monday));
      const [, end] = warsawRange(warsawDateStr(now));
      qb = qb.gte('created_at', start).lte('created_at', end);
    } else {
      // Custom ISO date string (YYYY-MM-DD)
      const [start, end] = warsawRange(date);
      qb = qb.gte('created_at', start).lte('created_at', end);
    }
  }

  // Full-text / multi-field search
  if (query) {
    qb = qb.or(
      [
        `customer_name.ilike.%${query}%`,
        `customer_email.ilike.%${query}%`,
        `customer_phone.ilike.%${query}%`,
        `delivery_address.ilike.%${query}%`,
        `delivery_postal_code.ilike.%${query}%`,
        `id_text.ilike.%${query}%`,
      ].join(',')
    );
  }

  const { data: orders, error: ordersError } = await qb;
  if (ordersError) {
    console.error('[OrderSummary] Failed to fetch orders:', ordersError);
  }
  const safeOrders = (orders || []) as any[];

  // ── Stats computation ─────────────────────────────────────────────────────
  const [statsStart] = warsawRange(statsFrom);
  const [, statsEnd] = warsawRange(statsTo);

  const { data: statsOrders } = await supabase
    .from('orders')
    .select('total_amount, order_type, status, payment_method, delivery_distance_car_meters')
    .gte('created_at', statsStart)
    .lte('created_at', statsEnd);

  const allStatsOrders = (statsOrders || []) as any[];

  // 1. Total Sales — sum of total_amount for completed orders
  const completedOrders = allStatsOrders.filter((o: any) => o.status === 'completed');
  const totalSales = completedOrders.reduce((sum: number, o: any) => sum + Number(o.total_amount || 0), 0);

  // 2. Total Orders — count of all orders in range
  const totalOrders = allStatsOrders.length;

  // 3. Avg. Order Value — total sales ÷ completed count
  const avgOrderValue = completedOrders.length > 0 ? totalSales / completedOrders.length : 0;

  // 4. Delivery vs Takeaway
  const deliveryCount = allStatsOrders.filter((o: any) => o.order_type === 'delivery').length;
  const takeawayCount = allStatsOrders.filter((o: any) => o.order_type === 'takeaway').length;

  // 5. Cancelled / Rejected
  const cancelledRejectedCount = allStatsOrders.filter(
    (o: any) => o.status === 'cancelled' || o.status === 'rejected'
  ).length;

  // 6. Payment Method Split (based on completed orders)
  const cashTotal = completedOrders
    .filter((o: any) => o.payment_method === 'cash' || o.payment_method === 'cash_on_delivery')
    .reduce((sum: number, o: any) => sum + Number(o.total_amount || 0), 0);
  const onlineTotal = completedOrders
    .filter((o: any) => o.payment_method !== 'cash' && o.payment_method !== 'cash_on_delivery')
    .reduce((sum: number, o: any) => sum + Number(o.total_amount || 0), 0);

  // 7. Avg. Delivery Distance
  const deliveryWithDist = allStatsOrders.filter(
    (o: any) => o.order_type === 'delivery' && o.delivery_distance_car_meters != null && o.delivery_distance_car_meters > 0
  );
  const avgDeliveryDistanceKm = deliveryWithDist.length > 0
    ? deliveryWithDist.reduce((sum: number, o: any) => sum + Number(o.delivery_distance_car_meters), 0) / deliveryWithDist.length / 1000
    : 0;

  const stats = {
    totalSales,
    totalOrders,
    avgOrderValue,
    deliveryCount,
    takeawayCount,
    cancelledRejectedCount,
    cashTotal,
    onlineTotal,
    avgDeliveryDistanceKm,
  };

  // 5. Customer CRM data — fetched only when a customer email is selected
  let selectedCustomer: { name: string; email: string; phone: string } | null = null;
  let crmStats: { totalOrders: number; ltv: number; aov: number } | null = null;
  let pastOrders: any[] = [];
  let favoriteDishes: any[] = [];

  if (selected_email) {
    // Resolve display info from the orders list (fast, no extra DB round trip)
    const matchingOrder = safeOrders.find(
      (o) => o.customer_email === selected_email
    );
    if (matchingOrder) {
      selectedCustomer = {
        name: matchingOrder.customer_name,
        email: matchingOrder.customer_email,
        phone: matchingOrder.customer_phone,
      };
    } else {
      // Email may have been passed directly in URL without being in the current filter view
      // Do a lightweight fetch to resolve the name
      const { data: fallbackOrder } = await supabase
        .from('orders')
        .select('customer_name, customer_email, customer_phone')
        .eq('customer_email', selected_email)
        .limit(1)
        .single();
      if (fallbackOrder) {
        selectedCustomer = {
          name: fallbackOrder.customer_name,
          email: fallbackOrder.customer_email,
          phone: fallbackOrder.customer_phone,
        };
      }
    }

    // Run CRM data fetches in parallel
    const [statsRes, pastRes, dishRes] = await Promise.all([
      // CRM stats — completed orders only
      supabase
        .from('orders')
        .select('total_amount')
        .eq('customer_email', selected_email)
        .eq('status', 'completed'),

      // Full order history (all statuses)
      supabase
        .from('orders')
        .select('id, created_at, order_type, total_amount, status, delivery_fee, payment_method, payment_status')
        .eq('customer_email', selected_email)
        .order('created_at', { ascending: false }),

      // Dish frequency — join order_items → orders
      supabase
        .from('order_items')
        .select('item_name_en, item_name_pl, quantity, orders!inner(customer_email)')
        .eq('orders.customer_email', selected_email),
    ]);

    // Build CRM stats
    if (statsRes.data && statsRes.data.length > 0) {
      const amounts = statsRes.data.map((o) => Number(o.total_amount));
      const totalOrders = amounts.length;
      const ltv = amounts.reduce((acc, v) => acc + v, 0);
      const aov = ltv / totalOrders;
      crmStats = { totalOrders, ltv, aov };
    } else {
      // Customer exists but has no completed orders — still show zero stats
      crmStats = { totalOrders: 0, ltv: 0, aov: 0 };
    }

    // Past orders list
    if (pastRes.data) {
      pastOrders = pastRes.data;
    }

    // Favorite dishes — aggregate by item name
    if (dishRes.data) {
      const dishMap: Record<string, { nameEn: string; namePl: string; count: number }> = {};
      dishRes.data.forEach((item) => {
        const key = item.item_name_en || item.item_name_pl || 'Unknown';
        if (!dishMap[key]) {
          dishMap[key] = {
            nameEn: item.item_name_en || '',
            namePl: item.item_name_pl || '',
            count: 0,
          };
        }
        dishMap[key].count += item.quantity || 0;
      });
      favoriteDishes = Object.values(dishMap)
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);
    }
  }

  return (
    <OrderSummaryDashboard
      initialOrders={safeOrders}
      filters={{
        query,
        status,
        type,
        payment_status,
        date,
        selected_email,
      }}
      selectedCustomer={selectedCustomer}
      crmStats={crmStats}
      pastOrders={pastOrders}
      favoriteDishes={favoriteDishes}
      stats={stats}
      statsFrom={statsFrom}
      statsTo={statsTo}
    />
  );
}
