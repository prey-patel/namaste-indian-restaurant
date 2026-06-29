import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import DeliveryDashboard from '@/components/admin/delivery/delivery-dashboard';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Delivery & Logistics — Namaste Admin',
  robots: { index: false, follow: false },
};

/**
 * Delivery Dashboard Page — Server Component
 * Access: owner, manager, staff are allowed. Other roles or unauthenticated users are redirected.
 */
export default async function DeliveryPage() {
  const supabase = await createClient();

  // 1. Auth check
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect('/admin/login');
  }

  // 2. Role check — owner, manager, staff are allowed
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .single();

  if (!profile || !profile.is_active) {
    redirect('/admin/login');
  }

  const allowedRoles = ['owner', 'manager', 'staff'];
  if (!allowedRoles.includes(profile.role)) {
    redirect('/admin');
  }

  // 3. Load restaurant coordinates and address from system_settings
  const { data: settingsRes } = await supabase
    .from('system_settings')
    .select('key, value');

  const settings = (settingsRes || []).reduce((acc: Record<string, any>, item: { key: string; value: any }) => {
    acc[item.key] = item.value;
    return acc;
  }, {});

  const restaurantAddress = settings.restaurant_address || 'Warszawska 1/3, 06-400 Ciechanów, Poland';
  const restaurantCoords = settings.coordinates || {
    status: 'unverified',
    latitude: 52.880490,
    longitude: 20.612140
  };

  // 4. Load delivery-relevant orders (approved, preparing, ready_for_pickup, out_for_delivery)
  const deliveryStatuses = ['approved', 'preparing', 'ready_for_pickup', 'out_for_delivery'];

  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select(`
      id,
      id_text,
      status,
      order_type,
      customer_name,
      customer_phone,
      customer_email,
      customer_notes,
      delivery_address,
      delivery_postal_code,
      delivery_city,
      delivery_latitude,
      delivery_longitude,
      route_distance_km,
      route_duration_car_minutes,
      route_duration_walk_minutes,
      delivery_fee,
      items_subtotal,
      packaging_total,
      other_charges_total,
      discount_total,
      total_amount,
      payment_method,
      payment_status,
      estimated_time,
      created_at,
      approved_at,
      preparing_at,
      ready_at,
      dispatched_at,
      updated_at
    `)
    .in('status', deliveryStatuses)
    .order('created_at', { ascending: false });

  if (ordersError) {
    console.error('Delivery orders load error:', ordersError);
  }

  // 5. Load order items
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
        kitchen_notes
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

  // 6. Assemble orders with items
  const deliveryOrders = (orders || []).map(order => ({
    ...order,
    items: orderItemsMap[order.id] || [],
  }));

  return (
    <DeliveryDashboard
      initialOrders={deliveryOrders}
      restaurantAddress={restaurantAddress}
      restaurantCoordinates={restaurantCoords}
      userRole={profile.role}
    />
  );
}
