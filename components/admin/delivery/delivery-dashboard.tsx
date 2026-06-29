'use client';

import React, { useState, useEffect, useCallback, useRef, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { completeOrderAction } from '@/app/admin/orders/actions';
import {
  Wifi,
  WifiOff,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  RefreshCw,
  Truck,
  ShoppingBag,
  Clock,
  CheckCircle,
  Phone,
  MapPin,
  ExternalLink,
  ChevronRight,
  Search,
  Sparkles,
  Map,
  List,
  AlertTriangle,
  Info,
  Calendar
} from 'lucide-react';

type OrderItem = {
  id: string;
  order_id: string;
  item_name_pl: string;
  item_name_en: string;
  quantity: number;
  customer_notes: string | null;
  kitchen_notes: string | null;
};

type DeliveryOrder = {
  id: string;
  id_text: string;
  status: string;
  order_type: 'delivery' | 'takeaway';
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  customer_notes: string | null;
  delivery_address: string | null;
  delivery_postal_code: string | null;
  delivery_city: string | null;
  delivery_latitude: number | null;
  delivery_longitude: number | null;
  route_distance_km: number | null;
  route_duration_car_minutes: number | null;
  route_duration_walk_minutes: number | null;
  delivery_fee: number;
  items_subtotal: number;
  packaging_total: number;
  other_charges_total: number;
  discount_total: number;
  total_amount: number;
  payment_method: string;
  payment_status: string;
  estimated_time: string | null;
  created_at: string;
  approved_at: string | null;
  preparing_at: string | null;
  ready_at: string | null;
  dispatched_at: string | null;
  updated_at: string;
  items: OrderItem[];
};

type Props = {
  initialOrders: DeliveryOrder[];
  restaurantAddress: string;
  restaurantCoordinates: {
    status: string;
    latitude: number | null;
    longitude: number | null;
  };
  userRole: string;
};

// 1. Elapsed Time Hook
function useElapsedTime(startTime: string | null) {
  const [elapsed, setElapsed] = useState('');

  useEffect(() => {
    if (!startTime) {
      setElapsed('');
      return;
    }

    const update = () => {
      const diff = Date.now() - new Date(startTime).getTime();
      const mins = Math.max(0, Math.floor(diff / 60000));
      if (mins < 60) {
        setElapsed(`${mins}m`);
      } else {
        const hrs = Math.floor(mins / 60);
        const remainMins = mins % 60;
        setElapsed(`${hrs}h ${remainMins}m`);
      }
    };

    update();
    const interval = setInterval(update, 30000);
    return () => clearInterval(interval);
  }, [startTime]);

  return elapsed;
}

// 2. Order Card Component
function DeliveryOrderCard({
  order,
  isSelected,
  onSelect,
  onComplete,
  locale
}: {
  order: DeliveryOrder;
  isSelected: boolean;
  onSelect: () => void;
  onComplete: (id: string, paymentReceived: boolean) => void;
  locale: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [paymentReceived, setPaymentReceived] = useState(order.payment_status === 'paid');

  // Track elapsed time based on status
  const timeStart = order.status === 'out_for_delivery'
    ? order.dispatched_at
    : order.status === 'ready_for_pickup'
      ? order.ready_at
      : order.preparing_at || order.approved_at || order.created_at;

  const elapsed = useElapsedTime(timeStart);

  const getUrgencyStyles = () => {
    if (!timeStart) return 'border-border';
    const diff = Date.now() - new Date(timeStart).getTime();
    const mins = Math.floor(diff / 60000);

    if (order.status === 'out_for_delivery') {
      if (mins >= 45) return 'border-l-4 border-l-red-500 shadow-md shadow-red-500/5';
      if (mins >= 30) return 'border-l-4 border-l-amber-500 shadow-md shadow-amber-500/5';
      return 'border-l-4 border-l-blue-500';
    }
    if (order.status === 'ready_for_pickup') {
      if (mins >= 30) return 'border-l-4 border-l-red-500 shadow-md shadow-red-500/5';
      return 'border-l-4 border-l-green-500';
    }
    return 'border-l-4 border-l-slate-400';
  };

  const getPaymentLabel = (method: string) => {
    switch (method) {
      case 'cash_on_delivery': return locale === 'pl' ? 'Gotówka przy dostawie' : 'Cash on Delivery';
      case 'card_on_delivery': return locale === 'pl' ? 'Karta przy dostawie' : 'Card on Delivery';
      case 'cash_on_pickup': return locale === 'pl' ? 'Gotówka przy odbiorze' : 'Cash on Pickup';
      case 'card_on_pickup': return locale === 'pl' ? 'Karta przy odbiorze' : 'Card on Pickup';
      default: return method;
    }
  };

  return (
    <div
      onClick={onSelect}
      className={`bg-card text-card-foreground border rounded-xl p-4 transition-all duration-200 cursor-pointer hover:shadow-md hover:border-primary/40 flex flex-col gap-3 relative overflow-hidden ${getUrgencyStyles()} ${
        isSelected ? 'ring-2 ring-primary border-transparent bg-primary/[0.02]' : ''
      }`}
    >
      {/* Top row: Order # & Status Badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-black text-primary uppercase tracking-wider">
            #{order.id_text || order.id.substring(0, 8)}
          </span>
          <span className="text-[10px] text-muted-foreground/60 font-mono">
            {new Date(order.created_at).toLocaleTimeString(locale === 'pl' ? 'pl-PL' : 'en-US', {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {elapsed && (
            <span className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground bg-secondary/80 px-2 py-0.5 rounded-full font-mono">
              <Clock className="w-3 h-3 text-primary" />
              {elapsed}
            </span>
          )}
          <span className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full ${
            order.status === 'out_for_delivery'
              ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
              : order.status === 'ready_for_pickup'
                ? 'bg-green-500/10 text-green-500 border border-green-500/20'
                : order.status === 'preparing'
                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                  : 'bg-slate-500/10 text-slate-500 border border-slate-500/20'
          }`}>
            {order.status === 'out_for_delivery'
              ? (locale === 'pl' ? 'W dostawie' : 'In Transit')
              : order.status === 'ready_for_pickup'
                ? (locale === 'pl' ? 'Do odbioru' : 'Ready')
                : order.status === 'preparing'
                  ? (locale === 'pl' ? 'Przygotowywanie' : 'Preparing')
                  : (locale === 'pl' ? 'Zatwierdzone' : 'Approved')}
          </span>
        </div>
      </div>

      {/* Middle row: Customer Info */}
      <div className="space-y-1">
        <h4 className="font-sans font-bold text-sm text-foreground">{order.customer_name}</h4>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Phone className="w-3.5 h-3.5 shrink-0 text-primary/70" />
          <a
            href={`tel:${order.customer_phone}`}
            onClick={(e) => e.stopPropagation()}
            className="hover:text-primary hover:underline font-medium font-mono"
          >
            {order.customer_phone}
          </a>
        </div>
        {order.order_type === 'delivery' && order.delivery_address && (
          <div className="flex items-start gap-2 text-xs text-muted-foreground pt-1.5 border-t border-border/40 mt-1.5">
            <MapPin className="w-3.5 h-3.5 shrink-0 text-primary/70 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-foreground">{order.delivery_address}</p>
              <p className="text-[10px] opacity-75">{order.delivery_postal_code} {order.delivery_city}</p>
              {order.route_distance_km !== null && (
                <p className="text-[10px] text-primary/80 font-bold mt-0.5 font-mono">
                  {order.route_distance_km} km ({order.route_duration_car_minutes} min)
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Quick Details Toggle */}
      <div className="flex items-center justify-between text-xs pt-1.5 border-t border-border/40">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
          }}
          className="text-muted-foreground hover:text-primary flex items-center gap-1 font-bold text-[11px] uppercase tracking-wider transition-colors"
        >
          <span>{locale === 'pl' ? 'Szczegóły' : 'Details'}</span>
          <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`} />
        </button>

        <span className="font-sans font-black text-sm text-foreground">
          {(order.total_amount).toFixed(2)} PLN
        </span>
      </div>

      {/* Expanded view: Items list, notes, payment info */}
      {expanded && (
        <div className="space-y-3 pt-2 text-xs border-t border-border/20 text-muted-foreground animate-fadeIn">
          {/* Items */}
          <div className="space-y-1 bg-secondary/35 p-2.5 rounded-lg border border-border/30">
            <p className="font-bold text-[10px] text-foreground uppercase tracking-widest mb-1.5">
              {locale === 'pl' ? 'Pozycje Zamówienia' : 'Order Items'}
            </p>
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between items-start text-xs text-foreground/90 border-b border-border/10 pb-1 last:border-0 last:pb-0">
                <span>
                  {item.quantity}x {locale === 'pl' ? item.item_name_pl : item.item_name_en}
                </span>
              </div>
            ))}
          </div>

          {/* Customer notes */}
          {order.customer_notes && (
            <div className="bg-primary/5 border border-primary/20 p-2 rounded-lg text-foreground">
              <span className="font-bold text-[9px] uppercase tracking-widest text-primary block mb-0.5">
                {locale === 'pl' ? 'Uwagi Klienta' : 'Customer Notes'}
              </span>
              <p className="italic text-xs leading-relaxed">&quot;{order.customer_notes}&quot;</p>
            </div>
          )}

          {/* Payment & Method */}
          <div className="grid grid-cols-2 gap-2 text-[10px] bg-secondary/20 p-2 rounded-lg font-mono">
            <div>
              <span className="block text-muted-foreground/60">{locale === 'pl' ? 'PŁATNOŚĆ' : 'PAYMENT'}</span>
              <span className="font-bold text-foreground">{getPaymentLabel(order.payment_method)}</span>
            </div>
            <div>
              <span className="block text-muted-foreground/60">{locale === 'pl' ? 'STATUS' : 'STATUS'}</span>
              <span className={`font-bold uppercase ${order.payment_status === 'paid' ? 'text-green-500' : 'text-red-400'}`}>
                {order.payment_status === 'paid' ? (locale === 'pl' ? 'Opłacone' : 'Paid') : (locale === 'pl' ? 'Nieopłacone' : 'Unpaid')}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Card Footer Actions */}
      <div className="flex gap-2 mt-1">
        {order.order_type === 'delivery' && order.delivery_address && (
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
              `${order.delivery_address}, ${order.delivery_postal_code} ${order.delivery_city}`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex-1"
          >
            <button className="w-full py-2 bg-secondary text-secondary-foreground text-[10px] font-black uppercase tracking-wider rounded-lg border border-border hover:bg-secondary/80 flex items-center justify-center gap-1.5 transition-colors">
              <ExternalLink className="w-3.5 h-3.5" />
              <span>{locale === 'pl' ? 'Nawiguj' : 'Navigate'}</span>
            </button>
          </a>
        )}
        
        {(order.status === 'out_for_delivery' || order.status === 'ready_for_pickup') && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setPaymentReceived(order.payment_status === 'paid');
              setShowConfirmModal(true);
            }}
            className="flex-1 py-2 bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-wider rounded-lg border border-primary/20 hover:opacity-90 flex items-center justify-center gap-1.5 transition-all shadow-sm"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            <span>
              {order.order_type === 'takeaway'
                ? (locale === 'pl' ? 'Wydaj' : 'Complete Pickup')
                : (locale === 'pl' ? 'Dostarczono' : 'Complete Delivery')}
            </span>
          </button>
        )}
      </div>

      {/* Complete Order Dialog Confirmation Modal */}
      {showConfirmModal && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn"
        >
          <div className="bg-card text-card-foreground border border-border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif font-black text-lg text-foreground">
                  {locale === 'pl' ? 'Finalizacja Zamówienia' : 'Complete Order'}
                </h3>
                <p className="text-xs text-muted-foreground font-mono">
                  #{order.id_text || order.id.substring(0, 8)}
                </p>
              </div>
            </div>

            <p className="text-sm leading-relaxed">
              {locale === 'pl'
                ? 'Czy chcesz oznaczyć to zamówienie jako sfinalizowane i rozliczone?'
                : 'Are you sure you want to mark this order as completed and settled?'}
            </p>

            {/* Payment Details in Modal */}
            <div className="bg-secondary/40 border border-border/40 p-4 rounded-xl space-y-3 font-sans text-xs">
              <div className="flex justify-between items-center text-foreground font-bold">
                <span>{locale === 'pl' ? 'Sposób płatności:' : 'Payment Method:'}</span>
                <span className="font-mono text-primary">{getPaymentLabel(order.payment_method)}</span>
              </div>
              <div className="flex justify-between items-center text-foreground font-bold">
                <span>{locale === 'pl' ? 'Kwota zamówienia:' : 'Order Total:'}</span>
                <span className="font-mono text-lg text-foreground">{(order.total_amount).toFixed(2)} PLN</span>
              </div>

              {/* Payment verification checkbox */}
              <label className="flex items-center gap-3 p-3 bg-card border border-border/50 rounded-lg cursor-pointer hover:bg-secondary/20 transition-all select-none mt-2">
                <input
                  type="checkbox"
                  checked={paymentReceived}
                  onChange={(e) => setPaymentReceived(e.target.checked)}
                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary cursor-pointer accent-primary"
                />
                <div className="text-left">
                  <span className="block font-bold text-foreground">
                    {locale === 'pl' ? 'Płatność Otrzymana' : 'Payment Received'}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {locale === 'pl'
                      ? 'Oznacz płatność jako uregulowaną w systemie.'
                      : 'Mark the payment status as paid.'}
                  </span>
                </div>
              </label>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 justify-end pt-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 border border-border rounded-lg hover:bg-secondary text-xs uppercase tracking-wider font-bold transition-all"
              >
                {locale === 'pl' ? 'Anuluj' : 'Cancel'}
              </button>
              <button
                onClick={() => {
                  onComplete(order.id, paymentReceived);
                  setShowConfirmModal(false);
                }}
                className="px-4 py-2 bg-primary text-primary-foreground border border-primary/20 rounded-lg hover:opacity-90 text-xs uppercase tracking-wider font-black transition-all shadow-md shadow-primary/10"
              >
                {locale === 'pl' ? 'Zatwierdź i Zakończ' : 'Confirm & Complete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 3. Main Dashboard Client Component
export default function DeliveryDashboard({
  initialOrders,
  restaurantAddress,
  restaurantCoordinates,
  userRole
}: Props) {
  const router = useRouter();
  const t = useTranslations('deliveryDashboard');
  const [orders, setOrders] = useState<DeliveryOrder[]>(initialOrders);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'delivery' | 'takeaway' | 'preparing'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const [isPending, startTransition] = useTransition();

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<Record<string, any>>({});
  const polylineRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const knownOrderIdsRef = useRef<Set<string>>(new Set(initialOrders.map(o => o.id)));
  const isFirstLoadRef = useRef(true);

  // Sync state with props when NextJS server component revalidates/refetches
  useEffect(() => {
    setOrders(initialOrders);
  }, [initialOrders]);

  // Determine current locale from cookie or document root
  const [locale, setLocale] = useState('pl');
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const match = document.cookie.match(/(^|;)\s*NEXT_LOCALE\s*=\s*([^;]+)/);
      if (match) {
        setLocale(match[2]);
      }
    }
  }, []);

  // 4. Sound Alerts Initializer & Audio Player
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem('delivery_sound_enabled');
    if (stored === 'true') {
      setSoundEnabled(true);
    }
    isFirstLoadRef.current = false;
  }, []);

  const toggleSound = () => {
    setSoundEnabled((prev) => {
      const next = !prev;
      localStorage.setItem('delivery_sound_enabled', String(next));
      if (next) playAlertSound();
      return next;
    });
  };

  const playAlertSound = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      // Premium double service bell chime
      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.frequency.setValueAtTime(987.77, now); // B5 note
      osc1.type = 'sine';
      gain1.gain.setValueAtTime(0.15, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc1.start(now);
      osc1.stop(now + 0.35);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.frequency.setValueAtTime(1318.51, now + 0.1); // E6 note
      osc2.type = 'sine';
      gain2.gain.setValueAtTime(0.15, now + 0.1);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc2.start(now + 0.1);
      osc2.stop(now + 0.45);

    } catch (err) {
      console.error('[Delivery Alerts] Failed to play chime:', err);
    }
  }, []);

  // Monitor incoming orders to play alerts
  useEffect(() => {
    if (isFirstLoadRef.current) return;

    let playedSound = false;
    orders.forEach((o) => {
      if (!knownOrderIdsRef.current.has(o.id)) {
        knownOrderIdsRef.current.add(o.id);
        // Only trigger alert for ready/dispatched orders
        if ((o.status === 'ready_for_pickup' || o.status === 'out_for_delivery') && soundEnabled && !playedSound) {
          playAlertSound();
          playedSound = true;
        }
      }
    });
  }, [orders, soundEnabled, playAlertSound]);

  // 5. Connect Realtime subscription state mapping
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('delivery-dashboard-connection')
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Manual router refresh triggering revalidation
  const handleRefresh = useCallback(() => {
    startTransition(() => {
      router.refresh();
    });
  }, [router]);

  // Complete Order action trigger
  const handleCompleteOrder = async (orderId: string, paymentReceived: boolean) => {
    startTransition(async () => {
      const res = await completeOrderAction(orderId, paymentReceived);
      if (res.success) {
        // Optimistically remove or update order status in state
        setOrders(prev => prev.filter(o => o.id !== orderId));
        if (selectedOrderId === orderId) {
          setSelectedOrderId(null);
        }
        handleRefresh();
      } else {
        alert(locale === 'pl' ? `Błąd: ${res.error}` : `Error: ${res.error}`);
      }
    });
  };

  // Fullscreen container toggling
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true));
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false));
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // 6. Leaflet Map Loader & Synchronization
  const hasCoords = restaurantCoordinates.latitude !== null && restaurantCoordinates.longitude !== null;

  useEffect(() => {
    if (!hasCoords || !mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    // A. Inject Leaflet CSS
    const linkId = 'leaflet-css-cdn';
    let link = document.getElementById(linkId) as HTMLLinkElement;
    if (!link) {
      link = document.createElement('link');
      link.id = linkId;
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    // B. Inject Leaflet Script
    const scriptId = 'leaflet-js-cdn';
    let script = document.getElementById(scriptId) as HTMLScriptElement;
    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.async = true;
      document.body.appendChild(script);
    }

    const initMap = () => {
      const L = (window as any).L;
      if (!L || !mapContainerRef.current) return;

      try {
        const map = L.map(mapContainerRef.current, {
          scrollWheelZoom: true,
          zoomControl: true
        }).setView([restaurantCoordinates.latitude!, restaurantCoordinates.longitude!], 13);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);

        // Add Restaurant Marker (Gold Saffron Icon)
        const restIcon = L.divIcon({
          className: 'custom-restaurant-marker',
          html: `
            <div class="w-9 h-9 bg-amber-600 border-2 border-white rounded-full shadow-lg flex items-center justify-center text-white ring-4 ring-amber-600/30">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
              </svg>
            </div>
          `,
          iconSize: [36, 36],
          iconAnchor: [18, 18],
          popupAnchor: [0, -18]
        });

        L.marker([restaurantCoordinates.latitude!, restaurantCoordinates.longitude!], { icon: restIcon })
          .addTo(map)
          .bindPopup(`<b>Namaste Indian Restaurant</b><br><span class="text-xs text-muted-foreground">${restaurantAddress}</span>`);

        mapInstanceRef.current = map;
      } catch (err) {
        console.error('Leaflet Map Initialization error:', err);
      }
    };

    if ((window as any).L) {
      initMap();
    } else {
      script.addEventListener('load', initMap);
    }

    return () => {
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        } catch (err) {
          console.error('Error removing map instance:', err);
        }
      }
    };
  }, [hasCoords, restaurantCoordinates, restaurantAddress]);

  // Synchronize Order Markers on Map
  useEffect(() => {
    const L = (window as any).L;
    const map = mapInstanceRef.current;
    if (!L || !map) return;

    // 1. Clear old order markers
    Object.values(markersRef.current).forEach((marker) => map.removeLayer(marker));
    markersRef.current = {};

    // 2. Clear previous polyline
    if (polylineRef.current) {
      map.removeLayer(polylineRef.current);
      polylineRef.current = null;
    }

    // 3. Filter orders to display on map (only deliveries with valid coordinates)
    const mapOrders = orders.filter(
      (o) => o.order_type === 'delivery' && o.delivery_latitude !== null && o.delivery_longitude !== null
    );

    mapOrders.forEach((order) => {
      const lat = Number(order.delivery_latitude);
      const lng = Number(order.delivery_longitude);

      // Create different color markers based on status
      const colorClass = order.status === 'out_for_delivery'
        ? 'bg-blue-500 ring-blue-500/30'
        : order.status === 'ready_for_pickup'
          ? 'bg-green-500 ring-green-500/30'
          : 'bg-amber-500 ring-amber-500/30'; // preparing / approved

      const iconSvg = order.status === 'out_for_delivery'
        ? `<svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125a1.125 1.125 0 001.125-1.125V9.75M8.25 18.75a1.5 1.5 0 01-3 0M21.75 9.75L18.75 6m3 3.75l-3 3.75m-6.75-7.5h7.5m-7.5 0v3m0 0H8.25m6.75-3v-1.5m0 1.5h1.5"></path></svg>`
        : `<svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5h6.75M8.625 13.5h6.75"></path></svg>`;

      const orderIcon = L.divIcon({
        className: `custom-order-marker-${order.id}`,
        html: `
          <div class="w-8 h-8 ${colorClass} border-2 border-white rounded-full shadow-lg flex items-center justify-center ring-4 transition-all hover:scale-110">
            ${iconSvg}
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -16]
      });

      const routeText = order.route_distance_km !== null
        ? `<div class="mt-1 font-mono text-[10px] text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200 inline-block">${order.route_distance_km} km (${order.route_duration_car_minutes} min)</div>`
        : '';

      const popupContent = `
        <div class="p-1 font-sans">
          <div class="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wider text-primary mb-1">
            <span>#${order.id_text || order.id.substring(0, 8)}</span>
            <span class="text-[10px] text-muted-foreground font-mono font-normal">(${order.status})</span>
          </div>
          <div class="font-bold text-sm text-slate-800">${order.customer_name}</div>
          <div class="text-xs text-slate-500 font-mono mt-0.5">${order.customer_phone}</div>
          <div class="text-xs text-slate-700 mt-1 max-w-[180px] font-medium leading-tight">${order.delivery_address}</div>
          ${routeText}
        </div>
      `;

      const marker = L.marker([lat, lng], { icon: orderIcon })
        .addTo(map)
        .bindPopup(popupContent);

      marker.on('click', () => {
        setSelectedOrderId(order.id);
      });

      markersRef.current[order.id] = marker;
    });

    // 4. Focus/highlight selected order
    if (selectedOrderId && markersRef.current[selectedOrderId]) {
      const selectedOrder = orders.find((o) => o.id === selectedOrderId);
      if (selectedOrder && selectedOrder.delivery_latitude !== null && selectedOrder.delivery_longitude !== null) {
        const orderLat = Number(selectedOrder.delivery_latitude);
        const orderLng = Number(selectedOrder.delivery_longitude);
        const restLat = Number(restaurantCoordinates.latitude);
        const restLng = Number(restaurantCoordinates.longitude);

        // Center on coordinates
        map.setView([orderLat, orderLng], 14);
        markersRef.current[selectedOrderId].openPopup();

        // Draw line from restaurant to order coordinates
        polylineRef.current = L.polyline([[restLat, restLng], [orderLat, orderLng]], {
          color: '#D4AF37',
          weight: 3,
          opacity: 0.8,
          dashArray: '8, 8',
          lineJoin: 'round'
        }).addTo(map);
      }
    }
  }, [orders, selectedOrderId, restaurantCoordinates]);

  // Focus marker when card is clicked
  const handleSelectOrder = (order: DeliveryOrder) => {
    setSelectedOrderId(order.id);
  };

  // Filter orders according to selected Tab and search queries
  const filteredOrders = orders.filter((o) => {
    // 1. Tab filtering
    if (activeTab === 'delivery') {
      if (o.order_type !== 'delivery' || o.status !== 'out_for_delivery') return false;
    } else if (activeTab === 'takeaway') {
      if (o.order_type !== 'takeaway' || o.status !== 'ready_for_pickup') return false;
    } else if (activeTab === 'preparing') {
      if (o.status !== 'preparing' && o.status !== 'approved') return false;
    }

    // 2. Query search filtering
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const name = o.customer_name.toLowerCase();
      const phone = o.customer_phone.toLowerCase();
      const address = (o.delivery_address || '').toLowerCase();
      const idText = (o.id_text || '').toLowerCase();
      return name.includes(q) || phone.includes(q) || address.includes(q) || idText.includes(q);
    }

    return true;
  });

  // Calculate counts for Tab badges
  const totalActiveTransit = orders.filter((o) => o.order_type === 'delivery' && o.status === 'out_for_delivery').length;
  const totalReadyTakeaway = orders.filter((o) => o.order_type === 'takeaway' && o.status === 'ready_for_pickup').length;
  const totalPreparing = orders.filter((o) => o.status === 'preparing' || o.status === 'approved').length;

  return (
    <div className={`flex flex-col h-full bg-background ${isFullscreen ? 'fixed inset-0 z-50 p-6' : ''}`}>
      {/* Top dashboard control bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b border-border pb-4">
        <div>
          <h1 className="font-serif font-black text-2xl text-foreground tracking-tight flex items-center gap-2">
            <Truck className="w-7 h-7 text-primary shrink-0" />
            <span>{t('title')}</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            {t('subtitle')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Live Sync Status indicator */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold font-mono ${
            isConnected
              ? 'bg-green-500/5 text-green-600 dark:text-green-400 border-green-500/20'
              : 'bg-red-500/5 text-red-500 border-red-500/20'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-ping' : 'bg-red-500'}`} />
            <span>{isConnected ? t('messages.connected') : t('messages.disconnected')}</span>
          </div>

          {/* Sound Toggle */}
          <button
            onClick={toggleSound}
            className={`p-2 rounded-lg border text-muted-foreground hover:text-foreground transition-all hover:bg-secondary/40 focus:outline-none focus:ring-2 focus:ring-primary ${
              soundEnabled ? 'border-primary/40 bg-primary/5 text-primary hover:text-primary' : 'border-border'
            }`}
            title={soundEnabled ? 'Disable Chime Alerts' : 'Enable Chime Alerts'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Fullscreen Mode */}
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-all focus:outline-none focus:ring-2 focus:ring-primary"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>

          {/* Refresh Action */}
          <button
            onClick={handleRefresh}
            disabled={isPending}
            className="p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-all focus:outline-none focus:ring-2 focus:ring-primary flex items-center justify-center gap-1.5 disabled:opacity-50"
            title={t('buttons.refresh')}
          >
            <RefreshCw className={`w-4 h-4 ${isPending ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Split Screen Container */}
      <div className="flex-1 grid grid-cols-1 xl:grid-cols-12 gap-6 min-h-0 overflow-hidden">
        {/* Left Side: Filter tools + Order Lists (5 Columns) */}
        <div className="xl:col-span-5 flex flex-col min-h-0">
          {/* Search bar */}
          <div className="relative mb-4 shrink-0">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={locale === 'pl' ? 'Szukaj klienta, telefonu, adresu...' : 'Search customer, phone, address...'}
              className="w-full pl-10 pr-4 py-2 text-xs bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder:text-muted-foreground/50 transition-all"
            />
          </div>

          {/* Tab buttons */}
          <div className="flex gap-1.5 p-1 bg-secondary/30 rounded-xl border border-border/40 mb-4 shrink-0 overflow-x-auto">
            <button
              onClick={() => setActiveTab('all')}
              className={`flex-1 py-2 px-3 text-[10px] uppercase font-black tracking-wider rounded-lg transition-all whitespace-nowrap ${
                activeTab === 'all'
                  ? 'bg-card text-foreground shadow-sm border border-border/50'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <span>{locale === 'pl' ? 'Wszystkie' : 'All'}</span>
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-secondary text-[8px] font-mono border border-border/30">
                {orders.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('delivery')}
              className={`flex-1 py-2 px-3 text-[10px] uppercase font-black tracking-wider rounded-lg transition-all whitespace-nowrap flex items-center justify-center gap-1.5 ${
                activeTab === 'delivery'
                  ? 'bg-card text-foreground shadow-sm border border-border/50'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Truck className="w-3.5 h-3.5 text-blue-500" />
              <span>{locale === 'pl' ? 'W dostawie' : 'In Transit'}</span>
              <span className="px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-500 text-[8px] font-mono font-black border border-blue-500/20">
                {totalActiveTransit}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('takeaway')}
              className={`flex-1 py-2 px-3 text-[10px] uppercase font-black tracking-wider rounded-lg transition-all whitespace-nowrap flex items-center justify-center gap-1.5 ${
                activeTab === 'takeaway'
                  ? 'bg-card text-foreground shadow-sm border border-border/50'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5 text-green-500" />
              <span>{locale === 'pl' ? 'Do odbioru' : 'Ready'}</span>
              <span className="px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-500 text-[8px] font-mono font-black border border-green-500/20">
                {totalReadyTakeaway}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('preparing')}
              className={`flex-1 py-2 px-3 text-[10px] uppercase font-black tracking-wider rounded-lg transition-all whitespace-nowrap flex items-center justify-center gap-1.5 ${
                activeTab === 'preparing'
                  ? 'bg-card text-foreground shadow-sm border border-border/50'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              <span>{locale === 'pl' ? 'Kuchnia' : 'Kitchen'}</span>
              <span className="px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[8px] font-mono font-black border border-amber-500/20">
                {totalPreparing}
              </span>
            </button>
          </div>

          {/* Orders list scroll area */}
          <div className="flex-1 overflow-y-auto space-y-3.5 pr-2 min-h-0">
            {filteredOrders.length === 0 ? (
              <div className="text-center py-16 border border-dashed border-border/40 rounded-2xl bg-card/40 flex flex-col items-center justify-center gap-3">
                <Truck className="w-12 h-12 text-muted-foreground/30 opacity-40 shrink-0" />
                <div className="space-y-1">
                  <p className="font-bold text-sm text-foreground">
                    {locale === 'pl' ? 'Brak zamówień dostawy' : 'No Delivery Orders'}
                  </p>
                  <p className="text-xs text-muted-foreground/75 px-6 max-w-sm mx-auto leading-relaxed">
                    {t('messages.noDeliveryOrders')}
                  </p>
                </div>
              </div>
            ) : (
              filteredOrders.map((order) => (
                <DeliveryOrderCard
                  key={order.id}
                  order={order}
                  isSelected={selectedOrderId === order.id}
                  onSelect={() => handleSelectOrder(order)}
                  onComplete={handleCompleteOrder}
                  locale={locale}
                />
              ))
            )}
          </div>
        </div>

        {/* Right Side: Map Container (7 Columns) */}
        <div className="xl:col-span-7 h-[300px] xl:h-full flex flex-col relative rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
          {!hasCoords ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4">
              <AlertTriangle className="w-12 h-12 text-amber-500 shrink-0 animate-pulse" />
              <div className="space-y-1.5">
                <h4 className="font-serif font-black text-sm uppercase tracking-wider text-foreground">
                  {locale === 'pl' ? 'Współrzędne Niedostępne' : 'Coordinates Unavailable'}
                </h4>
                <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
                  {locale === 'pl'
                    ? 'Współrzędne geograficzne restauracji nie są zweryfikowane w ustawieniach systemowych bazy danych. Proszę zweryfikować adres restauracji.'
                    : 'Restaurant geographic coordinates are not verified in database system settings. Please verify the restaurant address.'}
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Map Canvas */}
              <div
                ref={mapContainerRef}
                className="w-full flex-1 relative bg-[#070B1E]"
                aria-label="Delivery Map Visualizer"
                role="application"
              />

              {/* Map Footer status */}
              <div className="p-3 bg-secondary/35 border-t border-border flex items-center justify-between text-[10px] text-muted-foreground px-4 shrink-0 font-mono">
                <span className="flex items-center gap-1">
                  <Map className="w-3.5 h-3.5 text-primary" />
                  <span>Leaflet OSM Engine</span>
                </span>
                <span>
                  NAMASTE ORIGIN: {restaurantCoordinates.latitude!.toFixed(5)}, {restaurantCoordinates.longitude!.toFixed(5)}
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
