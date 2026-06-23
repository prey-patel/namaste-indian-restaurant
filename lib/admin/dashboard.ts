import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getWarsawDateDetails, isTimeBetween } from "@/lib/public/opening-hours";

export interface DashboardData {
  pendingReservations: number;
  todayReservations: number;
  activeOrders: number;
  kdsQueue: number;

  todayRevenue: number;
  yesterdayRevenue: number;
  deliveryCount: number;
  takeawayCount: number;
  totalOrdersToday: number;
  mostPopularItem: {
    namePl: string;
    nameEn: string;
    imageUrl: string | null;
    orderCount: number;
  } | null;
  openingStatus: {
    isOpen: boolean;
    todayOpenTime: string | null;
    todayCloseTime: string | null;
    openedSinceMinutes: number | null;
  };

  salesTrend: { date: string; revenue: number; orders: number }[];
  avgOrderValue: number;
  avgPrepTimeMinutes: number;
  recentActivity: {
    id: string;
    type: 'order_status' | 'reservation_status' | 'admin_action';
    title: string;
    subtitle: string;
    timestamp: string;
    icon: string;
  }[];

  upcomingReservations: {
    id: string;
    time: string;
    customerName: string;
    guestsCount: number;
    customerPhone: string;
    tableNumber: number | null;
  }[];
}

function getWarsawDateString(offsetDays: number = 0): string {
  const offsetDate = new Date();
  offsetDate.setDate(offsetDate.getDate() + offsetDays);
  
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Warsaw",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(offsetDate);
  
  const yr = parts.find(p => p.type === 'year')!.value;
  const mo = parts.find(p => p.type === 'month')!.value;
  const dy = parts.find(p => p.type === 'day')!.value;
  
  return `${yr}-${mo}-${dy}`;
}

function getWarsawOffsetMinutes(dateStr: string): number {
  const temp = new Date(`${dateStr}T12:00:00Z`);
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Warsaw",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
  });
  const parts = formatter.formatToParts(temp);
  const getVal = (type: string) => parseInt(parts.find((p) => p.type === type)!.value);

  const yr = getVal("year");
  const mo = getVal("month") - 1;
  const dy = getVal("day");
  let hr = getVal("hour");
  if (hr === 24) hr = 0;
  const mn = getVal("minute");
  const sc = getVal("second");

  const warsawTimeUtc = Date.UTC(yr, mo, dy, hr, mn, sc);
  return (warsawTimeUtc - temp.getTime()) / 60000;
}

function getUtcBoundsForWarsawDate(dateStr: string) {
  const offset = getWarsawOffsetMinutes(dateStr);
  const start = new Date(new Date(`${dateStr}T00:00:00.000Z`).getTime() - offset * 60000).toISOString();
  const end = new Date(new Date(`${dateStr}T23:59:59.999Z`).getTime() - offset * 60000).toISOString();
  return { start, end };
}

function getOrderIconKey(status: string): string {
  switch (status) {
    case 'pending': return 'orderPending';
    case 'approved': return 'orderApproved';
    case 'preparing': return 'orderPreparing';
    case 'ready_for_pickup': return 'orderReady';
    case 'out_for_delivery': return 'orderDelivery';
    case 'completed': return 'orderCompleted';
    case 'rejected': return 'orderRejected';
    case 'cancelled': return 'orderCancelled';
    default: return 'orderPending';
  }
}

function getReservationIconKey(status: string): string {
  switch (status) {
    case 'pending': return 'resPending';
    case 'confirmed': return 'resConfirmed';
    case 'rejected': return 'resRejected';
    case 'cancelled': return 'resCancelled';
    case 'completed': return 'resCompleted';
    case 'no_show': return 'resNoShow';
    default: return 'resPending';
  }
}

export async function fetchDashboardData(locale: string = 'pl'): Promise<DashboardData> {
  const adminClient = createAdminClient();

  const todayStr = getWarsawDateString(0);
  const yesterdayStr = getWarsawDateString(-1);

  const todayBounds = getUtcBoundsForWarsawDate(todayStr);
  const yesterdayBounds = getUtcBoundsForWarsawDate(yesterdayStr);

  const last7DaysStrings: string[] = [];
  for (let i = 6; i >= 0; i--) {
    last7DaysStrings.push(getWarsawDateString(-i));
  }
  const trendBounds = {
    start: getUtcBoundsForWarsawDate(last7DaysStrings[0]).start,
    end: getUtcBoundsForWarsawDate(last7DaysStrings[6]).end
  };

  // Run all queries in parallel
  const [
    pendingRes,
    todayResCount,
    activeOrd,
    kdsQueueCount,
    todayOrders,
    yesterdayOrders,
    trendOrders,
    todayOrderItems,
    upcomingReservations,
    orderStatusEvents,
    resStatusEvents,
    adminActivityLogs,
    serviceHoursRes,
    opStatusRes,
    holidayRes
  ] = await Promise.all([
    // 1. Pending reservations
    adminClient
      .from('reservations')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending'),

    // 2. Today's reservations count
    adminClient
      .from('reservations')
      .select('id', { count: 'exact', head: true })
      .gte('reservation_start_at', todayBounds.start)
      .lte('reservation_start_at', todayBounds.end)
      .in('status', ['pending', 'confirmed']),

    // 3. Active orders count
    adminClient
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .in('status', ['pending', 'approved', 'preparing', 'ready_for_pickup', 'out_for_delivery']),

    // 4. KDS queue count
    adminClient
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'preparing'),

    // 5. Today's orders
    adminClient
      .from('orders')
      .select('*')
      .gte('created_at', todayBounds.start)
      .lte('created_at', todayBounds.end),

    // 6. Yesterday's orders
    adminClient
      .from('orders')
      .select('total_amount, status, payment_status')
      .gte('created_at', yesterdayBounds.start)
      .lte('created_at', yesterdayBounds.end),

    // 7. Last 7 days orders (for sales trend)
    adminClient
      .from('orders')
      .select('created_at, total_amount, status, payment_status')
      .gte('created_at', trendBounds.start)
      .lte('created_at', trendBounds.end),

    // 8. Today's order items
    adminClient
      .from('order_items')
      .select(`
        quantity,
        menu_item_id,
        item_name_en,
        item_name_pl,
        line_total,
        orders!inner (
          created_at,
          status,
          payment_status
        )
      `)
      .gte('orders.created_at', todayBounds.start)
      .lte('orders.created_at', todayBounds.end),

    // 9. Upcoming reservations
    adminClient
      .from('reservations')
      .select('id, reservation_start_at, customer_name, guests_count, customer_phone, table_number')
      .gte('reservation_start_at', todayBounds.start)
      .lte('reservation_start_at', todayBounds.end)
      .in('status', ['pending', 'confirmed'])
      .order('reservation_start_at', { ascending: true })
      .limit(5),

    // 10. Order status events (last 10)
    adminClient
      .from('order_status_events')
      .select(`
        id,
        created_at,
        new_status,
        orders (
          customer_name
        )
      `)
      .order('created_at', { ascending: false })
      .limit(10),

    // 11. Reservation status events (last 10)
    adminClient
      .from('reservation_status_events')
      .select(`
        id,
        created_at,
        new_status,
        reservations (
          customer_name
        )
      `)
      .order('created_at', { ascending: false })
      .limit(10),

    // 12. Admin activity logs (last 10)
    adminClient
      .from('admin_activity_logs')
      .select(`
        id,
        created_at,
        action,
        profiles (
          full_name
        )
      `)
      .order('created_at', { ascending: false })
      .limit(10),

    // 13. Service hours
    adminClient
      .from('service_hours')
      .select('*')
      .in('service_type', ['dine_in', 'delivery'])
      .order('day_of_week', { ascending: true })
      .order('display_order', { ascending: true }),

    // 14. Operational status
    adminClient
      .from('operational_status')
      .select('*')
      .maybeSingle(),

    // 15. Holiday closures
    adminClient
      .from('holiday_closures')
      .select('*')
      .eq('date', todayStr)
      .eq('is_closed', true)
      .maybeSingle()
  ]);

  if (todayOrders.error) throw todayOrders.error;
  if (yesterdayOrders.error) throw yesterdayOrders.error;
  if (trendOrders.error) throw trendOrders.error;
  if (todayOrderItems.error) throw todayOrderItems.error;
  if (upcomingReservations.error) throw upcomingReservations.error;

  const todayOrdersData = todayOrders.data || [];
  const yesterdayOrdersData = yesterdayOrders.data || [];
  const trendOrdersData = trendOrders.data || [];
  const todayOrderItemsData = (todayOrderItems.data as any[]) || [];
  const upcomingResData = upcomingReservations.data || [];

  // Calculate today's revenue
  let todayRevenue = 0;
  let todayPaidCompletedCount = 0;
  let deliveryCount = 0;
  let takeawayCount = 0;
  let totalPrepTimeSum = 0;
  let totalPrepTimeCount = 0;

  todayOrdersData.forEach(o => {
    if (o.status === 'completed' && o.payment_status === 'paid') {
      todayRevenue += o.total_amount || 0;
      todayPaidCompletedCount++;
    }

    if (o.order_type === 'delivery') {
      deliveryCount++;
    } else if (o.order_type === 'takeaway') {
      takeawayCount++;
    }

    if (o.preparing_at && o.ready_at) {
      const prepTime = (new Date(o.ready_at).getTime() - new Date(o.preparing_at).getTime()) / 60000;
      if (prepTime > 0) {
        totalPrepTimeSum += prepTime;
        totalPrepTimeCount++;
      }
    }
  });

  // Calculate yesterday's revenue
  let yesterdayRevenue = 0;
  yesterdayOrdersData.forEach(o => {
    if (o.status === 'completed' && o.payment_status === 'paid') {
      yesterdayRevenue += o.total_amount || 0;
    }
  });

  // Calculate most popular item
  const popularItemMap = new Map<string, { namePl: string; nameEn: string; qty: number }>();
  todayOrderItemsData.forEach(item => {
    const orders = item.orders;
    if (orders && orders.status === 'completed' && orders.payment_status === 'paid') {
      const itemId = item.menu_item_id;
      if (!itemId) return;
      const existing = popularItemMap.get(itemId);
      const qty = item.quantity || 0;
      if (existing) {
        existing.qty += qty;
      } else {
        popularItemMap.set(itemId, {
          namePl: item.item_name_pl || 'Nieznany produkt',
          nameEn: item.item_name_en || 'Unknown Item',
          qty
        });
      }
    }
  });

  let mostPopularItem: DashboardData['mostPopularItem'] = null;
  let maxQty = 0;
  let mostPopularItemId = '';

  for (const [id, val] of popularItemMap.entries()) {
    if (val.qty > maxQty) {
      maxQty = val.qty;
      mostPopularItem = {
        namePl: val.namePl,
        nameEn: val.nameEn,
        imageUrl: null,
        orderCount: val.qty
      };
      mostPopularItemId = id;
    }
  }

  // Fetch the image URL of the most popular item
  if (mostPopularItemId) {
    const { data: itemMeta } = await adminClient
      .from('menu_items')
      .select('image_url')
      .eq('id', mostPopularItemId)
      .single();
    if (itemMeta && itemMeta.image_url && mostPopularItem) {
      mostPopularItem.imageUrl = itemMeta.image_url;
    }
  }

  // Calculate opening status
  const { dayOfWeek, timeString } = getWarsawDateDetails();
  const serviceHours = (serviceHoursRes.data || []) as any[];
  const opStatus = opStatusRes.data as any;
  const holiday = holidayRes.data as any;
  
  let isOpen = false;
  let todayOpenTime: string | null = null;
  let todayCloseTime: string | null = null;
  let openedSinceMinutes: number | null = null;

  let opStatusDineInOpen = true;
  if (opStatus && opStatus.dine_in_status === 'closed') {
    opStatusDineInOpen = false;
  }

  let holidayClosed = false;
  let customOpen: string | null = null;
  let customClose: string | null = null;
  if (holiday) {
    const affected = holiday.affected_service === 'all' || holiday.affected_service === 'dine_in';
    if (affected) {
      if (holiday.is_closed) {
        holidayClosed = true;
      } else if (holiday.custom_open_time && holiday.custom_close_time) {
        customOpen = holiday.custom_open_time.slice(0, 5);
        customClose = holiday.custom_close_time.slice(0, 5);
      }
    }
  }

  if (!opStatusDineInOpen || holidayClosed) {
    isOpen = false;
  } else if (customOpen && customClose) {
    isOpen = isTimeBetween(timeString, customOpen, customClose);
    todayOpenTime = customOpen;
    todayCloseTime = customClose;
  } else {
    // Normal hours
    const slots = serviceHours.filter(h => h.service_type === 'dine_in' && h.day_of_week === dayOfWeek && !h.is_closed);
    if (slots.length > 0) {
      slots.sort((a, b) => a.slot_number - b.slot_number);
      todayOpenTime = slots[0].open_time.slice(0, 5);
      todayCloseTime = slots[slots.length - 1].close_time.slice(0, 5);
      isOpen = slots.some(s => isTimeBetween(timeString, s.open_time, s.close_time));
    }
  }

  if (isOpen && todayOpenTime) {
    const [openH, openM] = todayOpenTime.split(':').map(Number);
    const [currH, currM] = timeString.slice(0, 5).split(':').map(Number);
    
    const openMinutes = openH * 60 + openM;
    const currMinutes = currH * 60 + currM;
    if (currMinutes >= openMinutes) {
      openedSinceMinutes = currMinutes - openMinutes;
    } else {
      openedSinceMinutes = (24 * 60 - openMinutes) + currMinutes;
    }
  }

  // Calculate Sales Trend (Last 7 days)
  const salesTrendMap = new Map<string, { date: string; revenue: number; orders: number }>();
  last7DaysStrings.forEach(dStr => {
    salesTrendMap.set(dStr, { date: dStr, revenue: 0, orders: 0 });
  });

  trendOrdersData.forEach(o => {
    if (o.status === 'completed' && o.payment_status === 'paid') {
      const orderDateStr = new Date(o.created_at).toLocaleDateString("en-CA", {
        timeZone: "Europe/Warsaw",
      });
      const point = salesTrendMap.get(orderDateStr);
      if (point) {
        point.revenue += Number(o.total_amount) || 0;
        point.orders += 1;
      }
    }
  });

  const salesTrend = Array.from(salesTrendMap.values());

  const avgOrderValue = todayPaidCompletedCount > 0 ? todayRevenue / todayPaidCompletedCount : 0;
  const avgPrepTimeMinutes = totalPrepTimeCount > 0 ? totalPrepTimeSum / totalPrepTimeCount : 0;

  // Process Recent Activity (Combine last 10 order, reservation, and admin events)
  const combinedActivities: any[] = [];

  const orderEvents = orderStatusEvents.data || [];
  orderEvents.forEach(evt => {
    combinedActivities.push({
      id: evt.id,
      type: 'order_status',
      newStatus: evt.new_status,
      timestamp: evt.created_at,
      customerName: (evt.orders as any)?.customer_name || 'Klient'
    });
  });

  const resEvents = resStatusEvents.data || [];
  resEvents.forEach(evt => {
    combinedActivities.push({
      id: evt.id,
      type: 'reservation_status',
      newStatus: evt.new_status,
      timestamp: evt.created_at,
      customerName: (evt.reservations as any)?.customer_name || 'Klient'
    });
  });

  const adminLogs = adminActivityLogs.data || [];
  adminLogs.forEach(evt => {
    combinedActivities.push({
      id: evt.id,
      type: 'admin_action',
      action: evt.action,
      timestamp: evt.created_at,
      adminName: (evt.profiles as any)?.full_name || 'Admin'
    });
  });

  combinedActivities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const slicedActivities = combinedActivities.slice(0, 10);

  const recentActivity = slicedActivities.map(evt => {
    let title = '';
    let subtitle = '';
    let icon = '';

    if (evt.type === 'order_status') {
      title = evt.newStatus;
      subtitle = evt.customerName;
      icon = getOrderIconKey(evt.newStatus);
    } else if (evt.type === 'reservation_status') {
      title = evt.newStatus;
      subtitle = evt.customerName;
      icon = getReservationIconKey(evt.newStatus);
    } else {
      title = evt.adminName;
      subtitle = evt.action;
      icon = 'admin_action';
    }

    return {
      id: evt.id,
      type: evt.type as 'order_status' | 'reservation_status' | 'admin_action',
      title,
      subtitle,
      timestamp: evt.timestamp,
      icon
    };
  });

  const formattedUpcoming = upcomingResData.map((res: any) => {
    const timeParts = new Date(res.reservation_start_at).toLocaleTimeString('pl-PL', {
      timeZone: 'Europe/Warsaw',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    return {
      id: res.id,
      time: timeParts,
      customerName: res.customer_name,
      guestsCount: res.guests_count || 0,
      customerPhone: res.customer_phone,
      tableNumber: res.table_number
    };
  });

  return {
    pendingReservations: pendingRes.count || 0,
    todayReservations: todayResCount.count || 0,
    activeOrders: activeOrd.count || 0,
    kdsQueue: kdsQueueCount.count || 0,

    todayRevenue,
    yesterdayRevenue,
    deliveryCount,
    takeawayCount,
    totalOrdersToday: todayOrdersData.length,
    mostPopularItem,
    openingStatus: {
      isOpen,
      todayOpenTime,
      todayCloseTime,
      openedSinceMinutes
    },
    salesTrend,
    avgOrderValue,
    avgPrepTimeMinutes,
    recentActivity,
    upcomingReservations: formattedUpcoming
  };
}
