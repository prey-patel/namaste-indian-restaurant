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
    .select('*')
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

  return (
    <OrderDetailsClient
      order={order}
      items={items || []}
      timeline={timeline || []}
    />
  );
}
