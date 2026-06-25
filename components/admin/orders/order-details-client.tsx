'use client';

import { useLocale } from 'next-intl';

import React, { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import StatusPill from '@/components/ui/status-pill';
import PremiumCard from '@/components/ui/premium-card';
import GoldSpinner from '@/components/ui/gold-spinner';
import { createClient } from '@/lib/supabase/client';
import { AnimatePresence, motion } from 'framer-motion';
import {
  confirmOrderAction,
  rejectOrderAction,
  cancelOrderAction,
  markOrderReadyAction,
  completeOrderAction,
  updateOrderEtaAction,
  startPreparingOrderAction,
  recalculateOrderDistanceAction,
} from '@/app/admin/orders/actions';
import {
  ConfirmOrderModal,
  RejectOrderModal,
  CancelOrderModal,
  CompleteOrderModal,
  UpdateEtaModal,
} from './order-modals';
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  MapPin,
  ShoppingBag,
  CreditCard,
  Clock,
  Calendar,
  MessageSquare,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Timer,
  ShieldCheck,
  Download,
  X
} from 'lucide-react';

type Order = {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  order_type: 'delivery' | 'takeaway';
  status: string;
  delivery_address: string | null;
  delivery_postal_code: string | null;
  delivery_city: string | null;
  delivery_apartment: string | null;
  delivery_fee: number;
  items_subtotal: number;
  packaging_total: number;
  total_amount: number;
  other_charges_total?: number;
  discount_total?: number;
  payment_status: string;
  payment_method: string;
  token: string;
  estimated_time: string | null;
  rejection_reason: string | null;
  cancellation_reason: string | null;
  customer_notes: string | null;
  admin_notes: string | null;
  created_at: string;
  approved_at: string | null;
  preparing_at: string | null;
  ready_at: string | null;
  dispatched_at: string | null;
  completed_at: string | null;
  delivery_geocoded_address?: string | null;
  delivery_geocoding_status?: string | null;
  delivery_distance_car_meters?: number | null;
  delivery_duration_car_seconds?: number | null;
  delivery_distance_walk_meters?: number | null;
  delivery_duration_walk_seconds?: number | null;
  delivery_distance_calculated_at?: string | null;
  delivery_distance_error?: string | null;
  suggested_delivery_fee_amount?: number | null;
  delivery_latitude?: number | null;
  delivery_longitude?: number | null;
};

type OrderItem = {
  id: string;
  menu_item_id: string;
  item_name_en: string;
  item_name_pl: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  customer_notes: string | null;
};

type TimelineEvent = {
  id: string;
  new_status: string;
  created_at: string;
  metadata?: any;
  profiles?: {
    full_name: string;
    role: string;
  } | null;
};

type Props = {
  order: Order;
  items: OrderItem[];
  timeline: TimelineEvent[];
  crmStats?: {
    totalOrders: number;
    ltv: number;
    aov: number;
  };
  pastOrders?: {
    id: string;
    created_at: string;
    order_type: 'delivery' | 'takeaway';
    total_amount: number;
    status: string;
    delivery_fee: number;
    payment_method: string;
    payment_status: string;
  }[];
  favoriteDishes?: {
    nameEn: string;
    namePl: string;
    count: number;
  }[];
};

export default function OrderDetailsClient({
  order,
  items,
  timeline,
  crmStats,
  pastOrders,
  favoriteDishes
}: Props) {
  const locale = useLocale();
  const router = useRouter();
  const t = useTranslations('adminOrders');
  const [isPending, startTransition] = useTransition();

  // Past order details drawer states
  const [activePastOrderId, setActivePastOrderId] = useState<string | null>(null);
  const [pastOrderLoading, setPastOrderLoading] = useState(false);
  const [pastOrderDetail, setPastOrderDetail] = useState<any | null>(null);
  const [pastOrderItems, setPastOrderItems] = useState<any[]>([]);

  useEffect(() => {
    if (!activePastOrderId) {
      setPastOrderDetail(null);
      setPastOrderItems([]);
      return;
    }

    const fetchPastOrderDetails = async () => {
      setPastOrderLoading(true);
      try {
        const supabase = createClient();
        const { data: orderData, error: orderErr } = await supabase
          .from('orders')
          .select('*')
          .eq('id', activePastOrderId)
          .single();

        if (orderErr) throw orderErr;

        const { data: itemsData, error: itemsErr } = await supabase
          .from('order_items')
          .select('*')
          .eq('order_id', activePastOrderId);

        if (itemsErr) throw itemsErr;

        setPastOrderDetail(orderData);
        setPastOrderItems(itemsData || []);
      } catch (err) {
        console.error('Error fetching past order details:', err);
      } finally {
        setPastOrderLoading(false);
      }
    };

    fetchPastOrderDetails();
  }, [activePastOrderId]);

  // Modal states
  const [modalType, setModalType] = useState<
    'confirm' | 'reject' | 'cancel' | 'updateEta' | 'complete' | null
  >(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isRecalculating, setIsRecalculating] = useState(false);

  const handleRecalculateDistance = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsRecalculating(true);
    try {
      const res = await recalculateOrderDistanceAction(order.id);
      if (res.success) {
        setSuccessMessage('Delivery distance calculated successfully!');
        router.refresh();
      } else {
        setErrorMessage(res.error || 'Failed to calculate distance.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred.');
    } finally {
      setIsRecalculating(false);
    }
  };

  // Map database status to translation-ready keys
  const mapDbStatusToKey = (status: string): string => {
    return status === 'approved' ? 'confirmed' : status;
  };

  const getStatusPillType = (
    status: string
  ): 'pending' | 'success' | 'warning' | 'error' | 'info' | 'neutral' => {
    switch (status) {
      case 'pending':
        return 'pending';
      case 'approved':
      case 'confirmed':
        return 'success';
      case 'preparing':
        return 'info';
      case 'ready_for_pickup':
        return 'success';
      case 'out_for_delivery':
        return 'info';
      case 'completed':
        return 'success';
      case 'rejected':
        return 'error';
      case 'cancelled':
        return 'warning';
      default:
        return 'neutral';
    }
  };

  const isTakeaway = order.order_type === 'takeaway';
  const mappedStatus = mapDbStatusToKey(order.status);
  const isDeliveryUnresolved =
    order.order_type === 'delivery' && Number(order.delivery_fee) === 0;

  const getLoyaltyTier = (orderCount: number) => {
    if (orderCount >= 50) {
      return {
        label: 'VIP / Gold',
        badgeClass: 'border-yellow-500 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 font-bold uppercase tracking-wider'
      };
    }
    if (orderCount >= 20) {
      return {
        label: 'Silver',
        badgeClass: 'border-slate-300 bg-slate-300/10 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider'
      };
    }
    if (orderCount >= 5) {
      return {
        label: 'Bronze',
        badgeClass: 'border-amber-700 bg-amber-700/10 text-amber-800 dark:text-amber-600 font-bold uppercase tracking-wider'
      };
    }
    return {
      label: 'Regular',
      badgeClass: 'border-border bg-muted/40 text-muted-foreground font-semibold uppercase tracking-wider'
    };
  };

  const handleExportCSV = () => {
    if (!pastOrders || pastOrders.length === 0) return;

    const headers = [
      'Order ID',
      'Date & Time (Europe/Warsaw)',
      'Order Type',
      'Total Amount (PLN)',
      'Delivery Fee (PLN)',
      'Payment Method',
      'Payment Status',
      'Status'
    ];

    const rows = pastOrders.map(o => {
      const orderIdShort = o.id.substring(0, 8).toUpperCase();
      const dateFormatted = formatDateTime(o.created_at);
      const orderType = o.order_type === 'delivery' ? 'Delivery' : 'Takeaway';
      const totalAmount = Number(o.total_amount).toFixed(2);
      const deliveryFee = Number(o.delivery_fee).toFixed(2);
      const paymentMethod = o.payment_method ? o.payment_method.replace(/_/g, ' ').toUpperCase() : 'N/A';
      const paymentStatus = o.payment_status ? o.payment_status.toUpperCase() : 'PENDING';
      const status = o.status ? o.status.toUpperCase() : 'PENDING';

      return [
        orderIdShort,
        dateFormatted,
        orderType,
        totalAmount,
        deliveryFee,
        paymentMethod,
        paymentStatus,
        status
      ];
    });

    const csvContent = [
      headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','),
      ...rows.map(row => row.map(val => `"${val.replace(/"/g, '""')}"`).join(','))
    ].join('\r\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.setAttribute('href', url);
    const customerNameSlug = order.customer_name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    link.setAttribute('download', `order_history_${customerNameSlug}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Action handlers
  const handleStartPreparing = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    startTransition(async () => {
      const res = await startPreparingOrderAction(order.id);
      if (res.success) {
        setSuccessMessage(t('successUpdate'));
        router.refresh();
      } else {
        setErrorMessage(res.error || t('errorUpdate'));
      }
    });
  };

  const handleMarkReady = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    startTransition(async () => {
      const res = await markOrderReadyAction(order.id);
      if (res.success) {
        setSuccessMessage(t('successUpdate'));
        router.refresh();
      } else {
        setErrorMessage(res.error || t('errorUpdate'));
      }
    });
  };

  const handleModalSubmit = async (data: any) => {
    if (!modalType) return;
    setErrorMessage(null);
    setSuccessMessage(null);

    startTransition(async () => {
      let res: { success: boolean; error?: string } = { success: false };

      if (modalType === 'confirm') {
        res = await confirmOrderAction(order.id, data as number);
      } else if (modalType === 'reject') {
        res = await rejectOrderAction(order.id, data as string);
      } else if (modalType === 'cancel') {
        res = await cancelOrderAction(order.id, data as string);
      } else if (modalType === 'updateEta') {
        res = await updateOrderEtaAction(order.id, data as number);
      } else if (modalType === 'complete') {
        res = await completeOrderAction(order.id, data as boolean);
      }

      if (res.success) {
        setSuccessMessage(t('successUpdate'));
        setModalType(null);
        router.refresh();
      } else {
        setErrorMessage(res.error || t('errorUpdate'));
      }
    });
  };

  // Format dates
  const formatDateTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Europe/Warsaw',
    });
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Europe/Warsaw',
    });
  };

  // SLA Calculations and Card Renderer
  const renderSlaTrackerCard = () => {
    const isDelivery = order.order_type === 'delivery';
    const trackerTitle = isDelivery ? t('slaTrackerTitleDelivery' as any) : t('slaTrackerTitleTakeaway' as any);
    
    const isPending = order.status === 'pending';
    const isCancelled = order.status === 'cancelled';
    const isRejected = order.status === 'rejected';
    const isCompleted = order.status === 'completed';

    const createdTimeStr = formatDateTime(order.created_at);

    const formatTimeWarsaw = (dateStr: string | null) => {
      if (!dateStr) return '--:--';
      return new Date(dateStr).toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'Europe/Warsaw',
      });
    };

    if (isPending) {
      return (
        <PremiumCard hoverable={false} className="border-border bg-card p-6 space-y-4">
          <div className="flex justify-between items-center border-b border-border pb-3">
            <h3 className="text-lg font-serif font-bold text-primary tracking-wide">
              {trackerTitle}
            </h3>
            <span className="bg-muted border border-border text-muted-foreground font-bold px-2.5 py-1 rounded text-[10px] uppercase tracking-wider">
              {t('slaStatusAwaiting' as any)}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 bg-background border border-border rounded-lg space-y-1">
              <span className="text-[9px] uppercase tracking-widest text-muted-foreground/60 block font-semibold">
                {t('slaOrderPlaced' as any)}
              </span>
              <span className="font-semibold text-foreground">{createdTimeStr}</span>
            </div>
            <div className="p-3.5 bg-background border border-border rounded-lg space-y-1 flex items-center justify-center text-muted-foreground/50 italic">
              {t('slaNotAvailable' as any)}
            </div>
          </div>
        </PremiumCard>
      );
    }

    if (isRejected || (isCancelled && !order.approved_at)) {
      return (
        <PremiumCard hoverable={false} className="border-border bg-card p-6 space-y-4">
          <div className="flex justify-between items-center border-b border-border pb-3">
            <h3 className="text-lg font-serif font-bold text-primary tracking-wide">
              {trackerTitle}
            </h3>
            <span className="bg-red-500/10 border border-red-500/30 text-red-500 font-bold px-2.5 py-1 rounded text-[10px] uppercase tracking-wider">
              {isRejected ? t('slaStatusRejected' as any) : t('slaStatusCancelled' as any)}
            </span>
          </div>
          <div className="p-3.5 bg-background border border-border rounded-lg text-xs space-y-1">
            <span className="text-[9px] uppercase tracking-widest text-muted-foreground/60 block font-semibold">
              {t('slaOrderPlaced' as any)}
            </span>
            <span className="font-semibold text-foreground">{createdTimeStr}</span>
          </div>
        </PremiumCard>
      );
    }

    const approvedTime = order.approved_at ? new Date(order.approved_at) : new Date(order.created_at);
    const targetTime = order.estimated_time ? new Date(order.estimated_time) : null;

    if (!targetTime) {
      return null;
    }

    const approvedTimeStr = formatDateTime(approvedTime.toISOString());
    const targetTimeStr = formatDateTime(targetTime.toISOString());
    const targetTimeOnlyStr = formatTime(targetTime.toISOString());

    const allocatedMins = Math.round((targetTime.getTime() - approvedTime.getTime()) / 60000);

    let badgeClass = '';
    let badgeText = '';
    let progressPercent = 0;
    let progressBarColor = 'bg-primary';
    let slaPerformanceText = '';
    let slaPerformanceColor = '';
    let elapsedMinsLabel = '';

    const now = new Date();

    if (isCompleted && order.completed_at) {
      const completedTime = new Date(order.completed_at);
      const completedTimeStr = formatDateTime(completedTime.toISOString());

      const actualDurationMins = Math.round((completedTime.getTime() - approvedTime.getTime()) / 60000);
      const diffMins = Math.round((completedTime.getTime() - targetTime.getTime()) / 60000);

      elapsedMinsLabel = `${actualDurationMins} min`;

      if (diffMins > 0) {
        badgeClass = 'bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400';
        badgeText = t('slaStatusLate' as any, { mins: diffMins });
        slaPerformanceText = t('slaRatingBreached' as any);
        slaPerformanceColor = 'text-red-500 font-bold';
        progressBarColor = 'bg-red-500';
        progressPercent = 100;
      } else if (diffMins < 0) {
        badgeClass = 'bg-green-500/10 border border-green-500/30 text-green-600 dark:text-green-400';
        badgeText = t('slaStatusEarly' as any, { mins: Math.abs(diffMins) });
        slaPerformanceText = t('slaRatingExcellent' as any);
        slaPerformanceColor = 'text-green-600 dark:text-green-400 font-bold';
        progressBarColor = 'bg-green-600';
        progressPercent = Math.min(100, Math.max(0, (actualDurationMins / allocatedMins) * 100));
      } else {
        badgeClass = 'bg-green-500/10 border border-green-500/30 text-green-600 dark:text-green-400';
        badgeText = t('slaStatusOnTime' as any);
        slaPerformanceText = t('slaRatingOnTime' as any);
        slaPerformanceColor = 'text-green-600 dark:text-green-400 font-bold';
        progressBarColor = 'bg-green-600';
        progressPercent = 100;
      }

      return (
        <PremiumCard hoverable={false} className="border-border bg-card p-6 space-y-5">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center border-b border-border pb-3 gap-2">
            <div className="flex items-center gap-2">
              <Timer className="w-5 h-5 text-primary flex-shrink-0" />
              <h3 className="text-lg font-serif font-bold text-primary tracking-wide">
                {trackerTitle}
              </h3>
            </div>
            <span className={`font-bold px-2.5 py-1 rounded text-[10px] uppercase tracking-wider ${badgeClass}`}>
              {badgeText}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div className="p-3.5 bg-background border border-border rounded-lg space-y-1">
              <span className="text-[9px] uppercase tracking-widest text-muted-foreground/60 block font-semibold">
                {t('slaOrderPlaced' as any)}
              </span>
              <span className="font-semibold text-foreground">{createdTimeStr}</span>
            </div>
            <div className="p-3.5 bg-background border border-border rounded-lg space-y-1">
              <span className="text-[9px] uppercase tracking-widest text-muted-foreground/60 block font-semibold">
                {t('slaOrderConfirmed' as any)}
              </span>
              <span className="font-semibold text-foreground">{approvedTimeStr}</span>
            </div>
            <div className="p-3.5 bg-background border border-border rounded-lg space-y-1">
              <span className="text-[9px] uppercase tracking-widest text-muted-foreground/60 block font-semibold">
                {t('slaTargetTime' as any)}
              </span>
              <span className="font-semibold text-foreground">{targetTimeStr}</span>
            </div>
            <div className="p-3.5 bg-background border border-border rounded-lg space-y-1">
              <span className="text-[9px] uppercase tracking-widest text-muted-foreground/60 block font-semibold">
                {t('slaActualTime' as any)}
              </span>
              <span className="font-semibold text-foreground">{completedTimeStr}</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-muted-foreground/60">{t('slaAllocatedTime' as any)}: <strong className="text-foreground">{allocatedMins} min</strong></span>
              <span className="text-muted-foreground/60">{t('slaElapsedTime' as any)}: <strong className="text-foreground">{elapsedMinsLabel}</strong></span>
            </div>
            <div className="w-full bg-border rounded-full h-2.5 overflow-hidden">
              <div 
                className={`h-full ${progressBarColor} transition-all duration-500`} 
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-muted-foreground/40 font-mono">{formatTimeWarsaw(order.approved_at)}</span>
              <span className="text-muted-foreground/40 font-mono">{targetTimeOnlyStr}</span>
            </div>
          </div>

          <div className="p-3.5 bg-background border border-border rounded-lg flex justify-between items-center text-xs">
            <span className="text-muted-foreground/60 font-semibold uppercase text-[9px] tracking-wider">{t('slaRating' as any)}</span>
            <span className={slaPerformanceColor}>{slaPerformanceText}</span>
          </div>
        </PremiumCard>
      );
    } else {
      const elapsedDurationMins = Math.round((now.getTime() - approvedTime.getTime()) / 60000);
      const diffMins = Math.round((now.getTime() - targetTime.getTime()) / 60000);

      elapsedMinsLabel = `${elapsedDurationMins} min`;

      if (diffMins > 0) {
        badgeClass = 'bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 animate-pulse';
        badgeText = t('slaActiveOverdue' as any, { mins: diffMins });
        slaPerformanceText = t('slaRatingBreached' as any);
        slaPerformanceColor = 'text-red-500 font-bold';
        progressBarColor = 'bg-red-500';
        progressPercent = 100;
      } else {
        const remainingMins = Math.abs(diffMins);
        badgeClass = 'bg-blue-500/10 border border-blue-500/30 text-blue-600 dark:text-blue-400';
        badgeText = t('slaActiveRemaining' as any, { mins: remainingMins });
        slaPerformanceText = t('slaPendingCompletion' as any);
        slaPerformanceColor = 'text-blue-500 font-bold';
        progressBarColor = 'bg-blue-500';
        progressPercent = Math.min(100, Math.max(0, (elapsedDurationMins / allocatedMins) * 100));
      }

      return (
        <PremiumCard hoverable={false} className="border-border bg-card p-6 space-y-5">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center border-b border-border pb-3 gap-2">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary flex-shrink-0" />
              <h3 className="text-lg font-serif font-bold text-primary tracking-wide">
                {trackerTitle}
              </h3>
            </div>
            <span className={`font-bold px-2.5 py-1 rounded text-[10px] uppercase tracking-wider ${badgeClass}`}>
              {badgeText}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div className="p-3.5 bg-background border border-border rounded-lg space-y-1">
              <span className="text-[9px] uppercase tracking-widest text-muted-foreground/60 block font-semibold">
                {t('slaOrderPlaced' as any)}
              </span>
              <span className="font-semibold text-foreground">{createdTimeStr}</span>
            </div>
            <div className="p-3.5 bg-background border border-border rounded-lg space-y-1">
              <span className="text-[9px] uppercase tracking-widest text-muted-foreground/60 block font-semibold">
                {t('slaOrderConfirmed' as any)}
              </span>
              <span className="font-semibold text-foreground">{approvedTimeStr}</span>
            </div>
            <div className="p-3.5 bg-background border border-border rounded-lg space-y-1">
              <span className="text-[9px] uppercase tracking-widest text-muted-foreground/60 block font-semibold">
                {t('slaTargetTime' as any)}
              </span>
              <span className="font-semibold text-foreground">{targetTimeStr}</span>
            </div>
            <div className="p-3.5 bg-background border border-border rounded-lg space-y-1">
              <span className="text-[9px] uppercase tracking-widest text-muted-foreground/60 block font-semibold">
                {t('slaActualTime' as any)}
              </span>
              <span className="font-medium text-muted-foreground/50 italic">{t('slaPendingCompletion' as any)}</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-muted-foreground/60">{t('slaAllocatedTime' as any)}: <strong className="text-foreground">{allocatedMins} min</strong></span>
              <span className="text-muted-foreground/60">{t('slaElapsedTime' as any)}: <strong className="text-foreground">{elapsedMinsLabel}</strong></span>
            </div>
            <div className="w-full bg-border rounded-full h-2.5 overflow-hidden">
              <div 
                className={`h-full ${progressBarColor} transition-all duration-500`} 
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-muted-foreground/40 font-mono">{formatTimeWarsaw(order.approved_at)}</span>
              <span className="text-muted-foreground/40 font-mono">{targetTimeOnlyStr}</span>
            </div>
          </div>

          <div className="p-3.5 bg-background border border-border rounded-lg flex justify-between items-center text-xs">
            <span className="text-muted-foreground/60 font-semibold uppercase text-[9px] tracking-wider">{t('slaRating' as any)}</span>
            <span className={slaPerformanceColor}>{slaPerformanceText}</span>
          </div>
        </PremiumCard>
      );
    }
  };

  return (
    <div className="space-y-6 font-sans relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-border pb-5 gap-4">
        <div className="flex items-center gap-3">
          <Link href="/admin/orders">
            <Button className="border border-border bg-background text-muted-foreground hover:text-foreground text-xs p-2.5">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-primary">
              {t('details')}
            </h1>
            <p className="text-[10px] text-muted-foreground/60 font-mono mt-0.5 select-all">
              ID: {order.id}
            </p>
          </div>
        </div>
        <StatusPill
          status={getStatusPillType(order.status)}
          label={t(`status.${mappedStatus}` as any)}
        />
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

      {/* Loading state */}
      {isPending && (
        <div className="flex justify-center py-4">
          <GoldSpinner />
        </div>
      )}

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column — Customer + Items (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* SLA Tracker Card */}
          {renderSlaTrackerCard()}

          {/* Customer Details */}
          <PremiumCard hoverable={false} className="border-border bg-card p-6 space-y-5">
            <h3 className="text-lg font-serif font-bold text-primary tracking-wide border-b border-border pb-2">
              {t('customerDetails')}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Name */}
              <div className="p-3.5 bg-background border border-border rounded-lg flex gap-3 items-center">
                <div className="w-9 h-9 rounded-full bg-primary/5 border border-primary/20 flex items-center justify-center text-primary flex-shrink-0">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[9px] uppercase tracking-wider text-muted-foreground/60 block">
                    {t('name')}
                  </span>
                  <span className="text-sm font-semibold text-foreground">
                    {order.customer_name}
                  </span>
                </div>
              </div>

              {/* Phone */}
              <div className="p-3.5 bg-background border border-border rounded-lg flex gap-3 items-center">
                <div className="w-9 h-9 rounded-full bg-primary/5 border border-primary/20 flex items-center justify-center text-primary flex-shrink-0">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[9px] uppercase tracking-wider text-muted-foreground/60 block">
                    {t('phone')}
                  </span>
                  <span className="text-sm font-semibold text-foreground">
                    {order.customer_phone}
                  </span>
                </div>
              </div>

              {/* Email */}
              <div className="p-3.5 bg-background border border-border rounded-lg flex gap-3 items-center">
                <div className="w-9 h-9 rounded-full bg-primary/5 border border-border flex items-center justify-center text-primary flex-shrink-0">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[9px] uppercase tracking-wider text-muted-foreground/60 block">
                    {t('email')}
                  </span>
                  <span className="text-sm font-semibold text-foreground break-all">
                    {order.customer_email}
                  </span>
                </div>
              </div>

              {/* Order Type */}
              <div className="p-3.5 bg-background border border-border rounded-lg flex gap-3 items-center">
                <div className="w-9 h-9 rounded-full bg-primary/5 border border-border flex items-center justify-center text-primary flex-shrink-0">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[9px] uppercase tracking-wider text-muted-foreground/60 block">
                    {t('orderType')}
                  </span>
                  <span className="text-sm font-semibold text-foreground capitalize">
                    {order.order_type}
                  </span>
                </div>
              </div>
            </div>

            {/* Delivery Address (if delivery) */}
            {order.order_type === 'delivery' && (
              <div className="p-4 bg-background border border-border rounded-lg flex gap-3 items-start">
                <div className="w-9 h-9 rounded-full bg-primary/5 border border-border flex items-center justify-center text-primary flex-shrink-0 mt-0.5">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[9px] uppercase tracking-wider text-muted-foreground/60 block">
                    {t('deliveryAddress')}
                  </span>
                  <span className="text-sm font-medium text-foreground leading-relaxed">
                    {order.delivery_address}
                    {order.delivery_apartment && `, ${order.delivery_apartment}`}
                    {order.delivery_postal_code && `, ${order.delivery_postal_code}`}
                    {order.delivery_city && ` ${order.delivery_city}`}
                  </span>
                </div>
              </div>
            )}

            {/* Delivery Intelligence Card */}
            {order.order_type === 'delivery' && (
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg space-y-4">
                <div className="flex justify-between items-center border-b border-primary/10 pb-2">
                  <span className="text-xs font-serif font-bold text-primary flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-primary" />
                    Delivery Address Intelligence
                  </span>
                  {order.delivery_geocoding_status ? (
                    <span className={`text-[9px] uppercase font-semibold tracking-widest px-2 py-0.5 rounded border ${
                      order.delivery_geocoding_status === 'success'
                        ? 'bg-green-500/10 border-green-500/30 text-green-400'
                        : order.delivery_geocoding_status === 'partial'
                        ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                        : 'bg-red-500/10 border-red-500/30 text-red-400'
                    }`}>
                      {order.delivery_geocoding_status.replace(/_/g, ' ')}
                    </span>
                  ) : (
                    <span className="text-[9px] uppercase font-semibold tracking-widest px-2 py-0.5 rounded border bg-yellow-500/10 border-yellow-500/30 text-yellow-400">
                      Not Attempted
                    </span>
                  )}
                </div>

                {/* Formatted address & coordinates */}
                <div className="space-y-1.5 text-xs bg-background/40 p-3 rounded-md border border-border/40">
                  {order.delivery_geocoded_address ? (
                    <div>
                      <strong className="text-muted-foreground/60 text-[9px] uppercase block tracking-wider mb-0.5">Geocoded Address</strong>
                      <span className="text-foreground/90 font-medium leading-relaxed">{order.delivery_geocoded_address}</span>
                    </div>
                  ) : (
                    <div className="text-yellow-600 [.admin-theme_&]:text-yellow-800 dark:text-yellow-400 font-medium italic">
                      Geocoded address is not verified yet.
                    </div>
                  )}
                  {order.delivery_latitude && order.delivery_longitude && (
                    <div className="text-[9px] text-muted-foreground/50 font-mono mt-1 pt-1 border-t border-border/20">
                      Coordinates: {Number(order.delivery_latitude).toFixed(7)}, {Number(order.delivery_longitude).toFixed(7)}
                    </div>
                  )}
                </div>

                {/* Route Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Car metrics */}
                  <div className="p-3 bg-background border border-border rounded-lg space-y-1">
                    <span className="text-[9px] uppercase tracking-widest text-muted-foreground/50 font-semibold block">Driving (Car)</span>
                    {order.delivery_distance_car_meters !== null && order.delivery_distance_car_meters !== undefined ? (
                      <div className="text-sm font-bold text-foreground font-mono">
                        {(order.delivery_distance_car_meters / 1000).toFixed(2)} km
                        <span className="text-muted-foreground/60 font-normal text-xs ml-1.5 font-sans">
                          · {Math.ceil(order.delivery_duration_car_seconds! / 60)} min
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-red-500 italic block font-medium">Distance unavailable</span>
                    )}
                  </div>

                  {/* Walking metrics */}
                  <div className="p-3 bg-background border border-border rounded-lg space-y-1">
                    <span className="text-[9px] uppercase tracking-widest text-muted-foreground/50 font-semibold block">Walking (Pedestrian)</span>
                    {order.delivery_distance_walk_meters !== null && order.delivery_distance_walk_meters !== undefined ? (
                      <div className="text-sm font-bold text-foreground font-mono">
                        {(order.delivery_distance_walk_meters / 1000).toFixed(2)} km
                        <span className="text-muted-foreground/60 font-normal text-xs ml-1.5 font-sans">
                          · {Math.ceil(order.delivery_duration_walk_seconds! / 60)} min
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-red-500 italic block font-medium">Distance unavailable</span>
                    )}
                  </div>
                </div>

                {/* Suggested Delivery Fee */}
                <div className="p-3.5 bg-background border border-border rounded-lg flex justify-between items-center text-xs">
                  <div>
                    <span className="text-[9px] uppercase tracking-widest text-muted-foreground/50 font-bold block">Suggested Fee</span>
                    <span className="text-[9px] text-muted-foreground/40 leading-none">Guidance only, does not alter final billing</span>
                  </div>
                  <span className="text-sm font-mono font-bold text-primary">
                    {order.suggested_delivery_fee_amount !== null && order.suggested_delivery_fee_amount !== undefined
                      ? `${(order.suggested_delivery_fee_amount / 100).toFixed(2)} PLN`
                      : (locale === 'en' ? 'TBD / No Rule Match' : 'Do ustalenia / Brak pasującej reguły')}
                  </span>
                </div>

                {/* Warning / Error */}
                {order.delivery_distance_error && (
                  <div className="p-3 bg-red-500/5 border border-red-500/20 rounded-md text-[10px] text-red-400 leading-relaxed flex items-start gap-2 select-text">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 text-red-500 mt-0.5" />
                    <div>
                      <strong className="block font-bold mb-0.5">Distance Calculation Warning</strong>
                      {order.delivery_distance_error}
                      <p className="mt-1 font-light text-muted-foreground/80">Please check the address manually. Do not display 0 km or 0 min.</p>
                    </div>
                  </div>
                )}

                {/* Recalculate Trigger */}
                <div className="flex justify-between items-center pt-2 border-t border-primary/10 text-[10px]">
                  <span className="text-muted-foreground/40 font-mono">
                    {order.delivery_distance_calculated_at 
                      ? `Updated: ${new Date(order.delivery_distance_calculated_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Europe/Warsaw' })}` 
                      : 'Never calculated'}
                  </span>
                  <Button
                    type="button"
                    onClick={handleRecalculateDistance}
                    disabled={isRecalculating}
                    className="border border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider px-3.5 py-2 h-auto"
                  >
                    {isRecalculating ? 'Calculating...' : 'Recalculate distance'}
                  </Button>
                </div>
              </div>
            )}

            {/* Payment */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3.5 bg-background border border-border rounded-lg flex gap-3 items-center">
                <div className="w-9 h-9 rounded-full bg-primary/5 border border-border flex items-center justify-center text-primary flex-shrink-0">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[9px] uppercase tracking-wider text-muted-foreground/60 block">
                    {t('paymentMethod')}
                  </span>
                  <span className="text-sm font-semibold text-foreground capitalize">
                    {order.payment_method.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>

              <div className="p-3.5 bg-background border border-border rounded-lg flex gap-3 items-center">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                  order.payment_status === 'paid'
                    ? 'bg-green-500/10 border border-border text-green-400'
                    : 'bg-yellow-500/10 border border-border text-yellow-500'
                }`}>
                  {order.payment_status === 'paid' ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <Clock className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <span className="text-[9px] uppercase tracking-wider text-muted-foreground/60 block">
                    {t('paymentStatus')}
                  </span>
                   <span className={`text-sm font-bold uppercase tracking-wider ${
                    order.payment_status === 'paid' ? 'text-green-600 [.admin-theme_&]:text-green-800 dark:text-green-400' : 'text-yellow-600 [.admin-theme_&]:text-yellow-800 dark:text-yellow-400'
                  }`}>
                    {order.payment_status}
                  </span>
                </div>
              </div>
            </div>

            {/* Customer Notes */}
            {order.customer_notes && (
              <div className="p-4 bg-background border border-border rounded-lg flex gap-3 items-start sm:col-span-2">
                <div className="w-9 h-9 rounded-full bg-primary/5 border border-primary/20 flex items-center justify-center text-primary flex-shrink-0 mt-0.5">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[9px] uppercase tracking-wider text-muted-foreground/60 block">
                    {t('customerNotes')}
                  </span>
                  <p className="text-xs text-foreground/90 leading-relaxed italic mt-0.5">
                    &quot;{order.customer_notes}&quot;
                  </p>
                </div>
              </div>
            )}

            {/* Rejection / Cancellation Reason */}
            {order.status === 'rejected' && order.rejection_reason && (
              <div className="p-4 rounded border border-red-500/25 bg-red-500/5 text-xs text-red-300/90 space-y-1">
                <span className="font-bold uppercase tracking-wider text-[9px] block text-red-400 flex items-center gap-1.5">
                  <XCircle className="w-3.5 h-3.5" />
                  Rejection Reason
                </span>
                <p className="italic font-light">&quot;{order.rejection_reason}&quot;</p>
              </div>
            )}
            {order.status === 'cancelled' && order.cancellation_reason && (
              <div className="p-4 rounded border border-orange-500/25 bg-orange-500/5 text-xs text-orange-300/90 space-y-1">
                <span className="font-bold uppercase tracking-wider text-[9px] block text-orange-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Cancellation Reason
                </span>
                <p className="italic font-light">&quot;{order.cancellation_reason}&quot;</p>
              </div>
            )}

            {/* Order Created */}
            <div className="pt-2 border-t border-primary/10">
              <div className="p-3.5 bg-background border border-border rounded-lg flex gap-3 items-center">
                <div className="w-9 h-9 rounded-full bg-primary/5 border border-border flex items-center justify-center text-primary flex-shrink-0">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[9px] uppercase tracking-wider text-muted-foreground/60 block">
                    {t('orderCreated')}
                  </span>
                  <span className="text-xs font-medium text-foreground">
                    {formatDateTime(order.created_at)}
                  </span>
                </div>
              </div>
            </div>
          </PremiumCard>

          {crmStats && (
            <PremiumCard hoverable={false} className="border-primary/25 bg-card p-6 space-y-5">
              <div className="flex justify-between items-center border-b border-border pb-2">
                <h3 className="text-lg font-serif font-bold text-primary tracking-wide">
                  Customer Lifetime Metrics (CRM)
                </h3>
                <span className={`text-[10px] uppercase font-bold tracking-widest px-2.5 py-1 rounded border ${getLoyaltyTier(crmStats.totalOrders).badgeClass}`}>
                  {getLoyaltyTier(crmStats.totalOrders).label} Tier
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Total Orders */}
                <div className="p-3.5 bg-background border border-border rounded-lg space-y-1">
                  <span className="text-[9px] uppercase tracking-wider text-muted-foreground/60 block font-semibold">Total Completed Orders</span>
                  <span className="text-xl font-bold text-foreground font-mono">{crmStats.totalOrders}</span>
                </div>

                {/* Lifetime Value */}
                <div className="p-3.5 bg-background border border-border rounded-lg space-y-1">
                  <span className="text-[9px] uppercase tracking-wider text-muted-foreground/60 block font-semibold">Lifetime Value (LTV)</span>
                  <span className="text-xl font-bold text-primary font-mono">{crmStats.ltv.toFixed(2)} PLN</span>
                </div>

                {/* Average Order Value */}
                <div className="p-3.5 bg-background border border-border rounded-lg space-y-1">
                  <span className="text-[9px] uppercase tracking-wider text-muted-foreground/60 block font-semibold">Average Order Value (AOV)</span>
                  <span className="text-xl font-bold text-foreground font-mono">{crmStats.aov.toFixed(2)} PLN</span>
                </div>
              </div>

              {/* Favorite Dishes */}
              {favoriteDishes && favoriteDishes.length > 0 && (
                <div className="space-y-2 pt-2">
                  <span className="text-[9px] uppercase tracking-wider text-muted-foreground/60 block font-semibold">Favorite Dishes</span>
                  <div className="grid grid-cols-1 gap-2">
                    {favoriteDishes.map((dish, i) => (
                      <div key={i} className="flex justify-between items-center px-3 py-2 bg-background border border-border rounded text-xs">
                        <span className="font-semibold text-foreground/90">{dish.nameEn} <span className="text-muted-foreground/50 text-[10px] font-normal">{dish.namePl && `(${dish.namePl})`}</span></span>
                        <span className="font-mono text-primary font-bold text-[10px] px-2 py-0.5 rounded bg-primary/10 border border-primary/10">{dish.count} ordered</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </PremiumCard>
          )}

          {/* Order Items */}
          <PremiumCard hoverable={false} className="border-border bg-card p-6 space-y-5">
            <h3 className="text-lg font-serif font-bold text-primary tracking-wide border-b border-border pb-2">
              {t('items')} ({items.length})
            </h3>

            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between items-start gap-4 p-3.5 bg-background border border-border rounded text-xs"
                >
                <div className="space-y-1">
                    <span className="font-semibold text-foreground text-sm">
                      {item.item_name_en}
                    </span>
                    {item.item_name_pl && item.item_name_pl !== item.item_name_en && (
                      <span className="text-[10px] text-muted-foreground/50 block">
                        {item.item_name_pl}
                      </span>
                    )}
                    <span className="text-muted-foreground/60 block text-[10px] font-mono">
                      {item.quantity} × {Number(item.unit_price).toFixed(2)} PLN
                    </span>
                    {item.customer_notes && (
                      <span className="text-[10px] text-primary/75 italic leading-tight block pt-0.5">
                        * {item.customer_notes}
                      </span>
                    )}
                  </div>
                  <span className="font-bold text-foreground font-mono whitespace-nowrap">
                    {Number(item.line_total).toFixed(2)} PLN
                  </span>
                </div>
              ))}
            </div>

            {/* Pricing Summary */}
            <div className="space-y-3 pt-4 border-t border-border text-xs">
              <h4 className="text-sm font-bold uppercase tracking-wider text-primary">
                {t('pricingSummary')}
              </h4>

              <div className="flex justify-between text-muted-foreground">
                <span>{t('subtotal')}</span>
                <span className="font-mono">{Number(order.items_subtotal).toFixed(2)} PLN</span>
              </div>

              {Number(order.packaging_total) > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>{t('packagingFee')}</span>
                  <span className="font-mono">{Number(order.packaging_total).toFixed(2)} PLN</span>
                </div>
              )}

              {order.order_type === 'delivery' && (
                <div className="flex justify-between items-start gap-1">
                  <span className="text-muted-foreground">{t('deliveryFee')}</span>
                  {isDeliveryUnresolved ? (
                    <span className="text-primary font-bold italic">
                      {t('deliveryFeeTbd')}
                    </span>
                  ) : (
                    <span className="font-mono text-foreground font-semibold">
                      {Number(order.delivery_fee).toFixed(2)} PLN
                    </span>
                  )}
                </div>
              )}

              <div className="flex justify-between text-foreground font-bold text-sm pt-3 border-t border-border">
                <span>{isDeliveryUnresolved ? t('estimatedTotal') : t('finalTotal')}</span>
                <span className="text-primary font-mono text-base font-bold">
                  {Number(order.total_amount).toFixed(2)} PLN
                </span>
              </div>
            </div>
          </PremiumCard>
        </div>

        {/* Right Column — Timeline + Actions (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Action Buttons */}
          <PremiumCard hoverable={false} className="border-border bg-card p-6 space-y-4">
            <h3 className="text-lg font-serif font-bold text-primary tracking-wide border-b border-border pb-2">
              {t('actions')}
            </h3>

            <div className="flex flex-wrap gap-2">
              {/* Confirm */}
              {order.status === 'pending' && (
                <>
                  <Button
                    onClick={() => setModalType('confirm')}
                    disabled={isPending}
                    className="bg-green-600 hover:bg-green-700 text-white font-bold text-[10px] uppercase tracking-wider px-4 py-2"
                  >
                    {t('confirmButton')}
                  </Button>
                  <Button
                    onClick={() => setModalType('reject')}
                    disabled={isPending}
                    className="border border-red-500/25 bg-transparent hover:bg-red-500/10 text-red-400 font-bold text-[10px] uppercase tracking-wider px-4 py-2"
                  >
                    {t('rejectButton')}
                  </Button>
                </>
              )}

              {/* Start Preparing */}
              {order.status === 'approved' && (
                <Button
                  onClick={handleStartPreparing}
                  disabled={isPending}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] uppercase tracking-wider px-4 py-2"
                >
                  {t('startPreparing')}
                </Button>
              )}

              {/* Mark Ready / Dispatch */}
              {(order.status === 'approved' || order.status === 'preparing') && (
                <Button
                  onClick={handleMarkReady}
                  disabled={isPending}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] uppercase tracking-wider px-4 py-2"
                >
                  {isTakeaway ? t('markReady') : t('dispatch')}
                </Button>
              )}

              {/* Complete */}
              {((isTakeaway && order.status === 'ready_for_pickup') ||
                (!isTakeaway && order.status === 'out_for_delivery')) && (
                <Button
                  onClick={() => setModalType('complete')}
                  disabled={isPending}
                  className="bg-green-600 hover:bg-green-700 text-white font-bold text-[10px] uppercase tracking-wider px-4 py-2"
                >
                  {t('completeButton')}
                </Button>
              )}

              {/* Update ETA */}
              {(order.status === 'approved' || order.status === 'preparing') && (
                <Button
                  onClick={() => setModalType('updateEta')}
                  disabled={isPending}
                  className="border border-primary/20 bg-transparent hover:bg-primary/5 text-primary font-bold text-[10px] uppercase tracking-wider px-4 py-2"
                >
                  {t('updateEta')}
                </Button>
              )}

              {/* Cancel */}
              {['approved', 'preparing', 'pending'].includes(order.status) && (
                <Button
                  onClick={() => setModalType('cancel')}
                  disabled={isPending}
                  className="border border-red-500/25 bg-transparent hover:bg-red-500/10 text-red-400 font-bold text-[10px] uppercase tracking-wider px-4 py-2"
                >
                  {t('cancelButton')}
                </Button>
              )}

              {/* No actions available for terminal states */}
              {['completed', 'rejected', 'cancelled'].includes(order.status) && (
                <p className="text-[10px] text-muted-foreground/50 italic w-full">
                  No further actions available for this order.
                </p>
              )}
            </div>
          </PremiumCard>

          {/* Timeline */}
          <PremiumCard hoverable={false} className="border-border bg-card p-6 space-y-6">
            <h3 className="text-lg font-serif font-bold text-primary tracking-wide border-b border-border pb-2">
              {t('orderTimeline')}
            </h3>

            <div className="relative pl-6 space-y-6 border-l border-border py-1">
              {timeline.map((event, idx) => {
                const eventMappedStatus =
                  event.new_status === 'approved' ? 'confirmed' : event.new_status;
                const isLast = idx === timeline.length - 1;
                const dotColor = isLast
                  ? event.new_status === 'approved' ||
                    event.new_status === 'confirmed' ||
                    event.new_status === 'completed' ||
                    event.new_status === 'ready_for_pickup'
                    ? 'bg-green-500 ring-4 ring-green-500/20 border-green-400'
                    : event.new_status === 'rejected'
                    ? 'bg-red-500 ring-4 ring-red-500/20 border-red-400'
                    : event.new_status === 'cancelled'
                    ? 'bg-orange-500 ring-4 ring-orange-500/20 border-orange-400'
                    : 'bg-amber-500 ring-4 ring-amber-500/20 border-amber-400'
                  : 'bg-primary/45 border-primary/30';

                return (
                  <div key={event.id} className="relative space-y-1">
                    <span
                      className={`absolute -left-[31px] top-1.5 w-2.5 h-2.5 rounded-full border ${dotColor}`}
                    />
                    <div className="flex justify-between items-center gap-2">
                      <span
                        className={`text-[11px] font-sans font-semibold tracking-wide ${
                          isLast
                            ? 'text-foreground font-bold'
                            : 'text-muted-foreground/75'
                        }`}
                      >
                        {t(`status.${eventMappedStatus}` as any)}
                      </span>
                      <span className="text-[9px] font-mono text-muted-foreground/50">
                        {formatDateTime(event.created_at)}
                      </span>
                    </div>

                    {/* Actor info */}
                    {event.profiles && (
                      <p className="text-[9px] text-muted-foreground/40">
                        by {event.profiles.full_name} ({event.profiles.role})
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </PremiumCard>

          {/* Order Reference Info */}
          <PremiumCard hoverable={false} className="border-border bg-card p-6 space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-primary">
              {t('orderRef')}
            </h3>
            <div className="text-[10px] text-muted-foreground/60 font-mono space-y-1">
              <p>
                <span className="text-muted-foreground/40">Token:</span>{' '}
                <span className="select-all">{order.token}</span>
              </p>
              <p>
                <span className="text-muted-foreground/40">ID:</span>{' '}
                <span className="select-all">{order.id}</span>
              </p>
            </div>
          </PremiumCard>
        </div>
      </div>

      {/* Historical Order Table */}
      {pastOrders && pastOrders.length > 0 && (
        <PremiumCard hoverable={false} className="border-border bg-card p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-border pb-3 gap-3">
            <div>
              <h3 className="text-lg font-serif font-bold text-primary tracking-wide">
                Customer Order History
              </h3>
              <p className="text-xs text-muted-foreground/60 mt-0.5">
                Past orders placed by this customer (excluding current order)
              </p>
            </div>
            <Button
              onClick={handleExportCSV}
              className="border border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider px-4 py-2 flex items-center gap-2 self-start sm:self-center"
            >
              <Download className="w-4 h-4" />
              Export to CSV
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-muted-foreground uppercase tracking-widest text-[9px] font-bold">
                  <th className="p-3">Order ID</th>
                  <th className="p-3">Date & Time</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Total Amount</th>
                  <th className="p-3">Payment Method</th>
                  <th className="p-3">Payment Status</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {pastOrders.map((o) => {
                  const orderIdShort = o.id.substring(0, 8).toUpperCase();
                  const dateFormatted = formatDateTime(o.created_at);
                  const totalFormatted = `${Number(o.total_amount).toFixed(2)} PLN`;
                  const paymentMethod = o.payment_method ? o.payment_method.replace(/_/g, ' ') : 'N/A';
                  
                  return (
                    <tr
                      key={o.id}
                      onClick={() => setActivePastOrderId(o.id)}
                      className="hover:bg-muted/40 transition-colors cursor-pointer"
                    >
                      <td className="p-3 font-mono font-bold text-foreground">#{orderIdShort}</td>
                      <td className="p-3 text-muted-foreground">{dateFormatted}</td>
                      <td className="p-3 capitalize text-foreground">{o.order_type}</td>
                      <td className="p-3 font-mono font-semibold text-primary">{totalFormatted}</td>
                      <td className="p-3 capitalize text-muted-foreground">{paymentMethod}</td>
                      <td className="p-3">
                        <span className={`text-[10px] font-semibold uppercase tracking-wider ${
                          o.payment_status === 'paid' ? 'text-green-500' : 'text-yellow-500'
                        }`}>
                          {o.payment_status}
                        </span>
                      </td>
                      <td className="p-3">
                        <StatusPill
                          status={getStatusPillType(o.status)}
                          label={t(`status.${o.status === 'approved' ? 'confirmed' : o.status}` as any)}
                        />
                      </td>
                      <td className="p-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActivePastOrderId(o.id);
                          }}
                          className="text-primary hover:text-primary-foreground hover:bg-primary/20 text-xs font-semibold px-2.5 py-1.5 h-auto"
                        >
                          View Details
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </PremiumCard>
      )}

      {/* Past Order Side Drawer */}
      <AnimatePresence>
        {activePastOrderId && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setActivePastOrderId(null)}
              className="fixed inset-0 bg-black backdrop-blur-xs z-50 cursor-pointer"
            />

            {/* Sliding Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 w-full max-w-lg bg-card border-l border-border shadow-2xl z-50 flex flex-col h-full font-sans"
            >
              {/* Drawer Header */}
              <div className="flex justify-between items-center px-6 py-4 border-b border-border bg-muted/20">
                <div>
                  <h3 className="text-lg font-serif font-bold text-primary">
                    Past Order Details
                  </h3>
                  <p className="text-[10px] text-muted-foreground/60 font-mono mt-0.5 select-all">
                    Order ID: #{activePastOrderId.substring(0, 8).toUpperCase()}
                  </p>
                </div>
                <Button
                  onClick={() => setActivePastOrderId(null)}
                  variant="ghost"
                  className="w-8 h-8 rounded-full p-0 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {/* Drawer Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 select-text">
                {pastOrderLoading ? (
                  <div className="flex justify-center items-center h-48">
                    <GoldSpinner />
                  </div>
                ) : pastOrderDetail ? (
                  <>
                    {/* Status Overview */}
                    <div className="flex justify-between items-center bg-background border border-border rounded-lg p-4">
                      <div>
                        <span className="text-[9px] uppercase tracking-wider text-muted-foreground/60 block">Order Status</span>
                        <div className="mt-1">
                          <StatusPill
                            status={getStatusPillType(pastOrderDetail.status)}
                            label={t(`status.${pastOrderDetail.status === 'approved' ? 'confirmed' : pastOrderDetail.status}` as any)}
                          />
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] uppercase tracking-wider text-muted-foreground/60 block">Order Type</span>
                        <span className="text-sm font-semibold capitalize text-foreground mt-1 block">
                          {pastOrderDetail.order_type}
                        </span>
                      </div>
                    </div>

                    {/* Timeline Info */}
                    <div className="space-y-2.5 bg-background border border-border rounded-lg p-4 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Order Date:</span>
                        <span className="font-medium text-foreground">{formatDateTime(pastOrderDetail.created_at)}</span>
                      </div>
                      {pastOrderDetail.completed_at && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Completed Date:</span>
                          <span className="font-medium text-foreground">{formatDateTime(pastOrderDetail.completed_at)}</span>
                        </div>
                      )}
                      {pastOrderDetail.approved_at && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Confirmed Date:</span>
                          <span className="font-medium text-foreground">{formatDateTime(pastOrderDetail.approved_at)}</span>
                        </div>
                      )}
                    </div>

                    {/* Order Items */}
                    <div className="space-y-3 bg-background border border-border rounded-lg p-4">
                      <span className="text-[9px] uppercase tracking-wider text-muted-foreground/60 block font-bold">Items Ordered</span>
                      <div className="divide-y divide-border/60">
                        {pastOrderItems.map((item) => (
                          <div key={item.id} className="py-2.5 first:pt-0 last:pb-0 flex justify-between text-xs">
                            <div className="space-y-0.5 pr-2">
                              <span className="font-semibold text-foreground">{item.item_name_en}</span>
                              {item.item_name_pl && item.item_name_pl !== item.item_name_en && (
                                <span className="text-[10px] text-muted-foreground/50 block">{item.item_name_pl}</span>
                              )}
                              <span className="text-[10px] font-mono text-muted-foreground/60 block">
                                {item.quantity} × {Number(item.unit_price).toFixed(2)} PLN
                              </span>
                              {item.spice_level_snapshot !== null && item.spice_level_snapshot !== undefined && (
                                <span className="text-[10px] text-amber-500 font-semibold block">Spice level: {item.spice_level_snapshot}/5</span>
                              )}
                            </div>
                            <span className="font-mono text-foreground font-semibold whitespace-nowrap">
                              {Number(item.line_total).toFixed(2)} PLN
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Delivery details if applicable */}
                    {pastOrderDetail.order_type === 'delivery' && (
                      <div className="p-4 bg-background border border-border rounded-lg space-y-2 text-xs">
                        <span className="text-[9px] uppercase tracking-wider text-muted-foreground/60 block font-bold">Delivery Location</span>
                        <div className="flex gap-2.5 items-start">
                          <MapPin className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                          <div>
                            <span className="font-medium text-foreground leading-relaxed">
                              {pastOrderDetail.delivery_address}
                              {pastOrderDetail.delivery_apartment && `, ${pastOrderDetail.delivery_apartment}`}
                              {pastOrderDetail.delivery_postal_code && `, ${pastOrderDetail.delivery_postal_code}`}
                              {pastOrderDetail.delivery_city && ` ${pastOrderDetail.delivery_city}`}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Payment Info */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3.5 bg-background border border-border rounded-lg text-xs space-y-1">
                        <span className="text-[9px] uppercase tracking-wider text-muted-foreground/60 block">Payment Method</span>
                        <span className="font-semibold capitalize text-foreground font-sans block">
                          {pastOrderDetail.payment_method ? pastOrderDetail.payment_method.replace(/_/g, ' ') : 'N/A'}
                        </span>
                      </div>
                      <div className="p-3.5 bg-background border border-border rounded-lg text-xs space-y-1">
                        <span className="text-[9px] uppercase tracking-wider text-muted-foreground/60 block">Payment Status</span>
                        <span className={`font-bold uppercase tracking-wider text-xs block ${
                          pastOrderDetail.payment_status === 'paid' ? 'text-green-500' : 'text-yellow-500'
                        }`}>
                          {pastOrderDetail.payment_status || 'pending'}
                        </span>
                      </div>
                    </div>

                    {/* Pricing details */}
                    <div className="p-4 bg-background border border-border rounded-lg text-xs space-y-2">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Items Subtotal</span>
                        <span className="font-mono">{Number(pastOrderDetail.items_subtotal).toFixed(2)} PLN</span>
                      </div>
                      {Number(pastOrderDetail.packaging_total) > 0 && (
                        <div className="flex justify-between text-muted-foreground">
                          <span>Packaging Fee</span>
                          <span className="font-mono">{Number(pastOrderDetail.packaging_total).toFixed(2)} PLN</span>
                        </div>
                      )}
                      {pastOrderDetail.order_type === 'delivery' && (
                        <div className="flex justify-between text-muted-foreground">
                          <span>Delivery Fee</span>
                          <span className="font-mono">{Number(pastOrderDetail.delivery_fee).toFixed(2)} PLN</span>
                        </div>
                      )}
                      <div className="flex justify-between text-foreground font-bold text-sm pt-2.5 border-t border-border/60">
                        <span>Total Amount</span>
                        <span className="text-primary font-mono text-base font-bold">
                          {Number(pastOrderDetail.total_amount).toFixed(2)} PLN
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    Failed to load order details.
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Modals */}
      {modalType === 'confirm' && (
        <ConfirmOrderModal
          isOpen={true}
          onClose={() => setModalType(null)}
          orderType={order.order_type}
          onSubmit={handleModalSubmit}
          order={order}
        />
      )}

      {modalType === 'reject' && (
        <RejectOrderModal
          isOpen={true}
          onClose={() => setModalType(null)}
          onSubmit={handleModalSubmit}
        />
      )}

      {modalType === 'cancel' && (
        <CancelOrderModal
          isOpen={true}
          onClose={() => setModalType(null)}
          onSubmit={handleModalSubmit}
        />
      )}

      {modalType === 'updateEta' && (
        <UpdateEtaModal
          isOpen={true}
          onClose={() => setModalType(null)}
          orderType={order.order_type}
          onSubmit={handleModalSubmit}
        />
      )}

      {modalType === 'complete' && (
        <CompleteOrderModal
          isOpen={true}
          onClose={() => setModalType(null)}
          onSubmit={handleModalSubmit}
        />
      )}
    </div>
  );
}
