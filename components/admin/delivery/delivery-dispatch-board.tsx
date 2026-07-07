'use client';

import React, { useState, useEffect, useRef, useCallback, useTransition, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import {
  Truck, Phone, MapPin, Clock, Package, CheckCircle2, Navigation,
  Wifi, WifiOff, AlertTriangle, CreditCard, Banknote, Timer,
  Home, User, Bell, Volume2, VolumeX, Sun, Moon, Route
} from 'lucide-react';
import { acceptDeliveryAction, completeOrderAction } from '@/app/admin/orders/actions';
import {
  optimizeRoute,
  formatRouteDistance,
  type RouteBatch,
  type Coordinate,
} from '@/lib/delivery/route-optimizer';

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
  delivery_latitude: number | null;
  delivery_longitude: number | null;
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
  restaurantCoordinates: { latitude: number; longitude: number } | null;
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
function DeliveryTimer({ dispatchedAt, theme }: { dispatchedAt: string | null; theme: 'dark' | 'light' }) {
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

  const isLight = theme === 'light';

  const styleClass = (() => {
    if (isLong) {
      return isLight ? 'bg-red-50 text-red-700 ring-1 ring-red-200' : 'bg-red-500/15 text-red-400 ring-1 ring-red-500/30';
    }
    if (isWarning) {
      return isLight ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' : 'bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30';
    }
    return isLight ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200' : 'bg-blue-500/15 text-blue-300 ring-1 ring-blue-500/30';
  })();

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-mono text-sm font-bold tabular-nums ${styleClass}`}>
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

// Opens native maps directions query directly
function getGoogleMapsUrl(order: DeliveryOrder) {
  const address = getFullAddress(order);
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}&travelmode=driving`;
}

function getPaymentLabel(method: string, t: any) {
  switch (method) {
    case 'cash_on_delivery': return t('card.cashOnDelivery');
    case 'card_on_delivery': return t('card.cardPayment');
    case 'cash_on_pickup': return t('card.cashOnDelivery');
    case 'card_on_pickup': return t('card.cardPayment');
    default: return method;
  }
}

// ─── Delivery Order Card ─────────────────────────────────────────────────
function DeliveryCard({
  order,
  column,
  isPending,
  isNew,
  stopNumber,
  isSelected,
  onToggleSelect,
  onAccept,
  onDeliver,
  t,
  theme
}: {
  order: DeliveryOrder;
  column: 'ready' | 'transit' | 'delivered';
  isPending: boolean;
  isNew?: boolean;
  stopNumber?: number;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  onAccept: (id: string) => void;
  onDeliver: (id: string, paymentReceived: boolean) => void;
  t: any;
  theme: 'dark' | 'light';
}) {
  const [paymentChecked, setPaymentChecked] = useState(false);
  const isCOD = order.payment_method === 'cash_on_delivery' && order.payment_status !== 'paid';
  const fullAddress = getFullAddress(order);
  const distance = formatDistance(order.delivery_distance_car_meters);
  const driveTime = formatDriveTime(order.delivery_duration_car_seconds);
  const isLight = theme === 'light';

  // Theme styles based on current selected theme
  const cardStyles = {
    ready: isLight
      ? 'border-l-4 border-l-amber-500 bg-white hover:bg-slate-50/85 border-slate-200 text-slate-800'
      : 'border-l-4 border-l-amber-500 bg-[#0D1225]/90 hover:bg-[#111838]/90 border-white/[0.06] text-white',
    transit: isLight
      ? 'border-l-4 border-l-blue-500 bg-white hover:bg-slate-50/85 border-slate-200 text-slate-800'
      : 'border-l-4 border-l-blue-500 bg-[#0D1225]/90 hover:bg-[#111838]/90 border-white/[0.06] text-white',
    delivered: isLight
      ? 'border-l-4 border-l-emerald-500 bg-white/70 border-slate-200 text-slate-600'
      : 'border-l-4 border-l-emerald-500 bg-[#0D1225]/60 border-white/[0.06] text-white/90',
  };

  return (
    <div className={`rounded-xl shadow-md backdrop-blur-sm border transition-all duration-300 ${cardStyles[column]} ${
      isNew ? 'ring-2 ring-amber-400/60 shadow-[0_0_20px_rgba(251,191,36,0.15)] animate-pulse-once' : ''
    } ${
      isSelected
        ? (isLight
            ? 'ring-2 ring-indigo-500/50 bg-indigo-50/15 border-indigo-200 shadow-lg shadow-indigo-500/5'
            : 'ring-2 ring-indigo-500/40 bg-indigo-500/[0.04] border-indigo-500/30 shadow-lg shadow-indigo-500/10')
        : (isLight ? 'border-slate-200' : 'border-white/[0.06]')
    }`}>
      {/* Card Header */}
      <div className="flex items-center justify-between px-4 pt-3.5 pb-2">
        <div className="flex items-center gap-2">
          {column === 'ready' && onToggleSelect && (
            <input
              type="checkbox"
              checked={!!isSelected}
              onChange={onToggleSelect}
              className={`w-4.5 h-4.5 rounded cursor-pointer accent-indigo-650 focus:ring-indigo-500 focus:ring-2 border transition-all duration-200 ${
                isLight
                  ? 'border-slate-350 bg-white text-indigo-600 focus:ring-indigo-500/40'
                  : 'border-white/20 bg-slate-900 text-indigo-500 focus:ring-indigo-500/30'
              }`}
            />
          )}
          {stopNumber != null && (
            <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-black shrink-0 ${
              isLight
                ? 'bg-gradient-to-br from-indigo-500 to-blue-500 text-white shadow-sm shadow-indigo-500/25'
                : 'bg-gradient-to-br from-indigo-500 to-blue-500 text-white shadow-md shadow-indigo-500/30'
            }`}>
              {stopNumber}
            </span>
          )}
          <span className={`text-sm font-mono font-bold ${isLight ? 'text-slate-850' : 'text-white/90'}`}>{getOrderRef(order.id)}</span>
          {column === 'transit' && <DeliveryTimer dispatchedAt={order.dispatched_at} theme={theme} />}
        </div>
        <span className={`text-[11px] font-medium tabular-nums ${isLight ? 'text-slate-400' : 'text-white/40'}`}>
          {formatTime(order.created_at)}
        </span>
      </div>

      {/* Card Body */}
      <div className="px-4 pb-4 space-y-3">
        {/* Customer Info */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className={`w-3.5 h-3.5 ${isLight ? 'text-slate-400' : 'text-white/30'}`} />
              <span className={`text-sm font-semibold ${isLight ? 'text-slate-855' : 'text-white/90'}`}>{order.customer_name}</span>
            </div>
            {order.customer_phone && (
              <a
                href={`tel:${order.customer_phone}`}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold active:scale-95 transition-colors ${
                  isLight 
                    ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100/70 border border-emerald-250/30'
                    : 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25'
                }`}
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
            className={`flex items-start gap-2 group p-2 -mx-2 rounded-lg transition-colors ${
              isLight ? 'hover:bg-slate-100/60' : 'hover:bg-white/[0.04]'
            }`}
          >
            <MapPin className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${isLight ? 'text-blue-600/80' : 'text-blue-400/70'}`} />
            <div className="flex-1 min-w-0">
              <p className={`text-xs leading-relaxed break-words transition-colors ${
                isLight ? 'text-slate-600 group-hover:text-blue-700' : 'text-white/70 group-hover:text-blue-400'
              }`}>
                {fullAddress}
              </p>
              {(distance || driveTime) && (
                <div className="flex items-center gap-2 mt-1">
                  {distance && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                      isLight
                        ? 'bg-blue-50 text-blue-700 border-blue-200/50'
                        : 'bg-blue-500/10 text-blue-400/80 border-blue-500/20'
                    }`}>
                      {distance}
                    </span>
                  )}
                  {driveTime && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                      isLight
                        ? 'bg-blue-50 text-blue-700 border-blue-200/50'
                        : 'bg-blue-500/10 text-blue-400/80 border-blue-500/20'
                    }`}>
                      🚗 {driveTime}
                    </span>
                  )}
                </div>
              )}
            </div>
            <Navigation className={`w-4 h-4 transition-colors shrink-0 mt-0.5 ${
              isLight ? 'text-blue-500/40 group-hover:text-blue-650' : 'text-blue-400/50 group-hover:text-blue-400'
            }`} />
          </a>
        </div>

        {/* Payment & Amount */}
        <div className={`flex items-center justify-between py-2 px-3 rounded-lg border ${
          isLight 
            ? 'bg-slate-50 border-slate-150' 
            : 'bg-white/[0.03] border-white/[0.06]'
        }`}>
          <div className="flex items-center gap-2">
            {order.payment_method === 'cash_on_delivery' ? (
              <Banknote className={`w-3.5 h-3.5 ${isLight ? 'text-amber-600/80' : 'text-amber-400/70'}`} />
            ) : (
              <CreditCard className={`w-3.5 h-3.5 ${isLight ? 'text-blue-600/80' : 'text-blue-400/70'}`} />
            )}
            <span className={`text-[11px] font-semibold ${isLight ? 'text-slate-500' : 'text-white/60'}`}>
              {getPaymentLabel(order.payment_method, t)}
            </span>
          </div>
          <span className={`text-sm font-bold tabular-nums ${
            isCOD 
              ? (isLight ? 'text-amber-700' : 'text-amber-400')
              : (isLight ? 'text-emerald-700' : 'text-emerald-400')
          }`}>
            {formatCurrency(order.total_amount)}
          </span>
        </div>

        {/* Items List */}
        {order.items.length > 0 && (
          <div className="space-y-1">
            <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider ${
              isLight ? 'text-slate-400' : 'text-white/30'
            }`}>
              <Package className="w-3 h-3" />
              {t('card.items')} ({order.items.reduce((sum, i) => sum + i.quantity, 0)})
            </div>
            <div className="space-y-0.5">
              {order.items.map(item => (
                <div key={item.id} className="flex items-baseline gap-2 text-xs">
                  <span className={`font-mono font-bold shrink-0 ${isLight ? 'text-slate-400' : 'text-white/40'}`}>{item.quantity}×</span>
                  <span className={`break-words ${isLight ? 'text-slate-650' : 'text-white/70'}`}>{item.item_name_en || item.item_name_pl}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notes / Allergies */}
        {order.customer_notes && (
          <div className={`text-[11px] border rounded-lg px-2.5 py-1.5 leading-relaxed ${
            isLight
              ? 'text-amber-800 bg-amber-50/50 border-amber-250/50'
              : 'text-amber-400/80 bg-amber-500/8 border-amber-500/15'
          }`}>
            <span className={`font-bold ${isLight ? 'text-amber-800/60' : 'text-amber-400/60'}`}>{t('card.notes')}:</span> {order.customer_notes}
          </div>
        )}

        {/* Timestamps Row */}
        <div className={`flex items-center gap-3 text-[10px] pt-1 ${isLight ? 'text-slate-400' : 'text-white/30'}`}>
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
              <label className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                isLight
                  ? 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  : 'bg-white/[0.04] border-white/[0.06] text-white/70 hover:bg-white/[0.06]'
              }`}>
                <input
                  type="checkbox"
                  checked={paymentChecked}
                  onChange={(e) => setPaymentChecked(e.target.checked)}
                  className="w-4 h-4 rounded accent-emerald-600"
                />
                <span className="text-xs font-semibold">
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
                ? 'bg-emerald-500/20 text-emerald-650 dark:text-emerald-400'
                : 'bg-amber-500/20 text-amber-750 dark:text-amber-400'
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
function StatCard({ label, value, icon: Icon, color, theme }: {
  label: string;
  value: string | number;
  icon: any;
  color: 'amber' | 'blue' | 'emerald' | 'slate';
  theme: 'dark' | 'light';
}) {
  const isLight = theme === 'light';

  const colors = {
    amber: isLight
      ? 'from-amber-50/80 to-orange-50/40 border-amber-200/80 text-amber-800 shadow-sm'
      : 'from-amber-500/20 to-orange-500/10 border-amber-500/20 text-amber-400',
    blue: isLight
      ? 'from-blue-50/80 to-cyan-50/40 border-blue-200/80 text-blue-800 shadow-sm'
      : 'from-blue-500/20 to-cyan-500/10 border-blue-500/20 text-blue-400',
    emerald: isLight
      ? 'from-emerald-50/80 to-green-50/40 border-emerald-200/80 text-emerald-800 shadow-sm'
      : 'from-emerald-500/20 to-green-500/10 border-emerald-500/20 text-emerald-400',
    slate: isLight
      ? 'from-slate-50/80 to-gray-50/40 border-slate-200/80 text-slate-800 shadow-sm'
      : 'from-slate-500/20 to-gray-500/10 border-slate-500/20 text-slate-400',
  };

  return (
    <div className={`relative overflow-hidden rounded-xl border bg-gradient-to-br p-4 ${colors[color]} backdrop-blur-sm`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">{label}</p>
          <p className="text-2xl font-bold font-mono mt-1 tabular-nums">{value}</p>
        </div>
        <Icon className={`w-8 h-8 ${isLight ? 'opacity-30 text-slate-500' : 'opacity-20'}`} />
      </div>
    </div>
  );
}

// ─── Main Delivery Dispatch Board ────────────────────────────────────────
const POLL_INTERVAL = 15000; // 15 second fallback

export default function DeliveryDispatchBoard({
  initialOrders, userRole, userName, restaurantAddress, restaurantCoordinates
}: Props) {
  const router = useRouter();
  const t = useTranslations('deliveryDashboard');
  const [isPending, startTransition] = useTransition();

  const [orders, setOrders] = useState<DeliveryOrder[]>(initialOrders);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<'ready' | 'transit' | 'delivered'>('ready');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());

  // Toggle selection of a specific order
  const handleToggleSelectOrder = useCallback((orderId: string) => {
    setSelectedOrderIds(prev => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
  }, []);

  // Track new order arrivals for highlight animation
  const knownOrderIdsRef = useRef<Set<string>>(new Set(initialOrders.map(o => o.id)));
  const [newOrderIds, setNewOrderIds] = useState<Set<string>>(new Set());

  // Initialize theme from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedTheme = localStorage.getItem('delivery_theme') as 'dark' | 'light';
      if (storedTheme) {
        setTheme(storedTheme);
      }
    }
  }, []);

  // Toggle theme handler
  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('delivery_theme', next);
      return next;
    });
  }, []);

  const isLight = theme === 'light';

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
          delivery_latitude, delivery_longitude,
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
          delivery_latitude, delivery_longitude,
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
  }, [t]);

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

  // ─── Route Optimization ─────────────────────────────────────────────
  const routeBatches: RouteBatch[] = useMemo(() => {
    if (!restaurantCoordinates) return [];
    const origin: Coordinate = { lat: restaurantCoordinates.latitude, lng: restaurantCoordinates.longitude };
    
    // Optimize selected orders if checked, otherwise optimize all ready orders
    const sourceOrders = selectedOrderIds.size > 0
      ? readyOrders.filter(o => selectedOrderIds.has(o.id))
      : readyOrders;

    const routeOrders = sourceOrders
      .filter(o => o.delivery_latitude != null && o.delivery_longitude != null)
      .map(o => ({
        id: o.id,
        lat: o.delivery_latitude!,
        lng: o.delivery_longitude!,
        customerName: o.customer_name,
        address: getFullAddress(o),
      }));

    if (selectedOrderIds.size === 0 && routeOrders.length < 2) return [];
    if (routeOrders.length === 0) return [];
    
    return optimizeRoute(origin, routeOrders);
  }, [readyOrders, selectedOrderIds, restaurantCoordinates]);

  // Synchronise selected order IDs with current ready orders
  useEffect(() => {
    const readyIds = new Set(readyOrders.map(o => o.id));
    setSelectedOrderIds(prev => {
      let changed = false;
      const next = new Set<string>();
      prev.forEach(id => {
        if (readyIds.has(id)) {
          next.add(id);
        } else {
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [readyOrders]);

  // Map orderId → stop number for badge rendering
  const stopNumberMap: Map<string, number> = useMemo(() => {
    const map = new Map<string, number>();
    if (routeBatches.length === 1) {
      routeBatches[0].route.stops.forEach(s => map.set(s.order.id, s.stopNumber));
    } else {
      // Multi-batch: use batch prefix (e.g., 1.1, 1.2, 2.1)
      // For simplicity, flatten with a running counter
      let counter = 1;
      routeBatches.forEach(batch => {
        batch.route.stops.forEach(s => {
          map.set(s.order.id, counter++);
        });
      });
    }
    return map;
  }, [routeBatches]);

  // ─── Render ────────────────────────────────────────────────────────
  return (
    <div className={`min-h-screen transition-colors duration-300 pb-20 md:pb-6 -m-4 sm:-m-8 p-4 sm:p-8 ${
      isLight ? 'bg-slate-50 text-slate-800' : 'bg-[#070B1E] text-white'
    }`}>
      {/* ═══ Page Header ═══ */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 mb-6 border-b transition-colors duration-300 ${
        isLight ? 'border-slate-200' : 'border-white/[0.06]'
      }`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-md shadow-amber-500/20">
            <Truck className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className={`text-xl sm:text-2xl font-serif font-bold tracking-wide ${isLight ? 'text-slate-800' : 'text-white'}`}>
              {t('title')}
            </h1>
            <p className={`text-xs ${isLight ? 'text-slate-400' : 'text-white/40'}`}>{t('subtitle')}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className={`p-2.5 rounded-lg transition-colors border ${
              isLight 
                ? 'bg-white border-slate-200 text-slate-500 hover:bg-slate-100 shadow-sm' 
                : 'bg-white/[0.04] border-white/[0.06] text-white/40 hover:bg-white/[0.08]'
            }`}
            aria-label={isLight ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            title={isLight ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          >
            {isLight ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-amber-400" />}
          </button>


          {/* Connection Status */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${
            isConnected
              ? (isLight ? 'border-emerald-250 bg-emerald-50 text-emerald-800' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400')
              : (isLight ? 'border-amber-250 bg-amber-50 text-amber-850' : 'border-amber-500/30 bg-amber-500/10 text-amber-400')
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
            <span className={`text-[10px] font-mono tabular-nums hidden md:block ${isLight ? 'text-slate-400' : 'text-white/30'}`}>
              {t('lastUpdated')}: {lastUpdated.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'Europe/Warsaw' })}
            </span>
          )}
        </div>
      </div>

      {/* ═══ Error Banner ═══ */}
      {errorMessage && (
        <div className="mb-4 max-w-[1800px] flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/15 border border-red-500/20 text-red-650 dark:text-red-400 text-xs font-semibold shadow-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {errorMessage}
          <button onClick={() => setErrorMessage(null)} className="ml-auto opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      {/* ═══ Stats Bar ═══ */}
      <div className="mb-6 max-w-[1800px]">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
          <StatCard
            label={t('stats.ready')}
            value={readyOrders.length}
            icon={Package}
            color="amber"
            theme={theme}
          />
          <StatCard
            label={t('stats.inTransit')}
            value={transitOrders.length}
            icon={Truck}
            color="blue"
            theme={theme}
          />
          <StatCard
            label={t('stats.deliveredToday')}
            value={deliveredOrders.length}
            icon={CheckCircle2}
            color="emerald"
            theme={theme}
          />
          <StatCard
            label={t('stats.avgTime')}
            value={avgDeliveryTime === '—' ? '—' : `${avgDeliveryTime} ${t('stats.minutes')}`}
            icon={Clock}
            color="slate"
            theme={theme}
          />
        </div>
      </div>

      {/* ═══ Smart Route Panel ═══ */}
      {routeBatches.length > 0 && (
        <div className={`mb-6 max-w-[1800px] ${mobileTab !== 'ready' ? 'hidden md:block' : ''}`}>
          {routeBatches.map((batch) => (
            <div
              key={batch.batchNumber}
              className={`rounded-2xl border p-4 sm:p-5 transition-colors duration-300 ${
                routeBatches.length > 1 ? 'mb-3' : ''
              } ${
                isLight
                  ? 'bg-gradient-to-r from-indigo-50/80 via-blue-50/60 to-cyan-50/40 border-indigo-200/60 shadow-sm'
                  : 'bg-gradient-to-r from-indigo-500/[0.08] via-blue-500/[0.06] to-cyan-500/[0.04] border-indigo-500/20'
              }`}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    isLight
                      ? 'bg-gradient-to-br from-indigo-500 to-blue-500 shadow-sm shadow-indigo-500/25'
                      : 'bg-gradient-to-br from-indigo-500 to-blue-500 shadow-md shadow-indigo-500/30'
                  }`}>
                    <Route className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className={`text-sm font-bold ${
                      isLight ? 'text-indigo-800' : 'text-indigo-300'
                    }`}>
                      {routeBatches.length > 1
                        ? `${t('route.title')} · ${t('route.batch')} ${batch.batchNumber}`
                        : t('route.title')
                      }
                    </h3>
                    <p className={`text-[11px] ${
                      isLight ? 'text-indigo-500/70' : 'text-indigo-400/60'
                    }`}>
                      {selectedOrderIds.size > 0 ? t('route.selectedSubtitle') : t('route.subtitle')}
                    </p>
                  </div>
                </div>

                {/* Distance & Time Badges */}
                <div className="flex items-center gap-2">
                  {selectedOrderIds.size > 0 && (
                    <button
                      onClick={() => setSelectedOrderIds(new Set())}
                      className={`text-[10px] font-bold px-2 py-1 rounded transition-colors mr-2 ${
                        isLight
                          ? 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                          : 'bg-white/10 hover:bg-white/15 text-white/70'
                      }`}
                    >
                      {t('route.clearSelection')}
                    </button>
                  )}
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                    isLight
                      ? 'bg-indigo-100/80 text-indigo-700'
                      : 'bg-indigo-500/15 text-indigo-300'
                  }`}>
                    {formatRouteDistance(batch.route.totalDistanceMeters)}
                  </span>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                    isLight
                      ? 'bg-blue-100/80 text-blue-700'
                      : 'bg-blue-500/15 text-blue-300'
                  }`}>
                    ~{batch.route.estimatedMinutes} min
                  </span>
                </div>
              </div>

              {/* Route Sequence */}
              <div className={`flex items-center gap-1.5 flex-wrap text-xs mb-4 px-1 ${
                isLight ? 'text-indigo-700/80' : 'text-indigo-300/70'
              }`}>
                <span className={`inline-flex items-center gap-1 font-semibold ${
                  isLight ? 'text-indigo-600' : 'text-indigo-400'
                }`}>
                  <Home className="w-3.5 h-3.5" />
                  Restaurant
                </span>
                {batch.route.stops.map((stop) => (
                  <React.Fragment key={stop.order.id}>
                    <span className={`${isLight ? 'text-indigo-300' : 'text-indigo-500/50'}`}>→</span>
                    <span className="inline-flex items-center gap-1">
                      <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-black ${
                        isLight
                          ? 'bg-indigo-500 text-white'
                          : 'bg-indigo-500 text-white'
                      }`}>
                        {stop.stopNumber}
                      </span>
                      <span className="font-medium truncate max-w-[120px]">
                        {stop.order.customerName}
                      </span>
                      <span className={`text-[10px] font-mono ${
                        isLight ? 'text-indigo-400/60' : 'text-indigo-500/50'
                      }`}>
                        ({formatRouteDistance(stop.distanceFromPrevious)})
                      </span>
                    </span>
                  </React.Fragment>
                ))}
              </div>

              {/* Start Route Button */}
              <a
                href={batch.route.googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`w-full flex items-center justify-center gap-2.5 px-5 py-3 rounded-xl font-bold text-sm transition-all duration-200 active:scale-[0.97] ${
                  isLight
                    ? 'bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600 text-white shadow-lg shadow-indigo-500/25'
                    : 'bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-400 hover:to-blue-400 text-white shadow-lg shadow-indigo-500/30'
                }`}
              >
                <Navigation className="w-4 h-4" />
                {t('route.startRoute')} ({batch.route.stops.length} {t('route.stops')})
              </a>
            </div>
          ))}
        </div>
      )}

      {/* ═══ Desktop: 3-Column Layout ═══ */}
      <div className="hidden md:block max-w-[1800px]">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Column 1: Ready for Pickup */}
          <div className="space-y-4">
            <div className={`flex items-center gap-2 border-b-2 pb-2 transition-colors duration-300 ${
              isLight ? 'border-amber-500/20' : 'border-amber-500/30'
            }`}>
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
              <h2 className={`text-sm font-bold uppercase tracking-widest ${isLight ? 'text-amber-700' : 'text-amber-400'}`}>
                {t('columns.readyForPickup')}
              </h2>
              <span className={`ml-auto text-xs font-mono font-bold px-2 py-0.5 rounded-full ${
                isLight ? 'bg-amber-100 text-amber-800' : 'bg-amber-500/15 text-amber-400'
              }`}>
                {readyOrders.length}
              </span>
            </div>

            {readyOrders.length === 0 ? (
              <div className={`text-center py-16 ${isLight ? 'text-slate-350' : 'text-white/15'}`}>
                <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-xs font-medium">{t('empty.ready')}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {readyOrders.map(order => (
                  <DeliveryCard
                    key={order.id}
                    order={order}
                    column="ready"
                    isPending={isPending}
                    isNew={newOrderIds.has(order.id)}
                    stopNumber={stopNumberMap.get(order.id)}
                    isSelected={selectedOrderIds.has(order.id)}
                    onToggleSelect={() => handleToggleSelectOrder(order.id)}
                    onAccept={handleAcceptDelivery}
                    onDeliver={handleMarkDelivered}
                    t={t}
                    theme={theme}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Column 2: In Transit */}
          <div className="space-y-4">
            <div className={`flex items-center gap-2 border-b-2 pb-2 transition-colors duration-300 ${
              isLight ? 'border-blue-500/20' : 'border-blue-500/30'
            }`}>
              <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
              <h2 className={`text-sm font-bold uppercase tracking-widest ${isLight ? 'text-blue-700' : 'text-blue-400'}`}>
                {t('columns.inTransit')}
              </h2>
              <span className={`ml-auto text-xs font-mono font-bold px-2 py-0.5 rounded-full ${
                isLight ? 'bg-blue-100 text-blue-800' : 'bg-blue-500/15 text-blue-400'
              }`}>
                {transitOrders.length}
              </span>
            </div>

            {transitOrders.length === 0 ? (
              <div className={`text-center py-16 ${isLight ? 'text-slate-350' : 'text-white/15'}`}>
                <Truck className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-xs font-medium">{t('empty.transit')}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {transitOrders.map(order => (
                  <DeliveryCard
                    key={order.id}
                    order={order}
                    column="transit"
                    isPending={isPending}
                    onAccept={handleAcceptDelivery}
                    onDeliver={handleMarkDelivered}
                    t={t}
                    theme={theme}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Column 3: Delivered */}
          <div className="space-y-4">
            <div className={`flex items-center gap-2 border-b-2 pb-2 transition-colors duration-300 ${
              isLight ? 'border-emerald-500/20' : 'border-emerald-500/30'
            }`}>
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              <h2 className={`text-sm font-bold uppercase tracking-widest ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>
                {t('columns.delivered')}
              </h2>
              <span className={`ml-auto text-xs font-mono font-bold px-2 py-0.5 rounded-full ${
                isLight ? 'bg-emerald-100 text-emerald-800' : 'bg-emerald-500/15 text-emerald-400'
              }`}>
                {deliveredOrders.length}
              </span>
            </div>

            {deliveredOrders.length === 0 ? (
              <div className={`text-center py-16 ${isLight ? 'text-slate-350' : 'text-white/15'}`}>
                <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-xs font-medium">{t('empty.delivered')}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {deliveredOrders.map(order => (
                  <DeliveryCard
                    key={order.id}
                    order={order}
                    column="delivered"
                    isPending={isPending}
                    onAccept={handleAcceptDelivery}
                    onDeliver={handleMarkDelivered}
                    t={t}
                    theme={theme}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══ Mobile: Tabbed Single-Column Layout ═══ */}
      <div className="md:hidden">
        {/* Active Tab Content */}
        <div className="space-y-4">
          {mobileTab === 'ready' && (
            <>
              <div className={`flex items-center gap-2 border-b pb-2 ${isLight ? 'border-amber-500/25' : 'border-amber-500/30'}`}>
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <h2 className={`text-sm font-bold uppercase tracking-widest ${isLight ? 'text-amber-700' : 'text-amber-400'}`}>
                  {t('columns.readyForPickup')}
                </h2>
                <span className={`ml-auto text-xs font-mono font-bold px-2 py-0.5 rounded-full ${
                  isLight ? 'bg-amber-100 text-amber-800' : 'bg-amber-50/15 text-amber-400'
                }`}>
                  {readyOrders.length}
                </span>
              </div>
              {readyOrders.length === 0 ? (
                <div className={`text-center py-16 ${isLight ? 'text-slate-350' : 'text-white/15'}`}>
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
                    stopNumber={stopNumberMap.get(order.id)}
                    isSelected={selectedOrderIds.has(order.id)}
                    onToggleSelect={() => handleToggleSelectOrder(order.id)}
                    onAccept={handleAcceptDelivery}
                    onDeliver={handleMarkDelivered}
                    t={t}
                    theme={theme}
                  />
                ))
              )}
            </>
          )}

          {mobileTab === 'transit' && (
            <>
              <div className={`flex items-center gap-2 border-b pb-2 ${isLight ? 'border-blue-500/25' : 'border-blue-500/30'}`}>
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <h2 className={`text-sm font-bold uppercase tracking-widest ${isLight ? 'text-blue-700' : 'text-blue-400'}`}>
                  {t('columns.inTransit')}
                </h2>
                <span className={`ml-auto text-xs font-mono font-bold px-2 py-0.5 rounded-full ${
                  isLight ? 'bg-blue-100 text-blue-800' : 'bg-blue-50/15 text-blue-400'
                }`}>
                  {transitOrders.length}
                </span>
              </div>
              {transitOrders.length === 0 ? (
                <div className={`text-center py-16 ${isLight ? 'text-slate-350' : 'text-white/15'}`}>
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
                    theme={theme}
                  />
                ))
              )}
            </>
          )}

          {mobileTab === 'delivered' && (
            <>
              <div className={`flex items-center gap-2 border-b pb-2 ${isLight ? 'border-emerald-500/25' : 'border-emerald-500/30'}`}>
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <h2 className={`text-sm font-bold uppercase tracking-widest ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>
                  {t('columns.delivered')}
                </h2>
                <span className={`ml-auto text-xs font-mono font-bold px-2 py-0.5 rounded-full ${
                  isLight ? 'bg-emerald-100 text-emerald-800' : 'bg-emerald-50/15 text-emerald-400'
                }`}>
                  {deliveredOrders.length}
                </span>
              </div>
              {deliveredOrders.length === 0 ? (
                <div className={`text-center py-16 ${isLight ? 'text-slate-350' : 'text-white/15'}`}>
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
                    theme={theme}
                  />
                ))
              )}
            </>
          )}
        </div>
      </div>

      {/* ═══ Mobile Bottom Navigation ═══ */}
      <div className={`md:hidden fixed bottom-0 left-0 right-0 z-50 border-t safe-area-bottom backdrop-blur-xl ${
        isLight ? 'bg-white/95 border-slate-200' : 'bg-[#0A0F24]/95 border-white/[0.06]'
      }`}>
        <div className="grid grid-cols-3 gap-0">
          <button
            onClick={() => setMobileTab('ready')}
            className={`flex flex-col items-center gap-1 py-3 transition-colors relative ${
              mobileTab === 'ready' 
                ? 'text-amber-500 font-bold' 
                : (isLight ? 'text-slate-400 hover:text-slate-600' : 'text-white/30 hover:text-white/50')
            }`}
          >
            <Package className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase tracking-wider">{t('mobile.ready')}</span>
            {readyOrders.length > 0 && (
              <span className="absolute top-1.5 right-1/4 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 text-[9px] font-black text-white px-1 shadow-md shadow-amber-500/30">
                {readyOrders.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setMobileTab('transit')}
            className={`flex flex-col items-center gap-1 py-3 transition-colors relative ${
              mobileTab === 'transit' 
                ? 'text-blue-500 font-bold' 
                : (isLight ? 'text-slate-400 hover:text-slate-600' : 'text-white/30 hover:text-white/50')
            }`}
          >
            <Truck className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase tracking-wider">{t('mobile.transit')}</span>
            {transitOrders.length > 0 && (
              <span className="absolute top-1.5 right-1/4 flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-500 text-[9px] font-black text-white px-1 shadow-md shadow-blue-500/30">
                {transitOrders.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setMobileTab('delivered')}
            className={`flex flex-col items-center gap-1 py-3 transition-colors relative ${
              mobileTab === 'delivered' 
                ? 'text-emerald-500 font-bold' 
                : (isLight ? 'text-slate-400 hover:text-slate-600' : 'text-white/30 hover:text-white/50')
            }`}
          >
            <CheckCircle2 className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase tracking-wider">{t('mobile.delivered')}</span>
            {deliveredOrders.length > 0 && (
              <span className="absolute top-1.5 right-1/4 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500 text-[9px] font-black text-white px-1 shadow-md shadow-emerald-500/30">
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
