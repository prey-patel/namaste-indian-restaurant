import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export interface MetricValue {
  value: number | null; // null represents "Not enough data"
  count: number;
}

export interface PerformanceKPIs {
  avgPrepTime: MetricValue; // preparing_at to ready_at
  avgConfirmToReadyTime: MetricValue; // approved_at to ready_at
  avgDeliveryFulfillmentTime: MetricValue; // dispatched_at to completed_at
  onTimeRate: MetricValue; // finalization <= estimated_time
  avgResResponseTime: MetricValue; // reservation created_at to first status change
  kdsTakeawayPrepTime: MetricValue; // preparing_at to ready_at
  kdsDeliveryPrepTime: MetricValue; // preparing_at to dispatched_at
  
  // Live operational counts (not date-restricted)
  liveActiveQueueSize: number;
  liveOverdueCount: number;
}

export interface DailyPerformancePoint {
  date: string; // YYYY-MM-DD
  totalOrders: number;
  avgPrepTime: number | null;
  onTimeRate: number | null;
  reservationsConfirmed: number;
  reservationsCancelled: number;
  reservationsNoShow: number;
  flags: string[];
}

export interface PerformanceData {
  kpis: PerformanceKPIs;
  dailyBreakdown: DailyPerformancePoint[];
  reservationsSummary: {
    confirmed: number;
    cancelled: number;
    noShow: number;
    total: number;
  };
}

export async function fetchPerformanceRawData(
  startDateUtc: string,
  endDateUtc: string,
  localStartDate: Date,
  localEndDate: Date
): Promise<PerformanceData> {
  const adminClient = createAdminClient();

  const now = new Date().toISOString();

  // 1. Fetch live metrics (unrestricted by date range)
  const [activeQueueRes, overdueRes] = await Promise.all([
    adminClient
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("status", "preparing"),
    adminClient
      .from("orders")
      .select("id", { count: "exact", head: true })
      .in("status", ["pending", "approved", "preparing", "ready_for_pickup", "out_for_delivery"])
      .lt("estimated_time", now),
  ]);

  const liveActiveQueueSize = activeQueueRes.count || 0;
  const liveOverdueCount = overdueRes.count || 0;

  // 2. Fetch historical cohort data (based on created_at for orders)
  const [ordersRes, reservationsRes] = await Promise.all([
    adminClient
      .from("orders")
      .select("*")
      .gte("created_at", startDateUtc)
      .lte("created_at", endDateUtc),
    adminClient
      .from("reservations")
      .select("*")
      .gte("created_at", startDateUtc)
      .lte("created_at", endDateUtc),
  ]);

  if (ordersRes.error) throw ordersRes.error;
  if (reservationsRes.error) throw reservationsRes.error;

  const orders = ordersRes.data || [];
  const reservations = reservationsRes.data || [];

  // 3. Fetch status transition events for reservation response times
  let reservationEvents: any[] = [];
  const resIds = reservations.map((r) => r.id);
  if (resIds.length > 0) {
    const { data: events, error: eventsErr } = await adminClient
      .from("reservation_status_events")
      .select("*")
      .in("reservation_id", resIds)
      .order("created_at", { ascending: true });
    if (!eventsErr && events) {
      reservationEvents = events;
    }
  }

  // Group events by reservation_id
  const resEventsMap = new Map<string, any[]>();
  reservationEvents.forEach((ev) => {
    const arr = resEventsMap.get(ev.reservation_id) || [];
    arr.push(ev);
    resEventsMap.set(ev.reservation_id, arr);
  });

  // 4. Calculate KPI metrics
  const prepTimeDiffs: number[] = [];
  const confirmToReadyDiffs: number[] = [];
  const deliveryFulfillDiffs: number[] = [];
  const onTimeChecks: boolean[] = [];
  const kdsTakeawayDiffs: number[] = [];
  const kdsDeliveryDiffs: number[] = [];
  const resResponseDiffs: number[] = [];

  // 4a. Process orders
  orders.forEach((o) => {
    // Average Prep Time (ready_at - preparing_at)
    if (o.ready_at && o.preparing_at) {
      const diffMins = (new Date(o.ready_at).getTime() - new Date(o.preparing_at).getTime()) / 60000;
      if (diffMins >= 0) {
        prepTimeDiffs.push(diffMins);
      }
    }

    // Confirmation to Ready (ready_at - approved_at)
    if (o.ready_at && o.approved_at) {
      const diffMins = (new Date(o.ready_at).getTime() - new Date(o.approved_at).getTime()) / 60000;
      if (diffMins >= 0) {
        confirmToReadyDiffs.push(diffMins);
      }
    }

    // Delivery Fulfillment (completed_at - dispatched_at)
    if (o.order_type === "delivery" && o.completed_at && o.dispatched_at) {
      const diffMins = (new Date(o.completed_at).getTime() - new Date(o.dispatched_at).getTime()) / 60000;
      if (diffMins >= 0) {
        deliveryFulfillDiffs.push(diffMins);
      }
    }

    // KDS Takeaway vs Delivery Prep Time
    if (o.order_type === "takeaway" && o.preparing_at && o.ready_at) {
      const diffMins = (new Date(o.ready_at).getTime() - new Date(o.preparing_at).getTime()) / 60000;
      if (diffMins >= 0) {
        kdsTakeawayDiffs.push(diffMins);
      }
    } else if (o.order_type === "delivery" && o.preparing_at && o.dispatched_at) {
      const diffMins = (new Date(o.dispatched_at).getTime() - new Date(o.preparing_at).getTime()) / 60000;
      if (diffMins >= 0) {
        kdsDeliveryDiffs.push(diffMins);
      }
    }

    // On-Time Rate: estimated_time and finalization must exist
    const finalizationTime = o.order_type === "delivery" ? o.completed_at : o.ready_at;
    if (o.estimated_time && finalizationTime) {
      const onTime = new Date(finalizationTime) <= new Date(o.estimated_time);
      onTimeChecks.push(onTime);
    }
  });

  // 4b. Process reservations response time
  reservations.forEach((r) => {
    const evs = resEventsMap.get(r.id) || [];
    // Find the first transition out of pending
    const firstActionEv = evs.find((e) =>
      ["confirmed", "rejected", "cancelled"].includes(e.new_status)
    );

    if (firstActionEv && r.created_at) {
      const diffMins = (new Date(firstActionEv.created_at).getTime() - new Date(r.created_at).getTime()) / 60000;
      if (diffMins >= 0) {
        resResponseDiffs.push(diffMins);
      }
    }
  });

  // Helper to compile metric average or on-time rate safely
  const compileAverage = (diffs: number[]): MetricValue => {
    if (diffs.length < 3) {
      return { value: null, count: diffs.length };
    }
    const sum = diffs.reduce((a, b) => a + b, 0);
    return { value: sum / diffs.length, count: diffs.length };
  };

  const compileRate = (checks: boolean[]): MetricValue => {
    if (checks.length < 3) {
      return { value: null, count: checks.length };
    }
    const onTimeCount = checks.filter((c) => c).length;
    return { value: (onTimeCount / checks.length) * 100, count: checks.length };
  };

  // 5. Build Daily Performance Breakdown Table
  const dailyBreakdownMap = new Map<string, DailyPerformancePoint>();
  const current = new Date(localStartDate);
  const end = new Date(localEndDate);

  while (current <= end) {
    const dateStr = current.toLocaleDateString("en-CA", {
      timeZone: "Europe/Warsaw",
    });
    dailyBreakdownMap.set(dateStr, {
      date: dateStr,
      totalOrders: 0,
      avgPrepTime: null,
      onTimeRate: null,
      reservationsConfirmed: 0,
      reservationsCancelled: 0,
      reservationsNoShow: 0,
      flags: [],
    });
    current.setDate(current.getDate() + 1);
  }

  // Daily grouping helpers
  const dailyPrepDiffs = new Map<string, number[]>();
  const dailyOnTime = new Map<string, boolean[]>();

  // Group orders daily
  orders.forEach((o) => {
    const orderDateStr = new Date(o.created_at).toLocaleDateString("en-CA", {
      timeZone: "Europe/Warsaw",
    });

    const dayPoint = dailyBreakdownMap.get(orderDateStr);
    if (dayPoint) {
      dayPoint.totalOrders += 1;

      // Group prep times daily
      if (o.ready_at && o.preparing_at) {
        const diffMins = (new Date(o.ready_at).getTime() - new Date(o.preparing_at).getTime()) / 60000;
        if (diffMins >= 0) {
          const arr = dailyPrepDiffs.get(orderDateStr) || [];
          arr.push(diffMins);
          dailyPrepDiffs.set(orderDateStr, arr);
        }
      }

      // Group on-time checks daily
      const finalizationTime = o.order_type === "delivery" ? o.completed_at : o.ready_at;
      if (o.estimated_time && finalizationTime) {
        const onTime = new Date(finalizationTime) <= new Date(o.estimated_time);
        const arr = dailyOnTime.get(orderDateStr) || [];
        arr.push(onTime);
        dailyOnTime.set(orderDateStr, arr);
      }
    }
  });

  // Group reservations daily
  let totalConfirmed = 0;
  let totalCancelled = 0;
  let totalNoShow = 0;

  reservations.forEach((r) => {
    const resDateStr = new Date(r.created_at).toLocaleDateString("en-CA", {
      timeZone: "Europe/Warsaw",
    });

    const dayPoint = dailyBreakdownMap.get(resDateStr);
    if (dayPoint) {
      if (r.status === "confirmed" || r.status === "completed") {
        dayPoint.reservationsConfirmed += 1;
        totalConfirmed += 1;
      } else if (r.status === "cancelled") {
        dayPoint.reservationsCancelled += 1;
        totalCancelled += 1;
      } else if (r.status === "no_show") {
        dayPoint.reservationsNoShow += 1;
        totalNoShow += 1;
      }
    }
  });

  // Populate averages and rates per day, applying the 3-record threshold
  dailyBreakdownMap.forEach((point, dateStr) => {
    // Prep time
    const prepDiffs = dailyPrepDiffs.get(dateStr) || [];
    if (prepDiffs.length >= 3) {
      point.avgPrepTime = prepDiffs.reduce((a, b) => a + b, 0) / prepDiffs.length;
    }

    // On-time rate
    const onTimeArr = dailyOnTime.get(dateStr) || [];
    if (onTimeArr.length >= 3) {
      point.onTimeRate = (onTimeArr.filter((c) => c).length / onTimeArr.length) * 100;
    }

    // Compile flags based on metrics
    if (point.totalOrders > 0 && point.totalOrders < 3) {
      point.flags.push("Niski ruch / Low volume");
    }
    if (point.onTimeRate !== null) {
      if (point.onTimeRate === 100) {
        point.flags.push("100% Terminowość / On-time");
      } else if (point.onTimeRate < 70) {
        point.flags.push("Opóźnienia / Delivery delays");
      }
    }
    if (point.avgPrepTime !== null && point.avgPrepTime > 35) {
      point.flags.push("Wolna kuchnia / Slow prep");
    }
  });

  return {
    kpis: {
      avgPrepTime: compileAverage(prepTimeDiffs),
      avgConfirmToReadyTime: compileAverage(confirmToReadyDiffs),
      avgDeliveryFulfillmentTime: compileAverage(deliveryFulfillDiffs),
      onTimeRate: compileRate(onTimeChecks),
      avgResResponseTime: compileAverage(resResponseDiffs),
      kdsTakeawayPrepTime: compileAverage(kdsTakeawayDiffs),
      kdsDeliveryPrepTime: compileAverage(kdsDeliveryDiffs),
      liveActiveQueueSize,
      liveOverdueCount,
    },
    dailyBreakdown: Array.from(dailyBreakdownMap.values()),
    reservationsSummary: {
      confirmed: totalConfirmed,
      cancelled: totalCancelled,
      noShow: totalNoShow,
      total: reservations.length,
    },
  };
}
