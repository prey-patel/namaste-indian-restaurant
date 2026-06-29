'use client';

import React, { useState, useEffect, useRef, useCallback, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import {
  Truck, Phone, MapPin, Clock, Package, CheckCircle2, Navigation,
  Wifi, WifiOff, AlertTriangle, CreditCard, Banknote, Timer,
  ChevronRight, Home, User, Bell, Volume2, VolumeX
} from 'lucide-react';
import { acceptDeliveryAction, completeOrderAction } from '@/app/admin/orders/actions';

// ─── Types ────────────────────────────────────────────────────────────────
type DeliveryOrderItem = {
  id: string;
  order_id: string;
  item_name_pl: string;
  item_name_en: string;
  quantity: number;
  unit_price: number;
  customer_notes: string | null;
  kitchen_notes: string | null;
  allergens_snapshot: string[];
  spice_level_snapshot: number;
};

type DeliveryOrder = {
  id: string;
  status: string;
  order_type: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_notes: string | null;
  delivery_address: string | null;
  delivery_postal_code: string | null;
  delivery_city: string | null;
  delivery_fee: number;
  items_subtotal: number;
  packaging_total: number;
  total_amount: number;
  payment_method: string;
  payment_status: string;
  token: string;
  estimated_time: string | null;
  delivery_distance_car_meters: number | null;
  delivery_duration_car_seconds: number | null;
  created_at: string;
  updated_at: string;
  approved_at: string | null;
  preparing_at: string | null;
  ready_at: string | null;
  dispatched_at: string | null;
  completed_at: string | null;
  items: DeliveryOrderItem[];
};

type Props = {
  initialOrders: DeliveryOrder[];
  userRole: string;
  userName: string;
  restaurantAddress: string;
};

// ─── Elapsed Timer Hook ──────────────────────────────────────────────────
function useElapsedTimer(startTime: string | null): string {
  const [elapsed, setElapsed] = useState('');

  useEffect(() => {
    if (!startTime) { setElapsed(''); return; }

    const update = () => {
      const diffMs = Date.now() - new Date(startTime).getTime();
      if (diffMs < 0) { setElapsed('0m'); return; }
      const mins = Math.floor(diffMs / 60000);
      if (mins < 60) {
        setElapsed(`${mins}m`);
      } else {
        const hrs = Math.floor(mins / 60);
        setElapsed(`${hrs}h ${mins % 60}m`);
      }
    };

    update();
    const interval = setInterval(update, 15000);
    return () => clearInterval(interval);
  }, [startTime]);

  return elapsed;
}

// ─── Live Delivery Timer Component ───────────────────────────────────────
function DeliveryTimer({ dispatchedAt }: { dispatchedAt: string | null }) {
  const [time, setTime] = useState({ mins: 0, secs: 0 });

  useEffect(() => {
    if (!dispatchedAt) return;

    const update = () => {
      const diffMs = Date.now() - new Date(dispatchedAt).getTime();
      const totalSecs = Math.max(0, Math.floor(diffMs / 1000));
      setTime({ mins: Math.floor(totalSecs / 60), secs: totalSecs % 60 });
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [dispatchedAt]);

  if (!dispatchedAt) return null;

  const isLong = time.mins >= 45;
  const isWarning = time.mins >= 30 && time.mins < 45;

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-mono text-sm font-bold tabular-nums ${
      isLong ? 'bg-red-500/15 text-red-400 ring-1 ring-red-500/30' :
      isWarning ? 'bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30' :
      'bg-blue-500/15 text-blue-300 ring-1 ring-blue-500/30'
    }`}>
      <Timer className="w-3.5 h-3.5" />
      <span>{String(time.mins).padStart(2, '0')}:{String(time.secs).padStart(2, '0')}</span>
    </div>
  );
}

// ─── Format Helpers ──────────────────────────────────────────────────────
function formatTime(dateStr: string | null) {
  if (!dateStr) return '--:--';
  return new Date(dateStr).toLocaleTimeString('en-GB', {
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Europe/Warsaw'
  });
}

function formatDistance(meters: number | null) {
  if (!meters) return null;
  if (meters < 1000) return `${meters}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

function formatDriveTime(seconds: number | null) {
  if (!seconds) return null;
  const mins = Math.round(seconds / 60);
  return `${mins} min`;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('pl-PL', {
    style: 'currency', currency: 'PLN', minimumFractionDigits: 2
  }).format(amount);
}

function getOrderRef(id: string) {
  return `#${id.slice(-6).toUpperCase()}`;
}

function getFullAddress(order: DeliveryOrder) {
  const parts = [order.delivery_address, order.delivery_postal_code, order.delivery_city].filter(Boolean);
  return parts.join(', ') || 'No address';
}

function getGoogleMapsUrl(order: DeliveryOrder) {
  const address = getFullAddress(order);
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}&travelmode=driving`;
}

function getPaymentLabel(method: string, t: any) {
  switch (method) {
    case 'cash': return t('card.cashOnDelivery');
    case 'online': return t('card.onlinePayment');
    case 'card': return t('card.cardPayment');
    default: return method;
  }
}

// ─── Delivery Order Card ─────────────────────────────────────────────────
function DeliveryCard({
  order,
  column,
  isPending,
  isNew,
  onAccept,
  onDeliver,
  t
}: {
  order: DeliveryOrder;
  column: 'ready' | 'transit' | 'delivered';
  isPending: boolean;
  isNew?: boolean;
  onAccept: (id: string) => void;
  onDeliver: (id: string, paymentReceived: boolean) => void;
  t: any;
}) {
  const [paymentChecked, setPaymentChecked] = useState(false);
  const isCOD = order.payment_method === 'cash' && order.payment_status !== 'paid';
  const fullAddress = getFullAddress(order);
  const distance = formatDistance(order.delivery_distance_car_meters);
  const driveTime = formatDriveTime(order.delivery_duration_car_seconds);

  // Card theme per column
  const cardStyles = {
    ready: 'border-l-4 border-l-amber-500 bg-[#0D1225]/90 hover:bg-[#111838]/90',
    transit: 'border-l-4 border-l-blue-500 bg-[#0D1225]/90 hover:bg-[#111838]/90',
    delivered: 'border-l-4 border-l-emerald-500 bg-[#0D1225]/60',
  };

  return (
    <div className={`rounded-xl border border-white/[0.06] shadow-lg backdrop-blur-sm transition-all duration-300 ${cardStyles[column]} ${
      isNew ? 'ring-2 ring-amber-400/60 shadow-[0_0_20px_rgba(251,191,36,0.15)] animate-pulse-once' : ''
    }`}>
      {/* Card Header */}
      <div className="flex items-center justify-between px-4 pt-3.5 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-mono font-bold text-white/90">{getOrderRef(order.id)}</span>
          {column === 'transit' && <DeliveryTimer dispatchedAt={order.dispatched_at} />}
        </div>
        <span className="text-[11px] text-white/40 font-medium tabular-nums">
          {formatTime(order.created_at)}
        </span>
      </div>

      {/* Card Body */}
      <div className="px-4 pb-4 space-y-3">
        {/* Customer Info */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-white/30" />
              <span className="text-sm font-semibold text-white/90">{order.customer_name}</span>
            </div>
            {order.customer_phone && (
              <a
                href={`tel:${order.customer_phone}`}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 transition-colors text-xs font-semibold active:scale-95"
                aria-label={`${t('actions.call')} ${order.customer_name}`}
              >
                <Phone className="w-3 h-3" />
                <span className="hidden sm:inline">{order.customer_phone}</span>
                <span className="sm:hidden">{t('actions.call')}</span>
              </a>
            )}
          </div>

          {/* Address with Navigation */}
          <a
            href={getGoogleMapsUrl(order)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-2 group p-2 -mx-2 rounded-lg hover:bg-white/[0.04] transition-colors"
          >
            <MapPin className="w-3.5 h-3.5 text-blue-400/70 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-white/70 group-hover:text-blue-400 transition-colors leading-relaxed break-words">
                {fullAddress}
              </p>
              {(distance || driveTime) && (
                <div className="flex items-center gap-2 mt-1">
                  {distance && (
                    <span className="text-[10px] font-bold text-blue-400/80 bg-blue-500/10 px-1.5 py-0.5 rounded">
                      {distance}
                    </span>
                  )}
                  {driveTime && (
                    <span className="text-[10px] font-bold text-blue-400/80 bg-blue-500/10 px-1.5 py-0.5 rounded">
                      🚗 {driveTime}
                    </span>
                  )}
                </div>
              )}
            </div>
            <Navigation className="w-4 h-4 text-blue-400/50 group-hover:text-blue-400 transition-colors shrink-0 mt-0.5" />
          </a>
        </div>

        {/* Payment & Amount */}
        <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
          <div className="flex items-center gap-2">
            {order.payment_method === 'cash' ? (
              <Banknote className="w-3.5 h-3.5 text-amber-400/70" />
            ) : (
              <CreditCard className="w-3.5 h-3.5 text-blue-400/70" />
            )}
            <span className="text-[11px] font-semibold text-white/60">
              {getPaymentLabel(order.payment_method, t)}
            </span>
          </div>
          <span className={`text-sm font-bold tabular-nums ${
            isCOD ? 'text-amber-400' : 'text-emerald-400'
          }`}>
            {formatCurrency(order.total_amount)}
          </span>
        </div>

        {/* Items List */}
        {order.items.length > 0 && (
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-white/30 uppercase tracking-wider">
              <Package className="w-3 h-3" />
              {t('card.items')} ({order.items.reduce((sum, i) => sum + i.quantity, 0)})
            </div>
            <div className="space-y-0.5">
              {order.items.map(item => (
                <div key={item.id} className="flex items-baseline gap-2 text-xs">
                  <span className="text-white/40 font-mono font-bold shrink-0">{item.quantity}×</span>
                  <span className="text-white/70 break-words">{item.item_name_en || item.item_name_pl}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notes / Allergies */}
        {order.customer_notes && (
          <div className="text-[11px] text-amber-400/80 bg-amber-500/8 border border-amber-500/15 rounded-lg px-2.5 py-1.5 leading-relaxed">
            <span className="font-bold text-amber-400/60">{t('card.notes')}:</span> {order.customer_notes}
          </div>
        )}

        {/* Timestamps Row */}
        <div className="flex items-center gap-3 text-[10px] text-white/30 pt-1">
          {column === 'ready' && order.ready_at && (
            <span>⏰ {t('card.readyAt')} {formatTime(order.ready_at)}</span>
          )}
          {column === 'transit' && order.dispatched_at && (
            <span>🚀 {t('card.dispatchedAt')} {formatTime(order.dispatched_at)}</span>
          )}
          {column === 'delivered' && order.completed_at && (
            <span>✅ {t('card.deliveredAt')} {formatTime(order.completed_at)}</span>
          )}
        </div>

        {/* Action Buttons */}
        {column === 'ready' && (
          <button
            onClick={() => onAccept(order.id)}
            disabled={isPending}
            className="w-full mt-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-bold text-sm shadow-lg shadow-amber-500/25 transition-all duration-200 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Truck className="w-4 h-4" />
            {t('actions.acceptDelivery')}
          </button>
        )}

        {column === 'transit' && (
          <div className="space-y-2 mt-1">
            {isCOD && (
              <label className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] cursor-pointer hover:bg-white/[0.06] transition-colors">
                <input
                  type="checkbox"
                  checked={paymentChecked}
                  onChange={(e) => setPaymentChecked(e.target.checked)}
                  className="w-4 h-4 rounded accent-emerald-500"
                />
                <span className="text-xs font-semibold text-white/70">
                  {t('actions.confirmPayment')} — {formatCurrency(order.total_amount)}
                </span>
              </label>
            )}
            <button
              onClick={() => onDeliver(order.id, isCOD ? paymentChecked : true)}
              disabled={isPending}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-400 hover:to-green-400 text-white font-bold text-sm shadow-lg shadow-emerald-500/25 transition-all duration-200 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle2 className="w-4 h-4" />
              {t('actions.markDelivered')}
            </button>
          </div>
        )}

        {column === 'delivered' && (
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              order.payment_status === 'paid'
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'bg-amber-500/20 text-amber-400'
            }`}>
              {order.payment_status === 'paid' ? `✓ ${t('card.paid')}` : t('card.toCollect')}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Stats Card Component ────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, color }: {
  label: string;
  value: string | number;
  icon: any;
  color: 'amber' | 'blue' | 'emerald' | 'slate';
}) {
  const colors = {
    amber: 'from-amber-500/20 to-orange-500/10 border-amber-500/20 text-amber-400',
    blue: 'from-blue-500/20 to-cyan-500/10 border-blue-500/20 text-blue-400',
    emerald: 'from-emerald-500/20 to-green-500/10 border-emerald-500/20 text-emerald-400',
    slate: 'from-slate-500/20 to-gray-500/10 border-slate-500/20 text-slate-400',
  };

  return (
    <div className={`relative overflow-hidden rounded-xl border bg-gradient-to-br p-4 ${colors[color]} backdrop-blur-sm`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">{label}</p>
          <p className="text-2xl font-bold font-mono mt-1 tabular-nums">{value}</p>
        </div>
        <Icon className="w-8 h-8 opacity-20" />
      </div>
    </div>
  );
}

// ─── Main Delivery Dispatch Board ────────────────────────────────────────
const DELIVERY_STATUSES = ['ready_for_pickup', 'out_for_delivery', 'completed'];
const POLL_INTERVAL = 15000; // 15 second fallback

export default function DeliveryDispatchBoard({
  initialOrders, userRole, userName, restaurantAddress
}: Props) {
  const router = useRouter();
  const t = useTranslations('deliveryDashboard');
  const [isPending, startTransition] = useTransition();

  const [orders, setOrders] = useState<DeliveryOrder[]>(initialOrders);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [mobileTab, setMobileTab] = useState<'ready' | 'transit' | 'delivered'>('ready');

  // Track new order arrivals for highlight animation
  const knownOrderIdsRef = useRef<Set<string>>(new Set(initialOrders.map(o => o.id)));
  const [newOrderIds, setNewOrderIds] = useState<Set<string>>(new Set());
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio for new order alerts
  useEffect(() => {
    if (typeof window !== 'undefined') {
      audioRef.current = new Audio('/sounds/notification.mp3');
      audioRef.current.volume = 0.6;
    }
  }, []);

  // ─── Data Fetching ──────────────────────────────────────────────────
  const fetchOrders = useCallback(async () => {
    try {
      const supabase = createClient();
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      // Fetch active delivery orders
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

      if (activeError) throw activeError;

      // Fetch today's completed deliveries
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

      if (completedError) throw completedError;

      const allOrders = [...(activeOrders || []), ...(completedOrders || [])];

      // Fetch items for all orders
      const orderIds = allOrders.map(o => o.id);
      let orderItemsMap: Record<string, any[]> = {};

      if (orderIds.length > 0) {
        const { data: items } = await supabase
          .from('order_items')
          .select(`
            id, order_id, item_name_pl, item_name_en,
            quantity, unit_price, customer_notes, kitchen_notes,
            allergens_snapshot, spice_level_snapshot
          `)
          .in('order_id', orderIds);

        (items || []).forEach(item => {
          if (!orderItemsMap[item.order_id]) orderItemsMap[item.order_id] = [];
          orderItemsMap[item.order_id].push(item);
        });
      }

      const assembled = allOrders.map(order => ({
        ...order,
        items: orderItemsMap[order.id] || [],
      }));

      // Detect newly arrived ready_for_pickup orders
      const currentReadyIds = new Set(
        assembled.filter(o => o.status === 'ready_for_pickup').map(o => o.id)
      );
      const brand = new Set<string>();
      currentReadyIds.forEach(id => {
        if (!knownOrderIdsRef.current.has(id)) {
          brand.add(id);
        }
      });

      if (brand.size > 0 && soundEnabled && audioRef.current) {
        audioRef.current.play().catch(() => {});
      }

      if (brand.size > 0) {
        setNewOrderIds(brand);
        setTimeout(() => setNewOrderIds(new Set()), 5000);
      }

      // Update known IDs
      knownOrderIdsRef.current = new Set(assembled.map(o => o.id));

      setOrders(assembled);
      setLastUpdated(new Date());
      setErrorMessage(null);
    } catch (err) {
      console.error('[Delivery Dashboard] Fetch error:', err);
      setErrorMessage(t('errors.loadFailed'));
    }
  }, [soundEnabled, t]);

  // ─── Realtime Subscription ──────────────────────────────────────────
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel('delivery-dispatch-orders')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          fetchOrders();
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setIsConnected(false);
        }
      });

    // Polling fallback — runs only when realtime is disconnected
    const interval = setInterval(() => {
      fetchOrders();
    }, POLL_INTERVAL);

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [fetchOrders]);

  // ─── Action Handlers ───────────────────────────────────────────────
  const handleAcceptDelivery = useCallback((orderId: string) => {
    startTransition(async () => {
      const result = await acceptDeliveryAction(orderId);
      if (!result.success) {
        setErrorMessage(result.error || t('errors.acceptFailed'));
        setTimeout(() => setErrorMessage(null), 5000);
      }
      await fetchOrders();
    });
  }, [fetchOrders, t]);

  const handleMarkDelivered = useCallback((orderId: string, paymentReceived: boolean) => {
    startTransition(async () => {
      const result = await completeOrderAction(orderId, paymentReceived);
      if (!result.success) {
        setErrorMessage(result.error || t('errors.deliverFailed'));
        setTimeout(() => setErrorMessage(null), 5000);
      }
      await fetchOrders();
    });
  }, [fetchOrders, t]);

  // ─── Derived State ─────────────────────────────────────────────────
  const readyOrders = orders.filter(o => o.status === 'ready_for_pickup');
  const transitOrders = orders.filter(o => o.status === 'out_for_delivery');
  const deliveredOrders = orders.filter(o => o.status === 'completed');

  // Calculate avg delivery time from today's completed orders
  const avgDeliveryTime = (() => {
    const timesMs = deliveredOrders
      .filter(o => o.dispatched_at && o.completed_at)
      .map(o => new Date(o.completed_at!).getTime() - new Date(o.dispatched_at!).getTime());
    if (timesMs.length === 0) return '—';
    const avgMin = Math.round(timesMs.reduce((a, b) => a + b, 0) / timesMs.length / 60000);
    return `${avgMin}`;
  })();

  // ─── Render ────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#070B1E] text-white pb-20 md:pb-6">
      {/* ═══ Header ═══ */}
      <div className="sticky top-0 z-40 bg-[#070B1E]/95 backdrop-blur-xl border-b border-white/[0.06] px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between max-w-[1800px] mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Truck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">{t('title')}</h1>
              <p className="text-[10px] text-white/40 font-medium hidden sm:block">{t('subtitle')}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Sound Toggle */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-lg transition-colors ${
                soundEnabled ? 'bg-emerald-500/15 text-emerald-400' : 'bg-white/[0.05] text-white/30'
              }`}
              aria-label="Toggle sound"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Connection Status */}
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
              isConnected
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                : 'border-amber-500/30 bg-amber-500/10 text-amber-400'
            }`}>
              {isConnected ? (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  {t('live')}
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3" />
                  {t('reconnecting')}
                </>
              )}
            </div>

            {/* Last Updated */}
            {lastUpdated && (
              <span className="text-[10px] text-white/30 font-mono tabular-nums hidden md:block">
                {lastUpdated.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'Europe/Warsaw' })}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ═══ Error Banner ═══ */}
      {errorMessage && (
        <div className="mx-4 sm:mx-6 mt-3 max-w-[1800px] lg:mx-auto flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/15 border border-red-500/20 text-red-400 text-xs font-semibold">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {errorMessage}
          <button onClick={() => setErrorMessage(null)} className="ml-auto text-red-400/60 hover:text-red-400">✕</button>
        </div>
      )}

      {/* ═══ Stats Bar ═══ */}
      <div className="px-4 sm:px-6 pt-4 pb-2 max-w-[1800px] mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            label={t('stats.ready')}
            value={readyOrders.length}
            icon={Package}
            color="amber"
          />
          <StatCard
            label={t('stats.inTransit')}
            value={transitOrders.length}
            icon={Truck}
            color="blue"
          />
          <StatCard
            label={t('stats.deliveredToday')}
            value={deliveredOrders.length}
            icon={CheckCircle2}
            color="emerald"
          />
          <StatCard
            label={t('stats.avgTime')}
            value={avgDeliveryTime === '—' ? '—' : `${avgDeliveryTime} ${t('stats.minutes')}`}
            icon={Clock}
            color="slate"
          />
        </div>
      </div>

      {/* ═══ Desktop: 3-Column Layout ═══ */}
      <div className="hidden md:block px-4 sm:px-6 pt-4 max-w-[1800px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Column 1: Ready for Pickup */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 border-b-2 border-amber-500/30 pb-2">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
              <h2 className="text-sm font-bold text-amber-400 uppercase tracking-widest">
                {t('columns.readyForPickup')}
              </h2>
              <span className="ml-auto bg-amber-500/15 text-amber-400 text-xs font-mono font-bold px-2 py-0.5 rounded-full">
                {readyOrders.length}
              </span>
            </div>

            {readyOrders.length === 0 ? (
              <div className="text-center py-16 text-white/15">
                <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-xs font-medium">{t('empty.ready')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {readyOrders.map(order => (
                  <DeliveryCard
                    key={order.id}
                    order={order}
                    column="ready"
                    isPending={isPending}
                    isNew={newOrderIds.has(order.id)}
                    onAccept={handleAcceptDelivery}
                    onDeliver={handleMarkDelivered}
                    t={t}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Column 2: In Transit */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 border-b-2 border-blue-500/30 pb-2">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
              <h2 className="text-sm font-bold text-blue-400 uppercase tracking-widest">
                {t('columns.inTransit')}
              </h2>
              <span className="ml-auto bg-blue-500/15 text-blue-400 text-xs font-mono font-bold px-2 py-0.5 rounded-full">
                {transitOrders.length}
              </span>
            </div>

            {transitOrders.length === 0 ? (
              <div className="text-center py-16 text-white/15">
                <Truck className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-xs font-medium">{t('empty.transit')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {transitOrders.map(order => (
                  <DeliveryCard
                    key={order.id}
                    order={order}
                    column="transit"
                    isPending={isPending}
                    onAccept={handleAcceptDelivery}
                    onDeliver={handleMarkDelivered}
                    t={t}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Column 3: Delivered */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 border-b-2 border-emerald-500/30 pb-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              <h2 className="text-sm font-bold text-emerald-400 uppercase tracking-widest">
                {t('columns.delivered')}
              </h2>
              <span className="ml-auto bg-emerald-500/15 text-emerald-400 text-xs font-mono font-bold px-2 py-0.5 rounded-full">
                {deliveredOrders.length}
              </span>
            </div>

            {deliveredOrders.length === 0 ? (
              <div className="text-center py-16 text-white/15">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-xs font-medium">{t('empty.delivered')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {deliveredOrders.map(order => (
                  <DeliveryCard
                    key={order.id}
                    order={order}
                    column="delivered"
                    isPending={isPending}
                    onAccept={handleAcceptDelivery}
                    onDeliver={handleMarkDelivered}
                    t={t}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══ Mobile: Tabbed Single-Column Layout ═══ */}
      <div className="md:hidden px-4 pt-4">
        {/* Active Tab Content */}
        <div className="space-y-3">
          {mobileTab === 'ready' && (
            <>
              <div className="flex items-center gap-2 border-b-2 border-amber-500/30 pb-2">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <h2 className="text-sm font-bold text-amber-400 uppercase tracking-widest">
                  {t('columns.readyForPickup')}
                </h2>
                <span className="ml-auto bg-amber-500/15 text-amber-400 text-xs font-mono font-bold px-2 py-0.5 rounded-full">
                  {readyOrders.length}
                </span>
              </div>
              {readyOrders.length === 0 ? (
                <div className="text-center py-16 text-white/15">
                  <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-xs font-medium">{t('empty.ready')}</p>
                </div>
              ) : (
                readyOrders.map(order => (
                  <DeliveryCard
                    key={order.id}
                    order={order}
                    column="ready"
                    isPending={isPending}
                    isNew={newOrderIds.has(order.id)}
                    onAccept={handleAcceptDelivery}
                    onDeliver={handleMarkDelivered}
                    t={t}
                  />
                ))
              )}
            </>
          )}

          {mobileTab === 'transit' && (
            <>
              <div className="flex items-center gap-2 border-b-2 border-blue-500/30 pb-2">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <h2 className="text-sm font-bold text-blue-400 uppercase tracking-widest">
                  {t('columns.inTransit')}
                </h2>
                <span className="ml-auto bg-blue-500/15 text-blue-400 text-xs font-mono font-bold px-2 py-0.5 rounded-full">
                  {transitOrders.length}
                </span>
              </div>
              {transitOrders.length === 0 ? (
                <div className="text-center py-16 text-white/15">
                  <Truck className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-xs font-medium">{t('empty.transit')}</p>
                </div>
              ) : (
                transitOrders.map(order => (
                  <DeliveryCard
                    key={order.id}
                    order={order}
                    column="transit"
                    isPending={isPending}
                    onAccept={handleAcceptDelivery}
                    onDeliver={handleMarkDelivered}
                    t={t}
                  />
                ))
              )}
            </>
          )}

          {mobileTab === 'delivered' && (
            <>
              <div className="flex items-center gap-2 border-b-2 border-emerald-500/30 pb-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <h2 className="text-sm font-bold text-emerald-400 uppercase tracking-widest">
                  {t('columns.delivered')}
                </h2>
                <span className="ml-auto bg-emerald-500/15 text-emerald-400 text-xs font-mono font-bold px-2 py-0.5 rounded-full">
                  {deliveredOrders.length}
                </span>
              </div>
              {deliveredOrders.length === 0 ? (
                <div className="text-center py-16 text-white/15">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-xs font-medium">{t('empty.delivered')}</p>
                </div>
              ) : (
                deliveredOrders.map(order => (
                  <DeliveryCard
                    key={order.id}
                    order={order}
                    column="delivered"
                    isPending={isPending}
                    onAccept={handleAcceptDelivery}
                    onDeliver={handleMarkDelivered}
                    t={t}
                  />
                ))
              )}
            </>
          )}
        </div>
      </div>

      {/* ═══ Mobile Bottom Navigation ═══ */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0A0F24]/95 backdrop-blur-xl border-t border-white/[0.06] safe-area-bottom">
        <div className="grid grid-cols-3 gap-0">
          <button
            onClick={() => setMobileTab('ready')}
            className={`flex flex-col items-center gap-1 py-3 transition-colors relative ${
              mobileTab === 'ready' ? 'text-amber-400' : 'text-white/30 hover:text-white/50'
            }`}
          >
            <Package className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase tracking-wider">{t('mobile.ready')}</span>
            {readyOrders.length > 0 && (
              <span className="absolute top-1.5 right-1/4 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 text-[9px] font-black text-white px-1 shadow-lg shadow-amber-500/30">
                {readyOrders.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setMobileTab('transit')}
            className={`flex flex-col items-center gap-1 py-3 transition-colors relative ${
              mobileTab === 'transit' ? 'text-blue-400' : 'text-white/30 hover:text-white/50'
            }`}
          >
            <Truck className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase tracking-wider">{t('mobile.transit')}</span>
            {transitOrders.length > 0 && (
              <span className="absolute top-1.5 right-1/4 flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-500 text-[9px] font-black text-white px-1 shadow-lg shadow-blue-500/30">
                {transitOrders.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setMobileTab('delivered')}
            className={`flex flex-col items-center gap-1 py-3 transition-colors relative ${
              mobileTab === 'delivered' ? 'text-emerald-400' : 'text-white/30 hover:text-white/50'
            }`}
          >
            <CheckCircle2 className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase tracking-wider">{t('mobile.delivered')}</span>
            {deliveredOrders.length > 0 && (
              <span className="absolute top-1.5 right-1/4 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500 text-[9px] font-black text-white px-1 shadow-lg shadow-emerald-500/30">
                {deliveredOrders.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ═══ CSS Animations ═══ */}
      <style jsx global>{`
        @keyframes pulse-once {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        .animate-pulse-once {
          animation: pulse-once 1s ease-in-out 3;
        }
        .safe-area-bottom {
          padding-bottom: env(safe-area-inset-bottom, 0px);
        }
      `}</style>
    </div>
  );
}
