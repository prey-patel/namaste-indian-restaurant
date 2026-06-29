import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import DeliveryDispatchBoard from '@/components/admin/delivery/delivery-dispatch-board';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Delivery Dispatch — Namaste Admin',
  robots: { index: false, follow: false },
};

/**
 * Delivery Dispatch Dashboard — Server Component
 * Access: owner, manager, staff only.
 * Loads initial delivery-relevant orders and passes to DeliveryDispatchBoard client component.
 */
export default async function DeliveryPage() {
  const supabase = await createClient();

  // 1. Auth check
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect('/admin/login');
  }

  // 2. Role check — owner, manager, staff only
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_active, full_name')
    .eq('id', user.id)
    .single();

  if (!profile || !profile.is_active) {
    redirect('/admin/login');
  }

  const allowedRoles = ['owner', 'manager', 'staff'];
  if (!allowedRoles.includes(profile.role)) {
    redirect('/admin');
  }

  // 3. Load delivery orders: ready_for_pickup (delivery type), out_for_delivery, and today's completed deliveries
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  // Fetch active delivery orders (ready_for_pickup + out_for_delivery)
  const { data: activeOrders, error: activeError } = await supabase
    .from('orders')
    .select(`
      id, status, order_type,
      customer_name, customer_email, customer_phone, customer_notes,
      delivery_address, delivery_postal_code, delivery_city,
      delivery_fee, items_subtotal, packaging_total, total_amount,
      payment_method, payment_status, token,
      estimated_time,
      delivery_distance_car_meters, delivery_duration_car_seconds,
      created_at, updated_at, approved_at, preparing_at, ready_at, dispatched_at, completed_at
    `)
    .in('status', ['ready_for_pickup', 'out_for_delivery'])
    .eq('order_type', 'delivery')
    .order('ready_at', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true });

  if (activeError) {
    console.error('Delivery active orders load error:', activeError);
  }

  // Fetch today's completed delivery orders (last 50)
  const { data: completedOrders, error: completedError } = await supabase
    .from('orders')
    .select(`
      id, status, order_type,
      customer_name, customer_email, customer_phone, customer_notes,
      delivery_address, delivery_postal_code, delivery_city,
      delivery_fee, items_subtotal, packaging_total, total_amount,
      payment_method, payment_status, token,
      estimated_time,
      delivery_distance_car_meters, delivery_duration_car_seconds,
      created_at, updated_at, approved_at, preparing_at, ready_at, dispatched_at, completed_at
    `)
    .eq('status', 'completed')
    .eq('order_type', 'delivery')
    .gte('completed_at', todayStart.toISOString())
    .order('completed_at', { ascending: false })
    .limit(50);

  if (completedError) {
    console.error('Delivery completed orders load error:', completedError);
  }

  const allOrders = [...(activeOrders || []), ...(completedOrders || [])];

  // 4. Load order items for all loaded orders
  const orderIds = allOrders.map(o => o.id);
  let orderItemsMap: Record<string, any[]> = {};

  if (orderIds.length > 0) {
    const { data: items, error: itemsError } = await supabase
      .from('order_items')
      .select(`
        id, order_id,
        item_name_pl, item_name_en,
        quantity, unit_price,
        customer_notes, kitchen_notes,
        allergens_snapshot, spice_level_snapshot
      `)
      .in('order_id', orderIds);

    if (itemsError) {
      console.error('Delivery items load error:', itemsError);
    }

    (items || []).forEach(item => {
      if (!orderItemsMap[item.order_id]) {
        orderItemsMap[item.order_id] = [];
      }
      orderItemsMap[item.order_id].push(item);
    });
  }

  // 5. Load restaurant coordinates from system_settings for distance context
  const { data: settings } = await supabase
    .from('system_settings')
    .select('key, value')
    .in('key', ['restaurant_coordinates', 'restaurant_address']);

  const restaurantAddress = settings?.find(s => s.key === 'restaurant_address')?.value || '';

  // 6. Assemble order data with items
  const deliveryOrders = allOrders.map(order => ({
    ...order,
    items: orderItemsMap[order.id] || [],
  }));

  return (
    <DeliveryDispatchBoard
      initialOrders={deliveryOrders}
      userRole={profile.role}
      userName={profile.full_name || 'Driver'}
      restaurantAddress={typeof restaurantAddress === 'string' ? restaurantAddress : ''}
    />
  );
}
