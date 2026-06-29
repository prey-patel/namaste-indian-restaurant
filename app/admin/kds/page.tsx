import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import KdsBoard from '@/components/admin/kds/kds-board';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Kitchen Display System — Namaste Admin',
  robots: { index: false, follow: false },
};

/**
 * KDS Page — Server Component
 * Access: owner, manager, kitchen only. Staff and public are blocked.
 * Loads initial kitchen-relevant orders and passes to KdsBoard client component.
 */
export default async function KdsPage() {
  const supabase = await createClient();

  // 1. Auth check
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect('/admin/login');
  }

  // 2. Role check — owner, manager, kitchen only
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_active, full_name')
    .eq('id', user.id)
    .single();

  if (!profile || !profile.is_active) {
    redirect('/admin/login');
  }

  const allowedRoles = ['owner', 'manager', 'kitchen'];
  if (!allowedRoles.includes(profile.role)) {
    redirect('/admin');
  }

  // 3. Load kitchen-relevant orders (approved, preparing only - ready orders go to delivery dashboard)
  const kitchenStatuses = ['approved', 'preparing'];

  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select(`
      id,
      status,
      order_type,
      customer_name,
      customer_notes,
      estimated_time,
      payment_method,
      created_at,
      approved_at,
      preparing_at,
      ready_at,
      dispatched_at,
      updated_at
    `)
    .in('status', kitchenStatuses)
    .order('approved_at', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true });

  if (ordersError) {
    console.error('KDS orders load error:', ordersError);
  }

  // 4. Load order items for all kitchen orders
  const orderIds = (orders || []).map(o => o.id);
  let orderItemsMap: Record<string, any[]> = {};

  if (orderIds.length > 0) {
    const { data: items, error: itemsError } = await supabase
      .from('order_items')
      .select(`
        id,
        order_id,
        item_name_pl,
        item_name_en,
        quantity,
        customer_notes,
        kitchen_notes,
        allergens_snapshot,
        spice_level_snapshot
      `)
      .in('order_id', orderIds);

    if (itemsError) {
      console.error('KDS items load error:', itemsError);
    }

    // Group items by order_id
    (items || []).forEach(item => {
      if (!orderItemsMap[item.order_id]) {
        orderItemsMap[item.order_id] = [];
      }
      orderItemsMap[item.order_id].push(item);
    });
  }

  // 5. Assemble order data with items
  const kdsOrders = (orders || []).map(order => ({
    ...order,
    // Only expose first name for kitchen privacy
    customer_first_name: order.customer_name ? order.customer_name.split(' ')[0] : '',
    items: orderItemsMap[order.id] || [],
  }));

  return (
    <KdsBoard
      initialOrders={kdsOrders}
      userRole={profile.role}
    />
  );
}
