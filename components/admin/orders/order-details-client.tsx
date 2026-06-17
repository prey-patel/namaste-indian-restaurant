'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
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
  status: string;
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
};

export default function OrderDetailsClient({ order, items, timeline }: Props) {
  const router = useRouter();
  const t = useTranslations('adminOrders');
  const [isPending, startTransition] = useTransition();

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

  // ETA calculation
  const etaInfo = (() => {
    if (!order.estimated_time) return null;
    const etaDate = new Date(order.estimated_time);
    const now = new Date();
    const diffMs = etaDate.getTime() - now.getTime();
    const minsLeft = Math.max(0, Math.round(diffMs / 60000));
    const timeStr = etaDate.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Europe/Warsaw',
    });
    return { timeStr, minsLeft, isPast: diffMs <= 0 };
  })();

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
                      : 'TBD / No Rule Match'}
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

            {/* Order Created / ETA */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-primary/10">
              <div className="p-3.5 bg-[#070B1E] border border-primary/10 rounded-lg flex gap-3 items-center">
                <div className="w-9 h-9 rounded-full bg-primary/5 border border-primary/20 flex items-center justify-center text-primary flex-shrink-0">
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

              {etaInfo && (
                <div className="p-3.5 bg-[#070B1E] border border-primary/10 rounded-lg flex gap-3 items-center">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                    etaInfo.isPast
                      ? 'bg-red-500/10 border border-red-500/20 text-red-400'
                      : 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                  }`}>
                    <Timer className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[9px] uppercase tracking-wider text-muted-foreground/60 block">
                      {t('estimatedTime')}
                    </span>
                    <span className="text-xs font-bold text-foreground font-mono">
                      {etaInfo.timeStr}
                    </span>
                    <span className={`text-[9px] block mt-0.5 ${
                      etaInfo.isPast ? 'text-red-400' : 'text-muted-foreground/60'
                    }`}>
                      {etaInfo.isPast
                        ? 'Overdue'
                        : `${etaInfo.minsLeft} min remaining`}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </PremiumCard>

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
                  event.status === 'approved' ? 'confirmed' : event.status;
                const isLast = idx === timeline.length - 1;
                const dotColor = isLast
                  ? event.status === 'approved' ||
                    event.status === 'confirmed' ||
                    event.status === 'completed' ||
                    event.status === 'ready_for_pickup'
                    ? 'bg-green-500 ring-4 ring-green-500/20 border-green-400'
                    : event.status === 'rejected'
                    ? 'bg-red-500 ring-4 ring-red-500/20 border-red-400'
                    : event.status === 'cancelled'
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
