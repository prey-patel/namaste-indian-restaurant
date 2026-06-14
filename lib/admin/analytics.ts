import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export interface AnalyticsKPIs {
  revenue: number;
  subtotal: number;
  deliveryFees: number;
  packagingFees: number;
  discounts: number;
  ordersCount: number;
  aov: number;
  activeOrdersCount: number;
  reservationsCount: number;
  guestsCount: number;
}

export interface DailyTrendPoint {
  date: string; // YYYY-MM-DD
  revenue: number;
  ordersCount: number;
  reservationsCount: number;
  guestsCount: number;
}

export interface PopularItem {
  id: string;
  nameEn: string;
  namePl: string;
  quantity: number;
  revenue: number;
  categoryNameEn: string;
  categoryNamePl: string;
}

export interface CategoryBreakdown {
  id: string;
  nameEn: string;
  namePl: string;
  revenue: number;
  quantity: number;
}

export interface OrderTypeSplit {
  type: "delivery" | "takeaway";
  count: number;
  revenue: number;
}

export interface ReservationSourceSplit {
  source: string;
  count: number;
}

export interface ReservationStatusSplit {
  status: string;
  count: number;
}

export interface AnalyticsData {
  kpis: AnalyticsKPIs;
  dailyTrend: DailyTrendPoint[];
  popularItems: PopularItem[];
  categoryBreakdown: CategoryBreakdown[];
  orderTypes: OrderTypeSplit[];
  reservationSources: ReservationSourceSplit[];
  reservationStatuses: ReservationStatusSplit[];
}

export async function fetchAnalyticsRawData(
  startDateUtc: string,
  endDateUtc: string,
  localStartDate: Date,
  localEndDate: Date
): Promise<AnalyticsData> {
  const adminClient = createAdminClient();

  // 1. Fetch orders in parallel with reservations, items, and categories metadata
  const [ordersRes, reservationsRes, orderItemsRes, menuItemsRes, categoriesRes] = await Promise.all([
    adminClient
      .from("orders")
      .select("*")
      .gte("created_at", startDateUtc)
      .lte("created_at", endDateUtc),
    adminClient
      .from("reservations")
      .select("*")
      .gte("reservation_start_at", startDateUtc)
      .lte("reservation_start_at", endDateUtc),
    adminClient
      .from("order_items")
      .select(`
        id,
        order_id,
        menu_item_id,
        item_name_en,
        item_name_pl,
        unit_price,
        quantity,
        line_total,
        orders!inner (
          status,
          payment_status,
          created_at
        )
      `)
      .gte("orders.created_at", startDateUtc)
      .lte("orders.created_at", endDateUtc),
    adminClient.from("menu_items").select("id, category_id, name_en, name_pl"),
    adminClient.from("categories").select("id, name_en, name_pl"),
  ]);

  if (ordersRes.error) throw ordersRes.error;
  if (reservationsRes.error) throw reservationsRes.error;
  if (orderItemsRes.error) throw orderItemsRes.error;

  const orders = ordersRes.data || [];
  const reservations = reservationsRes.data || [];
  const orderItems = (orderItemsRes.data as any[]) || [];
  
  const menuItemsMap = new Map(
    (menuItemsRes.data || []).map((item) => [item.id, item])
  );
  const categoriesMap = new Map(
    (categoriesRes.data || []).map((cat) => [cat.id, cat])
  );

  // 2. Generate complete daily list in Europe/Warsaw
  const trendMap = new Map<string, DailyTrendPoint>();
  const current = new Date(localStartDate);
  const end = new Date(localEndDate);

  while (current <= end) {
    const dateStr = current.toLocaleDateString("en-CA", {
      timeZone: "Europe/Warsaw",
    });
    trendMap.set(dateStr, {
      date: dateStr,
      revenue: 0,
      ordersCount: 0,
      reservationsCount: 0,
      guestsCount: 0,
    });
    current.setDate(current.getDate() + 1);
  }

  // 3. Process Orders for KPIs and Daily Trend
  let completedPaidRevenue = 0;
  let completedPaidSubtotal = 0;
  let completedPaidDelivery = 0;
  let completedPaidPackaging = 0;
  let completedPaidDiscounts = 0;
  let completedPaidCount = 0;
  let activeCount = 0;

  const activeStatuses = [
    "pending",
    "approved",
    "preparing",
    "ready_for_pickup",
    "out_for_delivery",
  ];

  orders.forEach((o) => {
    const orderDateStr = new Date(o.created_at).toLocaleDateString("en-CA", {
      timeZone: "Europe/Warsaw",
    });

    if (activeStatuses.includes(o.status)) {
      activeCount++;
    }

    if (o.status === "completed" && o.payment_status === "paid") {
      completedPaidCount++;
      completedPaidRevenue += o.total_amount || 0;
      completedPaidSubtotal += o.items_subtotal || 0;
      completedPaidDelivery += o.delivery_fee || 0;
      completedPaidPackaging += o.packaging_total || 0;
      completedPaidDiscounts += o.discount_total || 0;

      // Add to daily trend if within our range
      const point = trendMap.get(orderDateStr);
      if (point) {
        point.revenue += o.total_amount || 0;
        point.ordersCount += 1;
      }
    }
  });

  // 4. Process Reservations for KPIs and Daily Trend
  let totalReservations = reservations.length;
  let totalGuests = 0;

  reservations.forEach((r) => {
    const resDateStr = new Date(r.reservation_start_at).toLocaleDateString("en-CA", {
      timeZone: "Europe/Warsaw",
    });

    const isCancelledOrRejected = ["cancelled", "rejected"].includes(r.status);
    if (!isCancelledOrRejected) {
      totalGuests += r.guests_count || 0;
    }

    const point = trendMap.get(resDateStr);
    if (point) {
      point.reservationsCount += 1;
      if (!isCancelledOrRejected) {
        point.guestsCount += r.guests_count || 0;
      }
    }
  });

  // 5. Popular Items & Category performance calculations (from completed & paid orders only)
  const itemsBreakdownMap = new Map<string, { qty: number; rev: number; item: any }>();
  const catBreakdownMap = new Map<string, { qty: number; rev: number; cat: any }>();

  orderItems.forEach((oi) => {
    // Check if the order is completed and paid
    const ord = oi.orders;
    if (ord && ord.status === "completed" && ord.payment_status === "paid") {
      // 1. Popular Items
      const existingItem = itemsBreakdownMap.get(oi.menu_item_id);
      const qty = oi.quantity || 0;
      const rev = oi.line_total || 0;

      if (existingItem) {
        existingItem.qty += qty;
        existingItem.rev += rev;
      } else {
        itemsBreakdownMap.set(oi.menu_item_id, {
          qty,
          rev,
          item: {
            id: oi.menu_item_id,
            nameEn: oi.item_name_en,
            namePl: oi.item_name_pl,
          },
        });
      }

      // 2. Categories
      const menuItem = menuItemsMap.get(oi.menu_item_id);
      if (menuItem) {
        const catId = menuItem.category_id;
        const category = categoriesMap.get(catId);
        if (category) {
          const existingCat = catBreakdownMap.get(catId);
          if (existingCat) {
            existingCat.qty += qty;
            existingCat.rev += rev;
          } else {
            catBreakdownMap.set(catId, {
              qty,
              rev,
              cat: category,
            });
          }
        }
      }
    }
  });

  // Format popular items
  const popularItems: PopularItem[] = Array.from(itemsBreakdownMap.values())
    .map(({ qty, rev, item }) => {
      const mi = menuItemsMap.get(item.id);
      const catId = mi?.category_id;
      const category = catId ? categoriesMap.get(catId) : null;
      return {
        id: item.id,
        nameEn: item.nameEn || "Unknown Item",
        namePl: item.namePl || "Nieznany produkt",
        quantity: qty,
        revenue: rev,
        categoryNameEn: category?.name_en || "Uncategorized",
        categoryNamePl: category?.name_pl || "Bez kategorii",
      };
    })
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  // Format categories
  const categoryBreakdown: CategoryBreakdown[] = Array.from(catBreakdownMap.values()).map(
    ({ qty, rev, cat }) => ({
      id: cat.id,
      nameEn: cat.name_en,
      namePl: cat.name_pl,
      revenue: rev,
      quantity: qty,
    })
  ).sort((a, b) => b.revenue - a.revenue);

  // 6. Order Type split
  const typeMap = new Map<"delivery" | "takeaway", { count: number; rev: number }>();
  typeMap.set("delivery", { count: 0, rev: 0 });
  typeMap.set("takeaway", { count: 0, rev: 0 });

  orders.forEach((o) => {
    if (o.status === "completed" && o.payment_status === "paid") {
      const type = o.order_type as "delivery" | "takeaway";
      if (typeMap.has(type)) {
        const currentVal = typeMap.get(type)!;
        currentVal.count += 1;
        currentVal.rev += o.total_amount || 0;
      }
    }
  });

  const orderTypes: OrderTypeSplit[] = Array.from(typeMap.entries()).map(([type, val]) => ({
    type,
    count: val.count,
    revenue: val.rev,
  }));

  // 7. Reservations split by source and status
  const sourceMap = new Map<string, number>();
  const statusMap = new Map<string, number>();

  reservations.forEach((r) => {
    sourceMap.set(r.source, (sourceMap.get(r.source) || 0) + 1);
    statusMap.set(r.status, (statusMap.get(r.status) || 0) + 1);
  });

  const reservationSources: ReservationSourceSplit[] = Array.from(sourceMap.entries()).map(
    ([source, count]) => ({ source, count })
  );

  const reservationStatuses: ReservationStatusSplit[] = Array.from(statusMap.entries()).map(
    ([status, count]) => ({ status, count })
  );

  const dailyTrend = Array.from(trendMap.values());

  const aov = completedPaidCount > 0 ? completedPaidRevenue / completedPaidCount : 0;

  return {
    kpis: {
      revenue: completedPaidRevenue,
      subtotal: completedPaidSubtotal,
      deliveryFees: completedPaidDelivery,
      packagingFees: completedPaidPackaging,
      discounts: completedPaidDiscounts,
      ordersCount: completedPaidCount,
      aov,
      activeOrdersCount: activeCount,
      reservationsCount: totalReservations,
      guestsCount: totalGuests,
    },
    dailyTrend,
    popularItems,
    categoryBreakdown,
    orderTypes,
    reservationSources,
    reservationStatuses,
  };
}
