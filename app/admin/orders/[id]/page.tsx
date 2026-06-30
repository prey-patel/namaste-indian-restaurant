import React from 'react';
import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import OrderDetailsClient from '@/components/admin/orders/order-details-client';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ id: string }>;
};

export default async function AdminOrderDetailPage({ params }: Props) {
  const { id } = await params;
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

  // 3. Load order
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('*, dining_tables(table_number)')
    .eq('id', id)
    .single();

  if (orderError || !order) {
    notFound();
  }

  // 4. Load order items
  const { data: items } = await supabase
    .from('order_items')
    .select('*')
    .eq('order_id', id);

  // 5. Load order status timeline logs
  const { data: timeline } = await supabase
    .from('order_status_events')
    .select(`
      *,
      profiles (
        full_name,
        role
      )
    `)
    .eq('order_id', id)
    .order('created_at', { ascending: true });

  // 6. Gather customer CRM stats
  let crmStats = {
    totalOrders: 0,
    ltv: 0,
    aov: 0
  };
  let pastOrders: any[] = [];
  let favoriteDishes: any[] = [];

  if (order.customer_email) {
    const { data: statsData } = await supabase
      .from('orders')
      .select('total_amount')
      .eq('customer_email', order.customer_email)
      .eq('status', 'completed');

    if (statsData && statsData.length > 0) {
      const totalAmountList = statsData.map(o => Number(o.total_amount));
      const totalOrdersCount = totalAmountList.length;
      const ltvVal = totalAmountList.reduce((acc, curr) => acc + curr, 0);
      const aovVal = ltvVal / totalOrdersCount;
      crmStats = {
        totalOrders: totalOrdersCount,
        ltv: ltvVal,
        aov: aovVal
      };
    }

    const { data: pastOrdersData } = await supabase
      .from('orders')
      .select('id, created_at, order_type, total_amount, status, delivery_fee, payment_method, payment_status')
      .eq('customer_email', order.customer_email)
      .neq('id', id)
      .order('created_at', { ascending: false });

    if (pastOrdersData) {
      pastOrders = pastOrdersData;
    }

    const { data: customerOrderItems } = await supabase
      .from('order_items')
      .select('item_name_pl, item_name_en, quantity, orders!inner(customer_email)')
      .eq('orders.customer_email', order.customer_email);

    if (customerOrderItems) {
      const dishCounts: Record<string, { nameEn: string; namePl: string; count: number }> = {};
      customerOrderItems.forEach(item => {
        const key = item.item_name_en || item.item_name_pl || 'Unknown';
        if (!dishCounts[key]) {
          dishCounts[key] = {
            nameEn: item.item_name_en || '',
            namePl: item.item_name_pl || '',
            count: 0
          };
        }
        dishCounts[key].count += item.quantity || 0;
      });

      favoriteDishes = Object.values(dishCounts)
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);
    }
  }

  const diningTable = (order as any).dining_tables;
  const formattedOrder = {
    ...order,
    table_number: diningTable ? diningTable.table_number : null
  };

  return (
    <OrderDetailsClient
      order={formattedOrder}
      items={items || []}
      timeline={timeline || []}
      crmStats={crmStats}
      pastOrders={pastOrders}
      favoriteDishes={favoriteDishes}
    />
  );
}
