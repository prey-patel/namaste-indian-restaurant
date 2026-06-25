'use client';

import React, { useState, useTransition, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import StatusPill from '@/components/ui/status-pill';
import PremiumCard from '@/components/ui/premium-card';
import GoldSpinner from '@/components/ui/gold-spinner';

import {
  confirmOrderAction,
  rejectOrderAction,
  cancelOrderAction,
  markOrderReadyAction,
  completeOrderAction,
  updateOrderEtaAction,
  startPreparingOrderAction
} from '@/app/admin/orders/actions';
import {
  ConfirmOrderModal,
  RejectOrderModal,
  CancelOrderModal,
  CompleteOrderModal,
  UpdateEtaModal
} from './order-modals';
import { Search, RefreshCw, Eye, Calendar, Clock, ShoppingBag, ArrowRight, X, MapPin, Wifi, WifiOff } from 'lucide-react';
import { useAdminAlerts } from '@/components/admin/alerts/admin-alerts-context';
import NotificationPermissionCard from '@/components/admin/alerts/notification-permission-card';
import OrderAlertBanner from '@/components/admin/alerts/order-alert-banner';

type Order = {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  order_type: 'delivery' | 'takeaway';
  status: 'pending' | 'approved' | 'preparing' | 'ready_for_pickup' | 'out_for_delivery' | 'completed' | 'rejected' | 'cancelled';
  delivery_address: string | null;
  delivery_postal_code: string | null;
  delivery_city: string | null;
  delivery_fee: number;
  items_subtotal: number;
  packaging_total: number;
  total_amount: number;
  payment_status: 'pending' | 'paid' | 'failed';
  payment_method: string;
  token: string;
  estimated_time: string | null;
  rejection_reason: string | null;
  cancellation_reason: string | null;
  customer_notes: string | null;
  created_at: string;
  updated_at: string;
  delivery_geocoding_status?: string | null;
  delivery_distance_car_meters?: number | null;
  delivery_duration_car_seconds?: number | null;
  delivery_distance_walk_meters?: number | null;
  delivery_duration_walk_seconds?: number | null;
  delivery_distance_error?: string | null;
};

type Metrics = {
  pendingCount: number;
  confirmedCount: number;
  readyCount: number;
  completedCount: number;
};

type Props = {
  initialOrders: Order[];
  metrics: Metrics;
  filters: {
    status: string;
    type: string;
    date: string;
    query: string;
    payment_status?: string;
  };
};

function OrderAgeTimer({ createdAt }: { createdAt: string }) {
  const [elapsed, setElapsed] = useState('');

  useEffect(() => {
    const calculateElapsed = () => {
      const createdTime = new Date(createdAt).getTime();
      const diffMs = Date.now() - createdTime;

      if (diffMs <= 0) {
        setElapsed('0s');
        return;
      }

      const diffSecs = Math.floor(diffMs / 1000);
      const diffMins = Math.floor(diffSecs / 60);
      const diffHours = Math.floor(diffMins / 60);

      const displaySecs = diffSecs % 60;
      const displayMins = diffMins % 60;

      if (diffHours > 0) {
        setElapsed(`${diffHours}h ${displayMins}m ${displaySecs}s`);
      } else if (diffMins > 0) {
        setElapsed(`${diffMins}m ${displaySecs}s`);
      } else {
        setElapsed(`${displaySecs}s`);
      }
    };

    calculateElapsed();
    const interval = setInterval(calculateElapsed, 1000);

    return () => clearInterval(interval);
  }, [createdAt]);

  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/10 border border-amber-500/20 text-amber-500 animate-pulse select-none">
      <Clock className="w-3 h-3 text-amber-500 shrink-0" />
      {elapsed}
    </span>
  );
}

export default function OrdersDashboard({ initialOrders, metrics, filters }: Props) {
  const router = useRouter();
  
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const latestClientUpdates = useRef<Record<string, { order: Order; updated_at: string }>>({});

  useEffect(() => {
    const mergedOrders = initialOrders.map(order => {
      const localUpdate = latestClientUpdates.current[order.id];
      if (localUpdate) {
        const localTime = new Date(localUpdate.updated_at).getTime();
        const serverTime = new Date(order.updated_at).getTime();
        if (serverTime < localTime) {
          return { ...order, ...localUpdate.order };
        } else {
          delete latestClientUpdates.current[order.id];
        }
      }
      return order;
    });
    setOrders(mergedOrders);
  }, [initialOrders]);

  const [isConnected, setIsConnected] = useState(false);
  const pendingCount = orders.filter(o => o.status === 'pending').length;
  const { soundEnabled, toggleSound, unlockAudio } = useAdminAlerts();
  
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('realtime-orders-dashboard')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          console.log('[Realtime] Order event payload:', payload);
          if (payload.eventType === 'UPDATE') {
            const updatedOrder = payload.new as Order;
            latestClientUpdates.current[updatedOrder.id] = {
              order: updatedOrder,
              updated_at: updatedOrder.updated_at
            };
            setOrders(prev => prev.map(o => o.id === updatedOrder.id ? { ...o, ...updatedOrder } : o));
          } else if (payload.eventType === 'INSERT') {
            const newOrder = payload.new as Order;
            setOrders(prev => [newOrder, ...prev]);
          } else if (payload.eventType === 'DELETE') {
            const deletedOrder = payload.old as { id: string };
            setOrders(prev => prev.filter(o => o.id !== deletedOrder.id));
          }
          router.refresh();
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setIsConnected(false);
        }
      });

    // 30 seconds polling fallback
    const pollInterval = setInterval(() => {
      router.refresh();
    }, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [router]);

  const t = useTranslations('adminOrders');
  const [isPending, startTransition] = useTransition();


  // Filter local states
  const [search, setSearch] = useState(filters.query);
  const [statusFilter, setStatusFilter] = useState(filters.status);
  const [typeFilter, setTypeFilter] = useState(filters.type);
  const [paymentStatusFilter, setPaymentStatusFilter] = useState(filters.payment_status || 'all');

  const [datePreset, setDatePreset] = useState(() => {
    if (filters.date === 'today' || filters.date === 'yesterday' || filters.date === 'this_week') {
      return filters.date;
    }
    return filters.date ? 'custom' : 'all';
  });

  const [customDate, setCustomDate] = useState(() => {
    if (filters.date && filters.date !== 'today' && filters.date !== 'yesterday' && filters.date !== 'this_week') {
      return filters.date;
    }
    return '';
  });

  // Dialog / Action States
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [modalType, setModalType] = useState<'confirm' | 'reject' | 'cancel' | 'updateEta' | 'complete' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Trigger filters
  const applyFilters = (
    status = statusFilter,
    type = typeFilter,
    date = (datePreset === 'custom' ? customDate : (datePreset === 'all' ? '' : datePreset)),
    paymentStatus = paymentStatusFilter,
    query = search
  ) => {
    const params = new URLSearchParams();
    if (status && status !== 'all') params.set('status', status);
    if (type && type !== 'all') params.set('type', type);
    if (date) params.set('date', date);
    if (paymentStatus && paymentStatus !== 'all') params.set('payment_status', paymentStatus);
    if (query) params.set('query', query);
    router.push(`/admin/orders?${params.toString()}`);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      applyFilters();
    }
  };

  const handleResetFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setTypeFilter('all');
    setPaymentStatusFilter('all');
    setDatePreset('all');
    setCustomDate('');
    router.push('/admin/orders');
  };

  // Mutator triggers
  const handleStartPreparing = async (id: string) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    startTransition(async () => {
      const res = await startPreparingOrderAction(id);
      if (res.success) {
        setSuccessMessage(t('successUpdate'));
        router.refresh();
      } else {
        setErrorMessage(res.error || t('errorUpdate'));
      }
    });
  };

  const handleMarkReady = async (id: string) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    startTransition(async () => {
      const res = await markOrderReadyAction(id);
      if (res.success) {
        setSuccessMessage(t('successUpdate'));
        router.refresh();
      } else {
        setErrorMessage(res.error || t('errorUpdate'));
      }
    });
  };

  const handleOpenModal = (order: Order, type: 'confirm' | 'reject' | 'cancel' | 'updateEta' | 'complete') => {
    setSelectedOrder(order);
    setModalType(type);
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const handleCloseModal = () => {
    setSelectedOrder(null);
    setModalType(null);
  };

  const handleModalSubmit = async (data: any) => {
    if (!selectedOrder || !modalType) return;
    
    setErrorMessage(null);
    setSuccessMessage(null);
    const id = selectedOrder.id;

    startTransition(async () => {
      let res: { success: boolean; error?: string } = { success: false };

      if (modalType === 'confirm') {
        res = await confirmOrderAction(id, data as number);
      } else if (modalType === 'reject') {
        res = await rejectOrderAction(id, data as string);
      } else if (modalType === 'cancel') {
        res = await cancelOrderAction(id, data as string);
      } else if (modalType === 'updateEta') {
        res = await updateOrderEtaAction(id, data as number);
      } else if (modalType === 'complete') {
        res = await completeOrderAction(id, data as boolean);
      }

      if (res.success) {
        setSuccessMessage(t('successUpdate'));
        handleCloseModal();
        router.refresh();
      } else {
        setErrorMessage(res.error || t('errorUpdate'));
      }
    });
  };

  // Map database status to translation-ready keys
  const mapDbStatusToKey = (status: string): string => {
    return status === 'approved' ? 'confirmed' : status;
  };

  const getStatusPillType = (status: string): 'pending' | 'success' | 'warning' | 'error' | 'info' | 'neutral' => {
    switch (status) {
      case 'pending': return 'pending';
      case 'approved':
      case 'confirmed': return 'success';
      case 'preparing': return 'info';
      case 'ready_for_pickup': return 'success';
      case 'out_for_delivery': return 'info';
      case 'completed': return 'success';
      case 'rejected': return 'error';
      case 'cancelled': return 'warning';
      default: return 'neutral';
    }
  };

  return (
    <div className="space-y-6 font-sans relative">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-border pb-5 gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-primary">{t('title')}</h1>
          <p className="text-xs text-muted-foreground mt-1">Manage, confirm, and update customer order workflows</p>
        </div>
        <div className="flex gap-2 items-center">
          {/* Connection Status Badge */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
            isConnected
              ? 'border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-400'
              : 'border-yellow-500/30 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'
          }`}>
            {isConnected ? <Wifi className="w-3 h-3 animate-pulse" /> : <WifiOff className="w-3 h-3" />}
            {isConnected ? 'Live' : 'Reconnecting'}
          </div>

          <Link href="/admin/orders/new" passHref legacyBehavior>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold p-2.5 flex items-center gap-1.5">
              <ShoppingBag className="w-3.5 h-3.5" />
              New Phone Order
            </Button>
          </Link>
          <Button 
            onClick={() => router.refresh()}
            className="border border-border bg-background text-muted-foreground hover:text-foreground text-xs p-2.5 flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isPending ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {errorMessage && (
        <div className="p-3 text-xs bg-red-500/10 border border-red-500/30 rounded text-red-600 [.admin-theme_&]:text-red-800 dark:text-red-400 text-center leading-relaxed">
          {errorMessage}
        </div>
      )}
      {successMessage && (
        <div className="p-3 text-xs bg-green-500/10 border border-green-500/30 rounded text-green-600 [.admin-theme_&]:text-green-800 dark:text-green-400 text-center leading-relaxed">
          {successMessage}
        </div>
      )}

      {/* PWA Alerts & Sound Controls (Phase 13C) */}
      <div className="space-y-4">
        <NotificationPermissionCard
          soundEnabled={soundEnabled}
          onToggleSound={toggleSound}
          onUnlockAudio={unlockAudio}
          alertType="admin"
        />
        <OrderAlertBanner
          pendingCount={pendingCount}
          soundEnabled={soundEnabled}
          onToggleSound={toggleSound}
        />
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <PremiumCard hoverable={false} className="border-yellow-500/25 bg-yellow-500/5 [.admin-theme_&]:border-yellow-300/60 [.admin-theme_&]:bg-yellow-50/50">
          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
            {t('pendingCount')}
          </p>
          <p className="text-3xl font-bold text-yellow-600 [.admin-theme_&]:text-yellow-800 dark:text-yellow-400 font-serif">{metrics.pendingCount}</p>
        </PremiumCard>

        <PremiumCard hoverable={false} className="border-green-500/25 bg-green-500/5 [.admin-theme_&]:border-green-300/60 [.admin-theme_&]:bg-green-50/50">
          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
            {t('confirmedCount')}
          </p>
          <p className="text-3xl font-bold text-green-600 [.admin-theme_&]:text-green-800 dark:text-green-400 font-serif">{metrics.confirmedCount}</p>
        </PremiumCard>

        <PremiumCard hoverable={false} className="border-primary/25 bg-primary/5 [.admin-theme_&]:border-primary/30/60 [.admin-theme_&]:bg-primary/5/50">
          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
            {t('readyCount')}
          </p>
          <p className="text-3xl font-bold text-primary font-serif">{metrics.readyCount}</p>
        </PremiumCard>

        <PremiumCard hoverable={false} className="border-orange-500/25 bg-orange-500/5 [.admin-theme_&]:border-orange-300/60 [.admin-theme_&]:bg-orange-50/50">
          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
            {t('completedCount')}
          </p>
          <p className="text-3xl font-bold text-orange-600 [.admin-theme_&]:text-orange-800 dark:text-orange-400 font-serif">{metrics.completedCount}</p>
        </PremiumCard>
      </div>

      {/* Filters bar */}
      <div className="flex flex-col xl:flex-row gap-4 p-4 bg-card border border-border rounded-lg items-end xl:items-center">
        
        {/* Search */}
        <div className="w-full xl:w-72 relative space-y-1">
          <span className="text-[9px] uppercase tracking-wider text-muted-foreground/75 font-semibold block">Search Request</span>
          <div className="relative">
            <input
              type="text"
              placeholder="Search by name, phone, email, address, postal code or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="w-full bg-background border border-border rounded px-3 py-2 text-xs text-foreground placeholder-muted-foreground/60 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        {/* Status */}
        <div className="w-full xl:w-44 space-y-1">
          <span className="text-[9px] uppercase tracking-wider text-muted-foreground/75 font-semibold block">{t('filterStatus')}</span>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              applyFilters(e.target.value, typeFilter, datePreset === 'custom' ? customDate : (datePreset === 'all' ? '' : datePreset), paymentStatusFilter, search);
            }}
            className="w-full bg-background border border-border rounded px-2.5 py-2 text-xs text-foreground cursor-pointer focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending confirmation</option>
            <option value="confirmed">Confirmed</option>
            <option value="preparing">Preparing</option>
            <option value="ready_for_pickup">Ready for Pickup</option>
            <option value="out_for_delivery">Out for Delivery</option>
            <option value="completed">Completed</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {/* Type */}
        <div className="w-full xl:w-36 space-y-1">
          <span className="text-[9px] uppercase tracking-wider text-muted-foreground/75 font-semibold block">{t('filterType')}</span>
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              applyFilters(statusFilter, e.target.value, datePreset === 'custom' ? customDate : (datePreset === 'all' ? '' : datePreset), paymentStatusFilter, search);
            }}
            className="w-full bg-background border border-border rounded px-2.5 py-2 text-xs text-foreground cursor-pointer focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          >
            <option value="all">All types</option>
            <option value="takeaway">Takeaway</option>
            <option value="delivery">Delivery</option>
          </select>
        </div>

        {/* Payment Status */}
        <div className="w-full xl:w-36 space-y-1">
          <span className="text-[9px] uppercase tracking-wider text-muted-foreground/75 font-semibold block">Payment Status</span>
          <select
            value={paymentStatusFilter}
            onChange={(e) => {
              setPaymentStatusFilter(e.target.value);
              applyFilters(statusFilter, typeFilter, datePreset === 'custom' ? customDate : (datePreset === 'all' ? '' : datePreset), e.target.value, search);
            }}
            className="w-full bg-background border border-border rounded px-2.5 py-2 text-xs text-foreground cursor-pointer focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          >
            <option value="all">All payments</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        {/* Date Preset */}
        <div className="w-full xl:w-40 space-y-1">
          <span className="text-[9px] uppercase tracking-wider text-muted-foreground/75 font-semibold block">Date Filter</span>
          <select
            value={datePreset}
            onChange={(e) => {
              const val = e.target.value;
              setDatePreset(val);
              if (val !== 'custom') {
                applyFilters(statusFilter, typeFilter, val === 'all' ? '' : val, paymentStatusFilter, search);
              }
            }}
            className="w-full bg-background border border-border rounded px-2.5 py-2 text-xs text-foreground cursor-pointer focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          >
            <option value="all">All Dates</option>
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="this_week">This Week</option>
            <option value="custom">Custom Date...</option>
          </select>
        </div>

        {/* Custom Date Input (Reveals only when Custom Date is selected) */}
        {datePreset === 'custom' && (
          <div className="w-full xl:w-40 space-y-1">
            <span className="text-[9px] uppercase tracking-wider text-muted-foreground/75 font-semibold block">Choose Date</span>
            <input
              type="date"
              value={customDate}
              onChange={(e) => {
                setCustomDate(e.target.value);
                applyFilters(statusFilter, typeFilter, e.target.value, paymentStatusFilter, search);
              }}
              className="w-full bg-background border border-border rounded px-2.5 py-2 text-xs text-foreground cursor-pointer focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 w-full xl:w-auto pt-2 xl:pt-0 justify-end xl:ml-auto">
          <Button
            onClick={() => applyFilters(statusFilter, typeFilter, datePreset === 'custom' ? customDate : (datePreset === 'all' ? '' : datePreset), paymentStatusFilter, search)}
            className="bg-primary/10 hover:bg-primary/20 text-primary font-bold text-xs uppercase tracking-wider px-4 py-2 border border-primary/20"
          >
            Filter
          </Button>
          <Button
            onClick={handleResetFilters}
            className="border border-border bg-transparent hover:bg-muted text-muted-foreground text-xs uppercase tracking-wider px-4 py-2"
          >
            Reset
          </Button>
        </div>

      </div>

      {/* Grid / Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-muted-foreground uppercase tracking-widest text-[9px] font-bold">
                <th className="p-4">{t('customer')}</th>
                <th className="p-4">{t('type')}</th>
                <th className="p-4">{t('payment')}</th>
                <th className="p-4">{t('total')}</th>
                <th className="p-4">{t('statusHeader')}</th>
                <th className="p-4">{t('eta')}</th>
                <th className="p-4 text-right">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground/60 italic">
                    {t('noOrders')}
                  </td>
                </tr>
              ) : (
                orders.map((order) => {
                  const mappedStatus = mapDbStatusToKey(order.status);
                  const isTakeaway = order.order_type === 'takeaway';
                  
                  return (
                    <tr 
                      key={order.id} 
                      className={`transition-colors ${
                        order.status === 'pending'
                          ? 'bg-yellow-500/5 hover:bg-yellow-500/10 border-l-4 border-l-yellow-500'
                          : 'hover:bg-muted/50'
                      }`}
                    >
                      {/* Customer Info */}
                      <td className="p-4 space-y-0.5">
                        <div className="font-semibold text-foreground text-sm flex items-center gap-1.5">
                          {order.customer_name}
                          <Link href={`/admin/orders/${order.id}`} title="View order details">
                            <Eye className="w-3.5 h-3.5 text-primary hover:opacity-80 cursor-pointer" />
                          </Link>
                        </div>
                        <div className="text-muted-foreground/60 font-mono text-[10px]">
                          Ref: {order.token.substring(0, 8)}...
                        </div>
                        <div className="text-muted-foreground/60">{order.customer_phone}</div>
                        {order.status === 'pending' && (
                          <div className="mt-1.5 flex items-center">
                            <OrderAgeTimer createdAt={order.created_at} />
                          </div>
                        )}
                        {order.order_type === 'delivery' && (
                          <div className="flex flex-col gap-0.5 mt-1">
                            <div className="text-[10px] flex items-center gap-1 text-primary">
                              <MapPin className="w-3 h-3 flex-shrink-0 text-primary" />
                              {order.delivery_geocoding_status === 'success' && order.delivery_distance_car_meters ? (
                                <span>🚗 {(order.delivery_distance_car_meters / 1000).toFixed(1)} km ({Math.ceil(order.delivery_duration_car_seconds! / 60)}m)</span>
                              ) : order.delivery_geocoding_status === 'failed' || order.delivery_distance_error ? (
                                <span className="text-red-400 font-semibold" title={order.delivery_distance_error || ''}>Distance unavailable</span>
                              ) : (
                                <span className="text-yellow-500 font-light">Pending distance...</span>
                              )}
                            </div>
                            {order.delivery_geocoding_status === 'success' && order.delivery_distance_walk_meters && (
                              <div className="text-[10px] pl-4 text-muted-foreground">
                                <span>🚶 {(order.delivery_distance_walk_meters / 1000).toFixed(1)} km ({Math.ceil(order.delivery_duration_walk_seconds! / 60)}m)</span>
                              </div>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Order Type */}
                      <td className="p-4">
                        <span className="font-semibold text-foreground capitalize">
                          {order.order_type}
                        </span>
                      </td>

                      {/* Payment */}
                      <td className="p-4 space-y-0.5">
                        <div className="text-foreground capitalize">{order.payment_method.replace(/_/g, ' ')}</div>
                        <div className={`text-[9px] uppercase tracking-wider font-bold ${
                          order.payment_status === 'paid' ? 'text-green-600 [.admin-theme_&]:text-green-800 dark:text-green-400' : 'text-yellow-600 [.admin-theme_&]:text-yellow-800 dark:text-yellow-400'
                        }`}>
                          {order.payment_status}
                        </div>
                      </td>

                      {/* Total */}
                      <td className="p-4 font-bold text-foreground font-mono">
                        {order.total_amount.toFixed(2)} PLN
                      </td>

                      {/* Status */}
                      <td className="p-4">
                        <StatusPill status={getStatusPillType(order.status)} label={t(`status.${mappedStatus}` as any)} />
                      </td>

                      {/* ETA */}
                      <td className="p-4 text-foreground font-mono">
                        {order.estimated_time ? (
                          <div className="flex flex-col">
                            <span>
                              {mounted 
                                ? new Date(order.estimated_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) 
                                : '--:--'
                              }
                            </span>
                            <span className="text-[9px] text-muted-foreground">
                              {mounted 
                                ? `${Math.max(1, Math.round((new Date(order.estimated_time).getTime() - Date.now()) / 60000))} mins left` 
                                : '-- mins left'
                              }
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground/45">-</span>
                        )}
                      </td>

                      {/* Action buttons */}
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-1.5 items-center flex-wrap">
                          {/* View details */}
                          <Link href={`/admin/orders/${order.id}`}>
                            <Button
                              variant="outline"
                              className="border border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary font-bold text-[10px] uppercase tracking-wider px-2.5 py-1 flex items-center gap-1.5 h-auto"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              View
                            </Button>
                          </Link>
                          
                          {/* Confirm Button */}
                          {order.status === 'pending' && (
                            <>
                              <Button
                                onClick={() => handleOpenModal(order, 'confirm')}
                                disabled={isPending}
                                className="bg-green-600 hover:bg-green-700 text-white font-bold text-[10px] uppercase tracking-wider px-2.5 py-1"
                              >
                                {t('confirmButton')}
                              </Button>
                              <Button
                                onClick={() => handleOpenModal(order, 'reject')}
                                disabled={isPending}
                                className="border border-red-500/25 bg-transparent hover:bg-red-500/10 text-red-400 font-bold text-[10px] uppercase tracking-wider px-2.5 py-1"
                              >
                                {t('rejectButton')}
                              </Button>
                            </>
                          )}

                          {/* Start preparing Button */}
                          {order.status === 'approved' && (
                            <Button
                              onClick={() => handleStartPreparing(order.id)}
                              disabled={isPending}
                              className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] uppercase tracking-wider px-2.5 py-1"
                            >
                              Start preparing
                            </Button>
                          )}

                          {/* Mark ready / dispatch Button */}
                          {(order.status === 'approved' || order.status === 'preparing') && (
                            <Button
                              onClick={() => handleMarkReady(order.id)}
                              disabled={isPending}
                              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] uppercase tracking-wider px-2.5 py-1"
                            >
                              {isTakeaway ? t('readyButton') : t('dispatchButton')}
                            </Button>
                          )}

                          {/* Complete Button */}
                          {((isTakeaway && order.status === 'ready_for_pickup') || 
                            (!isTakeaway && order.status === 'out_for_delivery')) && (
                            <Button
                              onClick={() => handleOpenModal(order, 'complete')}
                              disabled={isPending}
                              className="bg-green-600 hover:bg-green-700 text-white font-bold text-[10px] uppercase tracking-wider px-2.5 py-1"
                            >
                              {t('completeButton')}
                            </Button>
                          )}

                          {/* Update ETA */}
                          {(order.status === 'approved' || order.status === 'preparing') && (
                            <Button
                              variant="outline"
                              onClick={() => handleOpenModal(order, 'updateEta')}
                              disabled={isPending}
                              className="border border-primary/30 hover:bg-primary/10 text-primary font-bold text-[10px] uppercase tracking-wider px-2.5 py-1"
                            >
                              Update ETA
                            </Button>
                          )}

                          {/* Cancel button */}
                          {['approved', 'preparing', 'pending'].includes(order.status) && (
                            <Button
                              variant="ghost"
                              onClick={() => handleOpenModal(order, 'cancel')}
                              disabled={isPending}
                              className="text-muted-foreground/60 hover:text-red-400 hover:bg-red-50 p-1"
                              title={t('cancelButton')}
                            >
                              <X className="w-3.5 h-3.5" />
                            </Button>
                          )}

                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Grid Layout (Under 768px) */}
        <div className="md:hidden divide-y divide-border">
          {orders.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground/60 italic">
              {t('noOrders')}
            </div>
          ) : (
            orders.map((order) => {
              const mappedStatus = mapDbStatusToKey(order.status);
              const isTakeaway = order.order_type === 'takeaway';
              
              return (
                <div 
                  key={order.id} 
                  className={`p-4 space-y-3.5 text-left transition-colors ${
                    order.status === 'pending'
                      ? 'bg-yellow-500/5 border-l-4 border-l-yellow-500'
                      : 'bg-card'
                  }`}
                >
                  {/* Top info */}
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <div className="font-semibold text-foreground text-sm flex items-center gap-1.5">
                        {order.customer_name}
                        <Link href={`/admin/orders/${order.id}`}>
                          <Eye className="w-3.5 h-3.5 text-primary hover:opacity-80" />
                        </Link>
                      </div>
                      <span className="text-[10px] font-mono text-muted-foreground/60">
                        Ref: {order.token.substring(0, 8)}...
                      </span>
                      {order.status === 'pending' && (
                        <div className="mt-1 flex items-center">
                          <OrderAgeTimer createdAt={order.created_at} />
                        </div>
                      )}
                    </div>
                    <StatusPill status={getStatusPillType(order.status)} label={t(`status.${mappedStatus}` as any)} />
                  </div>

                  {/* Pricing / Details */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] bg-background border border-border p-3 rounded">
                    <div>
                      <span className="text-[9px] uppercase tracking-wider text-muted-foreground/60 block">Type</span>
                      <span className="font-semibold text-foreground capitalize">{order.order_type}</span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase tracking-wider text-muted-foreground/60 block">Total</span>
                      <span className="font-bold text-primary font-mono">{order.total_amount.toFixed(2)} PLN</span>
                    </div>
                    {order.order_type === 'delivery' && (
                      <div className="col-span-2 pt-1.5 border-t border-border/20 text-[10px] text-primary flex flex-col gap-0.5">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 flex-shrink-0 text-primary" />
                          {order.delivery_geocoding_status === 'success' && order.delivery_distance_car_meters ? (
                            <span>🚗 {(order.delivery_distance_car_meters / 1000).toFixed(1)} km ({Math.ceil(order.delivery_duration_car_seconds! / 60)} mins)</span>
                          ) : order.delivery_geocoding_status === 'failed' || order.delivery_distance_error ? (
                            <span className="text-red-400 font-semibold">Distance unavailable</span>
                          ) : (
                            <span className="text-yellow-500">Pending distance...</span>
                          )}
                        </div>
                        {order.delivery_geocoding_status === 'success' && order.delivery_distance_walk_meters && (
                          <div className="pl-4 text-muted-foreground">
                            <span>🚶 {(order.delivery_distance_walk_meters / 1000).toFixed(1)} km ({Math.ceil(order.delivery_duration_walk_seconds! / 60)} mins)</span>
                          </div>
                        )}
                      </div>
                    )}
                    <div className="col-span-2 pt-1.5 border-t border-border flex justify-between items-center">
                      <div>
                        <span className="text-[9px] uppercase tracking-wider text-muted-foreground/60 block">Payment</span>
                        <span className="text-foreground capitalize text-[10px]">{order.payment_method.replace(/_/g, ' ')} ({order.payment_status})</span>
                      </div>
                      {order.estimated_time && (
                        <div className="text-right">
                          <span className="text-[9px] uppercase tracking-wider text-muted-foreground/60 block">ETA</span>
                          <span className="font-semibold font-mono text-foreground">
                            {mounted 
                              ? new Date(order.estimated_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) 
                              : '--:--'
                            }
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions footer */}
                  <div className="flex flex-wrap gap-2 justify-end pt-1 border-t border-border">
                    {/* View Details */}
                    <Link href={`/admin/orders/${order.id}`}>
                      <Button
                        variant="outline"
                        className="border border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary font-bold text-[10px] uppercase tracking-wider px-2.5 py-1.5 h-auto flex items-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        View Details
                      </Button>
                    </Link>
                    {/* Confirm Button */}
                    {order.status === 'pending' && (
                      <>
                        <Button
                          onClick={() => handleOpenModal(order, 'confirm')}
                          disabled={isPending}
                          className="bg-green-600 hover:bg-green-700 text-white font-bold text-[10px] uppercase tracking-wider px-2.5 py-1"
                        >
                          {t('confirmButton')}
                        </Button>
                        <Button
                          onClick={() => handleOpenModal(order, 'reject')}
                          disabled={isPending}
                          className="border border-red-500/30 text-red-600 [.admin-theme_&]:text-red-700 hover:bg-red-500/10 dark:text-red-400 font-bold text-[10px] uppercase tracking-wider px-2.5 py-1"
                        >
                          {t('rejectButton')}
                        </Button>
                      </>
                    )}

                    {/* Start preparing Button */}
                    {order.status === 'approved' && (
                      <Button
                        onClick={() => handleStartPreparing(order.id)}
                        disabled={isPending}
                        className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] uppercase tracking-wider px-2.5 py-1"
                      >
                        Start preparing
                      </Button>
                    )}

                    {/* Mark ready / dispatch Button */}
                    {(order.status === 'approved' || order.status === 'preparing') && (
                      <Button
                        onClick={() => handleMarkReady(order.id)}
                        disabled={isPending}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] uppercase tracking-wider px-2.5 py-1"
                      >
                        {isTakeaway ? t('readyButton') : t('dispatchButton')}
                      </Button>
                    )}

                    {/* Complete Button */}
                    {((isTakeaway && order.status === 'ready_for_pickup') || 
                      (!isTakeaway && order.status === 'out_for_delivery')) && (
                      <Button
                        onClick={() => handleOpenModal(order, 'complete')}
                        disabled={isPending}
                        className="bg-green-600 hover:bg-green-700 text-white font-bold text-[10px] uppercase tracking-wider px-2.5 py-1"
                      >
                        {t('completeButton')}
                      </Button>
                    )}

                    {/* Update ETA */}
                    {(order.status === 'approved' || order.status === 'preparing') && (
                      <Button
                        variant="outline"
                        onClick={() => handleOpenModal(order, 'updateEta')}
                        disabled={isPending}
                        className="border border-primary/30 hover:bg-primary/10 text-primary font-bold text-[10px] uppercase tracking-wider px-2.5 py-1"
                      >
                        Update ETA
                      </Button>
                    )}

                    {/* Cancel button */}
                    {['approved', 'preparing', 'pending'].includes(order.status) && (
                      <Button
                        variant="outline"
                        onClick={() => handleOpenModal(order, 'cancel')}
                        disabled={isPending}
                        className="border border-red-500/30 text-red-600 [.admin-theme_&]:text-red-700 hover:bg-red-500/10 dark:text-red-400 font-bold text-[10px] uppercase tracking-wider px-2.5 py-1"
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>

      {/* Action Modals */}
      {selectedOrder && modalType === 'confirm' && (
        <ConfirmOrderModal
          isOpen={true}
          onClose={handleCloseModal}
          orderType={selectedOrder.order_type}
          onSubmit={handleModalSubmit}
          order={selectedOrder}
        />
      )}

      {selectedOrder && modalType === 'reject' && (
        <RejectOrderModal
          isOpen={true}
          onClose={handleCloseModal}
          onSubmit={handleModalSubmit}
        />
      )}

      {selectedOrder && modalType === 'cancel' && (
        <CancelOrderModal
          isOpen={true}
          onClose={handleCloseModal}
          onSubmit={handleModalSubmit}
        />
      )}

      {selectedOrder && modalType === 'updateEta' && (
        <UpdateEtaModal
          isOpen={true}
          onClose={handleCloseModal}
          orderType={selectedOrder.order_type}
          onSubmit={handleModalSubmit}
        />
      )}

      {selectedOrder && modalType === 'complete' && (
        <CompleteOrderModal
          isOpen={true}
          onClose={handleCloseModal}
          onSubmit={handleModalSubmit}
        />
      )}

    </div>
  );
}
