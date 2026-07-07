'use client';

import React, { useState, useEffect, useCallback, useRef, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import KdsOrderCard, { type KdsOrder } from './kds-order-card';
import { kdsStartPreparingAction, kdsMarkReadyAction } from '@/app/admin/kds/actions';
import { useKdsAlerts } from '@/hooks/use-kds-alerts';
import NotificationPermissionCard from '@/components/admin/alerts/notification-permission-card';
import KdsAlertBanner from '@/components/admin/alerts/kds-alert-banner';
import {
  Wifi,
  WifiOff,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  RefreshCw,
  ChefHat,
  Clock,

  Sun,
  Moon,
} from 'lucide-react';

type Props = {
  initialOrders: KdsOrder[];
  userRole: string;
};

const KITCHEN_STATUSES = ['approved', 'preparing'];
const POLL_INTERVAL = 30000; // 30 seconds fallback

export default function KdsBoard({ initialOrders, userRole }: Props) {
  const router = useRouter();
  const t = useTranslations('kds');
  const [isPending, startTransition] = useTransition();

  const [orders, setOrders] = useState<KdsOrder[]>(initialOrders);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const {
    soundEnabled,
    toggleSound,
    unlockAudio
  } = useKdsAlerts(orders);

  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [newOrderIds, setNewOrderIds] = useState<Set<string>>(new Set());
  const [unseenOrderIds, setUnseenOrderIds] = useState<Set<string>>(new Set());

  // Track known order IDs to detect new arrivals
  const knownOrderIdsRef = useRef<Set<string>>(new Set(initialOrders.map(o => o.id)));

  // Load preferences from localStorage
  useEffect(() => {
    setLastUpdated(new Date());
    const storedTheme = localStorage.getItem('kds_theme') as 'dark' | 'light';
    if (storedTheme) {
      setTheme(storedTheme);
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('kds_theme', next);
      window.dispatchEvent(new CustomEvent('kds-theme-change', { detail: next }));
      return next;
    });
  }, []);

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev);
  }, []);

  // Fetch latest orders from server
  const fetchOrders = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: freshOrders, error } = await supabase
        .from('orders')
        .select(`
          id, status, order_type, customer_name, customer_notes,
          estimated_time, payment_method, created_at, approved_at,
          preparing_at, ready_at, dispatched_at, updated_at,
          table_id,
          dining_tables (
            table_number
          )
        `)
        .in('status', KITCHEN_STATUSES)
        .order('approved_at', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: true });

      if (error) {
        console.error('KDS fetch error:', error);
        return;
      }

      if (!freshOrders) return;

      // Load items for these orders
      const orderIds = freshOrders.map(o => o.id);
      let itemsMap: Record<string, any[]> = {};

      if (orderIds.length > 0) {
        const { data: items } = await supabase
          .from('order_items')
          .select(`
            id, order_id, item_name_pl, item_name_en, quantity,
            customer_notes, kitchen_notes, allergens_snapshot, spice_level_snapshot
          `)
          .in('order_id', orderIds);

        (items || []).forEach(item => {
          if (!itemsMap[item.order_id]) itemsMap[item.order_id] = [];
          itemsMap[item.order_id].push(item);
        });
      }

      const assembled: KdsOrder[] = freshOrders.map(o => {
        const diningTable = (o as any).dining_tables;
        return {
          ...o,
          customer_first_name: o.customer_name ? o.customer_name.split(' ')[0] : '',
          items: itemsMap[o.id] || [],
          table_number: diningTable ? diningTable.table_number : null,
        };
      });

      // Detect new approved orders for sound alert & visual highlight
      const newIds: string[] = [];
      assembled.forEach(o => {
        if (o.status === 'approved' && !knownOrderIdsRef.current.has(o.id)) {
          newIds.push(o.id);
        }
      });

      if (newIds.length > 0) {
        setUnseenOrderIds(prev => {
          const next = new Set(prev);
          newIds.forEach(id => next.add(id));
          return next;
        });

        const newIdsSet = new Set(newIds);
        setNewOrderIds(newIdsSet);
        // Clear "new" indicator after 5 seconds
        setTimeout(() => setNewOrderIds(new Set()), 5000);
      }

      // Update known IDs
      knownOrderIdsRef.current = new Set(assembled.map(o => o.id));
      setOrders(assembled);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('KDS fetch error:', err);
    }
  }, []);

  // Realtime subscription + polling fallback
  useEffect(() => {
    const supabase = createClient();

    // Subscribe to Realtime changes on orders table
    const channel = supabase
      .channel('kds-orders')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          // Any change to orders table → refetch
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

    // Polling fallback every 30 seconds
    const pollInterval = setInterval(() => {
      fetchOrders();
    }, POLL_INTERVAL);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [fetchOrders]);

  // Manual refresh
  const handleRefresh = () => {
    fetchOrders();
  };

  // Action handlers
  const handleStartPreparing = (orderId: string) => {
    setErrorMessage(null);
    startTransition(async () => {
      const res = await kdsStartPreparingAction(orderId);
      if (res.success) {
        setUnseenOrderIds(prev => {
          const next = new Set(prev);
          next.delete(orderId);
          return next;
        });
        fetchOrders();
      } else {
        setErrorMessage(res.error || t('errorGeneric'));
      }
    });
  };

  const handleMarkReady = (orderId: string) => {
    setErrorMessage(null);
    startTransition(async () => {
      const res = await kdsMarkReadyAction(orderId);
      if (res.success) {
        setUnseenOrderIds(prev => {
          const next = new Set(prev);
          next.delete(orderId);
          return next;
        });
        fetchOrders();
      } else {
        setErrorMessage(res.error || t('errorGeneric'));
      }
    });
  };

  // Categorize orders into columns
  const newOrders = orders.filter(o => o.status === 'approved');
  const preparingOrders = orders.filter(o => o.status === 'preparing');

  const formatTime = (d: Date) =>
    d.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      timeZone: 'Europe/Warsaw',
    });

  return (
    <div 
      onClick={unlockAudio}
      className={`notranslate ${
        isFullscreen 
          ? `fixed inset-0 z-50 overflow-auto p-6 transition-colors duration-300 ${
              theme === 'light' ? 'admin-theme bg-background text-foreground' : 'bg-[#070B1E] text-white'
            }`
          : ''
      }`}
      translate="no"
    >
      {/* KDS Header Bar */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
        isFullscreen ? 'mb-6' : 'mb-6'
      }`}>
        <div className="flex items-center gap-3">
          <ChefHat className="w-7 h-7 text-primary" />
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-primary tracking-wide">
            {t('title')}
          </h1>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Connection Status */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
            isConnected
              ? 'border-green-500/30 bg-green-500/10 text-green-400'
              : 'border-yellow-500/30 bg-yellow-500/10 text-yellow-500'
          }`}>
            {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {isConnected ? t('live') : t('reconnecting')}
          </div>

          {/* Last Updated */}
          <span className="text-[10px] text-muted-foreground/50 font-mono">
            {t('lastUpdated')}: {lastUpdated ? formatTime(lastUpdated) : '--:--:--'}
          </span>          {/* Refresh */}
          <button
            onClick={handleRefresh}
            className="p-2 rounded-lg border border-border dark:border-white/10 hover:bg-muted dark:hover:bg-white/5 text-muted-foreground hover:text-foreground dark:hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label={t('refresh')}
          >
            <RefreshCw className="w-4 h-4" />
          </button>
 
          {/* Sound Toggle */}
          <button
            onClick={toggleSound}
            className={`p-2 rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${
              soundEnabled
                ? 'border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-400'
                : 'border-border dark:border-white/10 hover:bg-muted dark:hover:bg-white/5 text-muted-foreground hover:text-foreground dark:hover:text-white'
            }`}
            aria-label={soundEnabled ? t('soundOn') : t('soundOff')}
            title={soundEnabled ? t('soundOn') : t('soundOff')}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg border border-border dark:border-white/10 hover:bg-muted dark:hover:bg-white/5 text-muted-foreground hover:text-foreground dark:hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-primary" />}
          </button>
 
          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-lg border border-border dark:border-white/10 hover:bg-muted dark:hover:bg-white/5 text-muted-foreground hover:text-foreground dark:hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label={isFullscreen ? t('exitFullscreen') : t('fullscreen')}
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className={`mx-${isFullscreen ? '6' : '0'} mb-4 p-3 text-xs bg-red-500/10 border border-red-500/30 rounded text-red-400 text-center`}>
          {errorMessage}
          <button
            onClick={() => setErrorMessage(null)}
            className="ml-3 underline hover:no-underline"
          >
            {t('dismiss')}
          </button>
        </div>
      )}

      {/* Notifications / Alert Banners */}
      <div className={`mx-${isFullscreen ? '6' : '0'} mb-6 space-y-4`}>
        <NotificationPermissionCard
          soundEnabled={soundEnabled}
          onToggleSound={toggleSound}
          onUnlockAudio={unlockAudio}
          alertType="kds"
        />
        
        <KdsAlertBanner 
          unseenCount={unseenOrderIds.size}
          onMarkSeen={() => setUnseenOrderIds(new Set())}
        />
      </div>

      {/* Two Column KDS Grid */}
      <div className={`grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 ${
        isFullscreen ? 'px-6 pb-6' : ''
      }`}>
        {/* Column 1: New / Confirmed */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b-2 border-amber-500/30 dark:border-amber-400/40 pb-2">
            <div className="w-3 h-3 rounded-full bg-amber-600 dark:bg-amber-400" />
            <h2 className="text-lg font-bold text-amber-700 dark:text-amber-400 uppercase tracking-widest">
              {t('columnNew')}
            </h2>
            <span className="ml-auto bg-amber-500/10 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-mono font-bold px-2 py-0.5 rounded-full">
              {newOrders.length}
            </span>
          </div>

          {newOrders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground/30">
              <Clock className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">{t('noNewOrders')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {newOrders.map(order => (
                <KdsOrderCard
                  key={order.id}
                  order={order}
                  onStartPreparing={handleStartPreparing}
                  onMarkReady={handleMarkReady}
                  isPending={isPending}
                  isNew={newOrderIds.has(order.id)}
                  isUnseen={unseenOrderIds.has(order.id)}
                  theme={theme}
                />
              ))}
            </div>
          )}
        </div>

        {/* Column 2: Preparing */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b-2 border-blue-500/30 dark:border-blue-400/40 pb-2">
            <div className="w-3 h-3 rounded-full bg-blue-600 dark:bg-blue-400" />
            <h2 className="text-lg font-bold text-blue-700 dark:text-blue-400 uppercase tracking-widest">
              {t('columnPreparing')}
            </h2>
            <span className="ml-auto bg-blue-500/10 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 text-xs font-mono font-bold px-2 py-0.5 rounded-full">
              {preparingOrders.length}
            </span>
          </div>

          {preparingOrders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground/30">
              <ChefHat className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">{t('noPreparingOrders')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {preparingOrders.map(order => (
                <KdsOrderCard
                  key={order.id}
                  order={order}
                  onStartPreparing={handleStartPreparing}
                  onMarkReady={handleMarkReady}
                  isPending={isPending}
                  isUnseen={unseenOrderIds.has(order.id)}
                  theme={theme}
                />
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
