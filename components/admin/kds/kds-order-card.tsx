'use client';

import React, { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  ChefHat,
  Truck,
  ShoppingBag,
  Clock,
  Timer,
  AlertTriangle,
  Flame,
  MessageSquare,
} from 'lucide-react';

export type KdsOrderItem = {
  id: string;
  order_id: string;
  item_name_pl: string;
  item_name_en: string;
  quantity: number;
  customer_notes: string | null;
  kitchen_notes: string | null;
  allergens_snapshot: string[];
  spice_level_snapshot: number;
};

export type KdsOrder = {
  id: string;
  status: string;
  order_type: 'delivery' | 'takeaway';
  customer_first_name: string;
  customer_notes: string | null;
  estimated_time: string | null;
  payment_method: string;
  created_at: string;
  approved_at: string | null;
  preparing_at: string | null;
  ready_at: string | null;
  dispatched_at: string | null;
  items: KdsOrderItem[];
};

type Props = {
  order: KdsOrder;
  onStartPreparing: (id: string) => void;
  onMarkReady: (id: string) => void;
  isPending: boolean;
  isNew?: boolean;
};

/** Spice level indicator */
function SpiceIndicator({ level }: { level: number }) {
  if (level <= 0) return null;
  return (
    <span className="inline-flex items-center gap-0.5 text-orange-400" title={`Spice: ${level}/5`}>
      {Array.from({ length: Math.min(level, 5) }).map((_, i) => (
        <Flame key={i} className="w-3 h-3" />
      ))}
    </span>
  );
}

/** Elapsed time display */
function useElapsedTime(startTime: string | null) {
  const [elapsed, setElapsed] = useState('');

  useEffect(() => {
    if (!startTime) return;

    const update = () => {
      const diff = Date.now() - new Date(startTime).getTime();
      const mins = Math.floor(diff / 60000);
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

/** ETA countdown */
function useEtaCountdown(estimatedTime: string | null) {
  const [eta, setEta] = useState<{ text: string; isOverdue: boolean; minsLeft: number }>({
    text: '',
    isOverdue: false,
    minsLeft: Infinity,
  });

  useEffect(() => {
    if (!estimatedTime) return;

    const update = () => {
      const diff = new Date(estimatedTime).getTime() - Date.now();
      const mins = Math.round(diff / 60000);
      const timeStr = new Date(estimatedTime).toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'Europe/Warsaw',
      });

      if (mins <= 0) {
        setEta({ text: timeStr, isOverdue: true, minsLeft: mins });
      } else {
        setEta({ text: `${timeStr} (${mins}m)`, isOverdue: false, minsLeft: mins });
      }
    };

    update();
    const interval = setInterval(update, 30000);
    return () => clearInterval(interval);
  }, [estimatedTime]);

  return eta;
}

export default function KdsOrderCard({
  order,
  onStartPreparing,
  onMarkReady,
  isPending,
  isNew,
}: Props) {
  const t = useTranslations('kds');
  const elapsed = useElapsedTime(order.approved_at || order.created_at);
  const eta = useEtaCountdown(order.estimated_time);

  const isDelivery = order.order_type === 'delivery';
  const isTakeaway = order.order_type === 'takeaway';

  // Short order ref (last 6 chars of UUID)
  const orderRef = `#${order.id.slice(-6).toUpperCase()}`;

  // Urgency level for border color
  const getUrgencyClass = () => {
    if (order.status === 'ready_for_pickup' || order.status === 'out_for_delivery') {
      return 'border-l-green-500';
    }
    if (order.status === 'preparing') {
      if (eta.isOverdue) return 'border-l-red-500';
      if (eta.minsLeft <= 5) return 'border-l-red-500';
      if (eta.minsLeft <= 10) return 'border-l-orange-400';
      return 'border-l-blue-500';
    }
    // approved / new
    return 'border-l-amber-400';
  };

  return (
    <div
      className={`
        bg-[#0B1128] border border-white/10 rounded-lg overflow-hidden
        border-l-4 ${getUrgencyClass()}
        ${isNew ? 'ring-2 ring-amber-400/50 animate-pulse-once' : ''}
        transition-all duration-300
      `}
      role="article"
      aria-label={`${t('order')} ${orderRef} — ${isDelivery ? t('delivery') : t('takeaway')}`}
    >
      {/* Header */}
      <div className="p-4 pb-3 flex items-center justify-between gap-2 border-b border-white/5">
        <div className="flex items-center gap-3">
          {/* Order Ref */}
          <span className="text-xl font-mono font-black text-white tracking-wider">
            {orderRef}
          </span>

          {/* Type Badge */}
          <span
            className={`
              inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider
              ${isDelivery
                ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
              }
            `}
          >
            {isDelivery ? <Truck className="w-3.5 h-3.5" /> : <ShoppingBag className="w-3.5 h-3.5" />}
            {isDelivery ? t('delivery') : t('takeaway')}
          </span>
        </div>

        {/* Customer first name */}
        {order.customer_first_name && (
          <span className="text-xs text-muted-foreground/60 font-medium truncate max-w-[80px]">
            {order.customer_first_name}
          </span>
        )}
      </div>

      {/* Time Bar */}
      <div className="px-4 py-2.5 flex items-center justify-between text-xs bg-white/[0.02] border-b border-white/5">
        <div className="flex items-center gap-1.5 text-muted-foreground/70">
          <Clock className="w-3.5 h-3.5" />
          <span>{t('elapsed')}: <strong className="text-white/80">{elapsed}</strong></span>
        </div>

        {order.estimated_time && (
          <div className={`flex items-center gap-1.5 font-mono font-bold ${
            eta.isOverdue ? 'text-red-400' : eta.minsLeft <= 10 ? 'text-orange-400' : 'text-green-400/80'
          }`}>
            <Timer className="w-3.5 h-3.5" />
            <span>{eta.text}</span>
            {eta.isOverdue && <AlertTriangle className="w-3.5 h-3.5 text-red-400" />}
          </div>
        )}
      </div>

      {/* Items List */}
      <div className="p-4 space-y-2">
        {order.items.map((item) => (
          <div key={item.id} className="flex items-start gap-3">
            {/* Quantity Badge */}
            <span className="flex-shrink-0 w-8 h-8 rounded bg-white/10 flex items-center justify-center text-base font-black text-white">
              {item.quantity}
            </span>

            <div className="flex-1 min-w-0">
              {/* Item Name */}
              <p className="text-sm font-semibold text-white leading-tight">
                {item.item_name_en}
              </p>
              {item.item_name_pl && item.item_name_pl !== item.item_name_en && (
                <p className="text-[10px] text-muted-foreground/50 leading-tight">
                  {item.item_name_pl}
                </p>
              )}

              {/* Allergens + Spice */}
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                {item.allergens_snapshot && item.allergens_snapshot.length > 0 && (
                  <span className="text-[10px] font-bold text-red-400/90 uppercase tracking-wide bg-red-500/10 px-1.5 py-0.5 rounded">
                    ⚠ {item.allergens_snapshot.join(', ')}
                  </span>
                )}
                <SpiceIndicator level={item.spice_level_snapshot} />
              </div>

              {/* Item Notes */}
              {(item.customer_notes || item.kitchen_notes) && (
                <div className="mt-1 space-y-0.5">
                  {item.customer_notes && (
                    <p className="text-[11px] text-amber-300/80 italic flex items-start gap-1">
                      <MessageSquare className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      {item.customer_notes}
                    </p>
                  )}
                  {item.kitchen_notes && (
                    <p className="text-[11px] text-cyan-300/80 italic flex items-start gap-1">
                      <ChefHat className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      {item.kitchen_notes}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Order-level customer notes */}
      {order.customer_notes && (
        <div className="px-4 pb-3">
          <div className="p-2.5 rounded bg-amber-500/5 border border-amber-500/15 text-[11px] text-amber-300/80 italic">
            <span className="font-bold text-amber-400 uppercase text-[9px] tracking-wider block mb-0.5 not-italic">
              {t('customerNote')}
            </span>
            {order.customer_notes}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="p-4 pt-2 border-t border-white/5">
        {order.status === 'approved' && (
          <button
            onClick={() => onStartPreparing(order.id)}
            disabled={isPending}
            className="w-full py-3.5 rounded-lg bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-black font-black text-sm uppercase tracking-widest transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-[#0B1128]"
            aria-label={`${t('startPreparing')} ${orderRef}`}
          >
            <span className="flex items-center justify-center gap-2">
              <ChefHat className="w-5 h-5" />
              {t('startPreparing')}
            </span>
          </button>
        )}

        {order.status === 'preparing' && (
          <button
            onClick={() => onMarkReady(order.id)}
            disabled={isPending}
            className={`w-full py-3.5 rounded-lg font-black text-sm uppercase tracking-widest transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0B1128] ${
              isDelivery
                ? 'bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white focus:ring-blue-400'
                : 'bg-green-500 hover:bg-green-600 active:bg-green-700 text-white focus:ring-green-400'
            }`}
            aria-label={`${isTakeaway ? t('markReady') : t('handedToCourier')} ${orderRef}`}
          >
            <span className="flex items-center justify-center gap-2">
              {isDelivery ? <Truck className="w-5 h-5" /> : <ShoppingBag className="w-5 h-5" />}
              {isTakeaway ? t('markReady') : t('handedToCourier')}
            </span>
          </button>
        )}

        {(order.status === 'ready_for_pickup' || order.status === 'out_for_delivery') && (
          <div className="text-center py-2">
            <span className={`text-xs font-bold uppercase tracking-widest ${
              order.status === 'ready_for_pickup' ? 'text-green-400' : 'text-blue-400'
            }`}>
              {order.status === 'ready_for_pickup' ? t('readyForPickup') : t('outForDelivery')}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
