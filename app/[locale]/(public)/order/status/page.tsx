import React from 'react';
import Link from 'next/link';
import { Metadata } from 'next';
import crypto from 'crypto';
import { headers } from 'next/headers';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isRateLimited } from '@/lib/security/rate-limit';
import PageTransition from '@/components/ui/page-transition';
import SectionContainer from '@/components/ui/section-container';
import PremiumCard from '@/components/ui/premium-card';
import MandalaWatermark from '@/components/ui/mandala-watermark';
import StatusPill from '@/components/ui/status-pill';
import { Button } from '@/components/ui/button';
import { ShoppingBag, MapPin, CreditCard, Calendar, Clock, AlertTriangle } from 'lucide-react';
import OrderStatusRealtimeListener from '@/components/public/order/order-status-realtime-listener';
import OrderReviewForm from '@/components/public/order/order-review-form';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Track Order Request | Namaste Indian Restaurant',
  robots: {
    index: false,
    follow: false,
  },
};

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ id?: string; token?: string }>;
};

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getOrderStatusPillType(status: string): 'pending' | 'success' | 'warning' | 'error' | 'info' | 'neutral' {
  switch (status) {
    case 'pending': return 'pending';
    case 'approved':
    case 'confirmed': return 'success';
    case 'preparing': return 'info';
    case 'out_for_delivery': return 'info';
    case 'delivered': return 'success';
    case 'ready_for_pickup': return 'success';
    case 'picked_up': return 'success';
    case 'completed': return 'success';
    case 'rejected': return 'error';
    case 'cancelled': return 'warning';
    default: return 'neutral';
  }
}

export default async function OrderStatusPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const { id, token } = await searchParams;
  const t = await getTranslations('order');

  // Validate parameters are valid UUIDs
  const isValid = id && token && uuidRegex.test(id) && uuidRegex.test(token);

  let isLimited = false;
  let retryAfter = 0;

  if (isValid) {
    const headersList = await headers();
    const ip = headersList.get('x-forwarded-for')?.split(',')[0] || headersList.get('x-real-ip') || '127.0.0.1';
    const secret = process.env.ORDER_IP_HASH_SECRET;
    if (secret) {
      const ipHash = crypto.createHmac('sha256', secret).update(ip).digest('hex');
      try {
        const rateCheck = await isRateLimited(ipHash, 'order_status_lookup', 30, 60); // 30 requests per minute
        if (rateCheck.limited) {
          isLimited = true;
          retryAfter = rateCheck.retryAfterSeconds;
        }
      } catch (err) {
        // Fail-closed fallback: return rate limited
        isLimited = true;
        retryAfter = 60;
      }
    } else {
      console.error('ERROR: ORDER_IP_HASH_SECRET is missing in environment!');
      isLimited = true;
      retryAfter = 60;
    }
  }

  if (isLimited) {
    return (
      <PageTransition>
        <section className="relative overflow-hidden bg-[#070B1E] py-20 text-center border-b border-primary/15 min-h-[50vh] flex flex-col justify-center animate-fade-in">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-primary/5 rounded-full blur-[80px] pointer-events-none" />
          <MandalaWatermark className="w-[300px] h-[300px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03]" />
          
          <div className="max-w-md mx-auto px-4 relative z-10 space-y-6">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto" />
            <h1 className="text-2xl font-serif font-bold text-foreground">
              {locale === 'pl' ? 'Zbyt wiele zapytań' : 'Too Many Requests'}
            </h1>
            <p className="text-sm text-muted-foreground/80 font-light leading-relaxed">
              {locale === 'pl'
                ? `Przekroczono limit zapytań. Spróbuj ponownie za ${retryAfter} sekund.`
                : `Rate limit exceeded. Please try again in ${retryAfter} seconds.`}
            </p>
          </div>
        </section>
      </PageTransition>
    );
  }

  let order: any = null;
  let review: any = null;

  if (isValid) {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient.rpc('get_public_order_details_by_token', {
      ord_id: id,
      sec_token: token,
    });

    if (!error && data && data.length > 0) {
      order = data[0];

      // Fetch review if it exists
      const { data: reviewData } = await adminClient
        .from('reviews')
        .select('rating, comment')
        .eq('order_id', id)
        .maybeSingle();
      
      review = reviewData;
    }
  }

  // Not Found State
  if (!order) {
    return (
      <PageTransition>
        <section className="relative overflow-hidden bg-[#070B1E] py-20 text-center border-b border-primary/15 min-h-[50vh] flex flex-col justify-center animate-fade-in">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-primary/5 rounded-full blur-[80px] pointer-events-none" />
          <MandalaWatermark className="w-[300px] h-[300px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03]" />
          
          <div className="max-w-md mx-auto px-4 relative z-10 space-y-6">
            <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
            <h1 className="text-2xl font-serif font-bold text-foreground">
              {locale === 'pl' ? 'Zamówienie nie zostało znalezione' : 'Order Not Found'}
            </h1>
            <p className="text-sm text-muted-foreground/80 font-light leading-relaxed">
              {locale === 'pl'
                ? 'Podany numer referencyjny zamówienia jest nieprawidłowy, wygasł lub zamówienie nie istnieje.'
                : 'The provided order reference is invalid, expired, or does not exist.'}
            </p>
            <div className="pt-2">
              <Link href={`/${locale}/order`}>
                <Button className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs uppercase tracking-wider px-6 py-2.5">
                  {locale === 'pl' ? 'Wróć do zamówień' : 'Back to ordering'}
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </PageTransition>
    );
  }

  // Map database status 'approved' to 'confirmed' for translations
  const mappedStatus = order.status === 'approved' ? 'confirmed' : order.status;
  const statusLabel = t(`status.${mappedStatus}` as any);
  const statusDesc = t(`statusDesc.${mappedStatus}` as any);

  const formattedDate = new Date(order.created_at).toLocaleDateString(locale === 'pl' ? 'pl-PL' : 'en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const formattedTime = new Date(order.created_at).toLocaleTimeString(locale === 'pl' ? 'pl-PL' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  // Check if delivery fee is unresolved (0.00 PLN for delivery orders indicates unresolved)
  const isDeliveryUnresolved = order.order_type === 'delivery' && Number(order.delivery_fee) === 0;

  const displayDeliveryFee = isDeliveryUnresolved 
    ? null 
    : Number(order.delivery_fee);

  const estimatedAmount = Number(order.items_subtotal) + 
                          Number(order.packaging_total) + 
                          Number(order.other_charges_total || 0) - 
                          Number(order.discount_total || 0);

  const displayTotalAmount = isDeliveryUnresolved 
    ? estimatedAmount 
    : Number(order.total_amount);

  return (
    <PageTransition>
      <OrderStatusRealtimeListener orderId={id!} />
      {/* Hero Header */}
      <section className="relative overflow-hidden bg-[#070B1E] py-16 md:py-24 text-center border-b border-primary/15">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-primary/5 rounded-full blur-[80px] pointer-events-none" />
        <MandalaWatermark className="w-[300px] h-[300px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03]" />

        <div className="max-w-3xl mx-auto px-4 relative z-10 space-y-4">
          <div className="flex justify-center items-center space-x-2 text-primary">
            <div className="h-[1px] w-6 bg-primary/30" />
            <span className="text-[10px] tracking-[0.25em] font-extrabold uppercase">{t('trackTitle')}</span>
            <div className="h-[1px] w-6 bg-primary/30" />
          </div>
          <h1 className="text-3xl sm:text-5xl font-serif font-black tracking-wide text-foreground">
            {locale === 'pl' ? 'Twoje Zamówienie' : 'Your Order'}
          </h1>
          <p className="text-xs text-muted-foreground/60 font-mono select-all">
            ID: {id}
          </p>
        </div>
      </section>

      <SectionContainer>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 max-w-6xl mx-auto items-start">
          
          {/* Left: Status timeline & Items breakdown (7 cols) */}
          <div className="lg:col-span-7 space-y-8 text-left animate-fade-in">
            {['delivered', 'picked_up', 'completed'].includes(order.status) && (
              <OrderReviewForm
                orderId={id!}
                orderToken={token!}
                locale={locale}
                existingReview={review}
              />
            )}
            <PremiumCard hoverable={false} className="border-primary/20 bg-[#050B1E]/60 p-6 sm:p-8 space-y-6">
              
              {/* Header Info */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-primary/10">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">
                    {locale === 'pl' ? 'Status zamówienia' : 'Order Status'}
                  </span>
                  <StatusPill status={getOrderStatusPillType(order.status)} label={statusLabel} />
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">
                    {locale === 'pl' ? 'Typ zamówienia' : 'Order Type'}
                  </span>
                  <span className="text-sm font-semibold text-foreground uppercase tracking-wider">
                    {t(order.order_type)}
                  </span>
                </div>
              </div>

              {/* Status Explanation Alert */}
              <div className={`p-4 rounded border text-xs sm:text-sm leading-relaxed ${
                order.status === 'approved' || order.status === 'confirmed' || order.status === 'completed'
                  ? 'bg-green-500/5 border-green-500/20 text-green-400/95' 
                  : order.status === 'rejected' 
                  ? 'bg-red-500/5 border-red-500/20 text-red-400/95' 
                  : order.status === 'cancelled' 
                  ? 'bg-orange-500/5 border-orange-500/20 text-orange-400/95' 
                  : 'bg-primary/5 border-primary/25 text-primary/95'
              }`}>
              {statusDesc}
              </div>

              {/* ETA Display — only when estimated_time exists and order is active */}
              {order.estimated_time && ['approved', 'preparing', 'ready_for_pickup', 'out_for_delivery'].includes(order.status) && (() => {
                const etaDate = new Date(order.estimated_time);
                const now = new Date();
                const diffMs = etaDate.getTime() - now.getTime();
                const minsLeft = Math.max(1, Math.round(diffMs / 60000));
                const etaTimeStr = etaDate.toLocaleTimeString(locale === 'pl' ? 'pl-PL' : 'en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false,
                  timeZone: 'Europe/Warsaw',
                });
                const isOverdue = diffMs <= 0;
                const typeLabel = order.order_type === 'delivery'
                  ? (locale === 'pl' ? 'dostawy' : 'delivery')
                  : (locale === 'pl' ? 'odbioru' : 'pickup');

                return (
                  <div className={`p-4 rounded border flex items-center gap-3.5 ${
                    isOverdue
                      ? 'bg-red-500/5 border-red-500/20'
                      : 'bg-amber-500/5 border-amber-500/20'
                  }`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      isOverdue
                        ? 'bg-red-500/10 border border-red-500/20 text-red-400'
                        : 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                    }`}>
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[9px] uppercase tracking-wider text-muted-foreground/60 block">
                        {locale === 'pl' ? `Szacowany czas ${typeLabel}` : `Estimated ${typeLabel} time`}
                      </span>
                      <span className="text-sm font-bold text-foreground font-mono">
                        {locale === 'pl' ? `około ${etaTimeStr}` : `around ${etaTimeStr}`}
                      </span>
                      <span className={`text-[10px] block mt-0.5 ${
                        isOverdue ? 'text-red-400' : 'text-muted-foreground/60'
                      }`}>
                        {isOverdue
                          ? (locale === 'pl' ? 'Czas szacowany upłynął — zamówienie może być opóźnione.' : 'Estimated time has passed — order may be delayed.')
                          : (locale === 'pl' ? `za ok. ${minsLeft} minut` : `approximately ${minsLeft} minutes`)}
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Ready for Pickup message (takeaway only) */}
              {order.status === 'ready_for_pickup' && (
                <div className="p-4 rounded border border-green-500/20 bg-green-500/5 text-sm text-green-400/95 font-semibold flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center flex-shrink-0">
                    <ShoppingBag className="w-5 h-5 text-green-400" />
                  </div>
                  {locale === 'pl'
                    ? 'Twoje zamówienie jest gotowe do odbioru w restauracji.'
                    : 'Your order is ready for pickup at the restaurant.'}
                </div>
              )}

              {/* Out for Delivery message (delivery only) */}
              {order.status === 'out_for_delivery' && (
                <div className="p-4 rounded border border-blue-500/20 bg-blue-500/5 text-sm text-blue-400/95 font-semibold flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5 text-blue-400" />
                  </div>
                  {locale === 'pl'
                    ? 'Twoje zamówienie jest w drodze! Kurier jedzie do Ciebie.'
                    : 'Your order is on its way! Our courier is en route.'}
                </div>
              )}

              {/* Rejection / Cancellation Reason (If available) */}
              {order.status === 'rejected' && order.rejection_reason && (
                <div className="p-4 rounded border border-red-500/25 bg-red-500/5 text-xs text-red-300/90 space-y-1">
                  <span className="font-bold uppercase tracking-wider text-[9px] block text-red-400">
                    {locale === 'pl' ? 'Powód odrzucenia:' : 'Reason for rejection:'}
                  </span>
                  <p className="italic font-light">&quot;{order.rejection_reason}&quot;</p>
                </div>
              )}
              {order.status === 'cancelled' && order.cancellation_reason && (
                <div className="p-4 rounded border border-orange-500/25 bg-orange-500/5 text-xs text-orange-300/90 space-y-1">
                  <span className="font-bold uppercase tracking-wider text-[9px] block text-orange-400">
                    {locale === 'pl' ? 'Powód anulowania:' : 'Reason for cancellation:'}
                  </span>
                  <p className="italic font-light">&quot;{order.cancellation_reason}&quot;</p>
                </div>
              )}

              {/* Order Date Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-4 bg-[#070B1E] border border-primary/10 rounded-lg flex gap-3.5 items-center">
                  <div className="w-10 h-10 rounded-full bg-primary/5 border border-primary/20 flex items-center justify-center text-primary">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[9px] uppercase tracking-wider text-muted-foreground/60 block">
                      {locale === 'pl' ? 'Data złożenia' : 'Date Submitted'}
                    </span>
                    <span className="text-xs font-medium text-foreground leading-tight block pt-0.5">
                      {formattedDate}
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-[#070B1E] border border-primary/10 rounded-lg flex gap-3.5 items-center">
                  <div className="w-10 h-10 rounded-full bg-primary/5 border border-primary/20 flex items-center justify-center text-primary">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[9px] uppercase tracking-wider text-muted-foreground/60 block">
                      {locale === 'pl' ? 'Godzina złożenia' : 'Time Submitted'}
                    </span>
                    <span className="text-xs font-semibold text-foreground leading-tight block pt-0.5">
                      {formattedTime}
                    </span>
                  </div>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-4 pt-4 border-t border-primary/10">
                <h3 className="text-sm font-bold uppercase tracking-wider text-primary">
                  {locale === 'pl' ? 'Zamówione Pozycje' : 'Ordered Items'}
                </h3>
                <div className="space-y-3">
                  {order.items && order.items.map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-start gap-4 p-3 bg-[#070B1E] border border-primary/5 rounded text-xs">
                      <div className="space-y-1">
                        <span className="font-semibold text-foreground font-sans">
                          {locale === 'pl' ? item.name_pl : item.name_en}
                        </span>
                        <span className="text-muted-foreground/60 block text-[10px]">
                          {item.quantity} x {Number(item.unit_price).toFixed(2)} PLN
                        </span>
                        {item.customer_notes && (
                          <span className="text-[10px] text-primary/75 italic leading-tight block pt-0.5">
                            * {item.customer_notes}
                          </span>
                        )}
                      </div>
                      <span className="font-bold text-foreground font-mono">
                        {Number(item.line_total).toFixed(2)} PLN
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Delivery info / Address masking */}
              {order.order_type === 'delivery' && (
                <div className="space-y-3 pt-4 border-t border-primary/10 text-xs">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-primary" />
                    {t('addressHeader')}
                  </h3>
                  <div className="p-3 bg-[#070B1E] border border-primary/10 rounded text-muted-foreground/95 leading-normal space-y-1">
                    <p className="font-medium text-foreground">
                      {order.delivery_address_public}
                    </p>
                    <p className="text-[10px] text-muted-foreground/60 italic leading-snug">
                      {locale === 'pl' 
                        ? 'Dokładny numer posesji i dane kontaktowe są widoczne wyłącznie dla kuriera.' 
                        : 'Exact street numbers and contact info are visible to the courier only.'}
                    </p>
                  </div>
                </div>
              )}

              {/* Payment Details */}
              <div className="space-y-3 pt-4 border-t border-primary/10 text-xs">
                <h3 className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-primary" />
                  {t('paymentHeader')}
                </h3>
                <div className="p-3 bg-[#070B1E] border border-primary/10 rounded flex justify-between items-center text-foreground font-semibold">
                  <span>{t(order.payment_method)}</span>
                  <span className="text-xs uppercase tracking-wider text-muted-foreground font-light">
                    {locale === 'pl' ? 'Płatność przy odbiorze' : 'Pay offline'}
                  </span>
                </div>
              </div>

            </PremiumCard>
          </div>

          {/* Right: Timeline & Pricing breakdown (5 cols) */}
          <div className="lg:col-span-5 space-y-6 text-left">
            {/* Status Timeline */}
            <PremiumCard hoverable={false} className="border-primary/20 bg-[#050B1E]/45 p-6 space-y-6">
              <h3 className="text-lg font-serif font-bold text-primary tracking-wide border-b border-primary/20 pb-2">
                {locale === 'pl' ? 'Oś czasu statusu' : 'Status Timeline'}
              </h3>

              <div className="relative pl-6 space-y-6 border-l border-primary/15 py-1">
                {order.timeline && order.timeline.map((event: any, idx: number) => {
                  const eventTime = new Date(event.created_at).toLocaleString(locale === 'pl' ? 'pl-PL' : 'en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  const eventMappedStatus = event.status === 'approved' ? 'confirmed' : event.status;
                  const isLast = idx === order.timeline.length - 1;
                  const dotColor = isLast
                    ? (order.status === 'approved' || order.status === 'confirmed' || order.status === 'completed' || order.status === 'delivered' ? 'bg-green-500 ring-4 ring-green-500/20 border-green-400' :
                       order.status === 'rejected' ? 'bg-red-500 ring-4 ring-red-500/20 border-red-400' :
                       order.status === 'cancelled' ? 'bg-orange-500 ring-4 ring-orange-500/20 border-orange-400' :
                       'bg-amber-500 ring-4 ring-amber-500/20 border-amber-400')
                    : 'bg-primary/45 border-primary/30';

                  return (
                    <div key={idx} className="relative space-y-1">
                      {/* Timeline Dot */}
                      <span className={`absolute -left-[31px] top-1.5 w-2.5 h-2.5 rounded-full border ${dotColor}`} />
                      
                      <div className="flex justify-between items-center gap-2">
                        <span className={`text-[11px] font-sans font-semibold tracking-wide ${isLast ? 'text-foreground font-bold' : 'text-muted-foreground/75'}`}>
                          {t(`status.${eventMappedStatus}` as any)}
                        </span>
                        <span className="text-[9px] font-mono text-muted-foreground/50">
                          {eventTime}
                        </span>
                      </div>
                      
                      <p className="text-[10px] text-muted-foreground/60 leading-relaxed font-light font-sans">
                        {eventMappedStatus === 'pending' && (locale === 'pl' ? 'Zamówienie zostało złożone i oczekuje na weryfikację.' : 'Order request successfully submitted.')}
                        {eventMappedStatus === 'confirmed' && (locale === 'pl' ? 'Zamówienie zostało potwierdzone przez obsługę.' : 'Order accepted and confirmed by the restaurant.')}
                        {eventMappedStatus === 'preparing' && (locale === 'pl' ? 'Kucharze rozpoczęli przygotowywanie dań.' : 'Dishes are being prepared in the kitchen.')}
                        {eventMappedStatus === 'out_for_delivery' && (locale === 'pl' ? 'Zamówienie przekazano kurierowi i jest w drodze.' : 'Order picked up by courier and is en route.')}
                        {eventMappedStatus === 'delivered' && (locale === 'pl' ? 'Zamówienie zostało dostarczone.' : 'Courier has delivered the order.')}
                        {eventMappedStatus === 'ready_for_pickup' && (locale === 'pl' ? 'Zamówienie czeka na odbiór w restauracji.' : 'Dishes are packed and ready for customer pickup.')}
                        {eventMappedStatus === 'picked_up' && (locale === 'pl' ? 'Zamówienie zostało odebrane przez klienta.' : 'Order successfully picked up by the customer.')}
                        {eventMappedStatus === 'completed' && (locale === 'pl' ? 'Zamówienie zakończone pomyślnie.' : 'Order request lifecycle completed.')}
                        {eventMappedStatus === 'rejected' && (locale === 'pl' ? 'Zamówienie zostało odrzucone przez restaurację.' : 'Order declined by the restaurant manager.')}
                        {eventMappedStatus === 'cancelled' && (locale === 'pl' ? 'Zamówienie zostało anulowane.' : 'Order request cancelled.')}
                      </p>
                    </div>
                  );
                })}
              </div>
            </PremiumCard>

            {/* Pricing Details */}
            <PremiumCard hoverable={false} className="border-primary/20 bg-[#050B1E] p-6 space-y-6">
              <h3 className="text-lg font-serif font-bold text-primary tracking-wide border-b border-primary/20 pb-2">
                {locale === 'pl' ? 'Rozliczenie Zamówienia' : 'Order Calculation'}
              </h3>

              <div className="pt-2 space-y-3 text-xs">
                {/* Items subtotal */}
                <div className="flex justify-between text-muted-foreground">
                  <span>{t('subtotal')}</span>
                  <span className="font-mono">{Number(order.items_subtotal).toFixed(2)} PLN</span>
                </div>

                {/* Packaging fee */}
                {Number(order.packaging_total) > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>{t('packagingFee')}</span>
                    <span className="font-mono">{Number(order.packaging_total).toFixed(2)} PLN</span>
                  </div>
                )}

                {/* Delivery Fee Notice (Only for delivery type) */}
                {order.order_type === 'delivery' && (
                  <div className="flex flex-col space-y-1 pt-1 border-t border-primary/5">
                    <div className="flex justify-between items-start gap-1">
                      <span className="text-muted-foreground">{t('deliveryFee')}</span>
                      {isDeliveryUnresolved ? (
                        <span className="text-primary font-bold italic">
                          {t('deliveryFeeTbd')}
                        </span>
                      ) : (
                        <span className="font-mono text-foreground font-semibold">
                          {displayDeliveryFee?.toFixed(2)} PLN
                        </span>
                      )}
                    </div>
                    {isDeliveryUnresolved && (
                      <p className="text-[10px] text-primary/75 italic leading-tight">
                        {t('deliveryFeeNotice')}
                      </p>
                    )}
                  </div>
                )}

                {/* Total */}
                <div className="flex justify-between text-foreground font-bold text-sm pt-3 border-t border-primary/15">
                  <span>
                    {isDeliveryUnresolved ? t('estimatedTotal') : t('finalTotal')}
                  </span>
                  <span className="text-primary font-mono text-base font-bold">
                    {displayTotalAmount.toFixed(2)} PLN
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-primary/10 flex flex-col gap-3">
                <Link href={`/${locale}/order`} className="w-full">
                  <Button className="w-full bg-[#070B1E] border border-primary/20 hover:bg-primary/5 text-muted-foreground hover:text-foreground text-xs uppercase tracking-wider py-2 font-semibold">
                    {locale === 'pl' ? 'Nowe Zamówienie' : 'New Order'}
                  </Button>
                </Link>
                <Link href={`/${locale}`} className="w-full">
                  <Button className="w-full bg-[#070B1E] border border-primary/20 hover:bg-primary/5 text-muted-foreground hover:text-foreground text-xs uppercase tracking-wider py-2 font-semibold">
                    {locale === 'pl' ? 'Strona Główna' : 'Home Page'}
                  </Button>
                </Link>
              </div>
            </PremiumCard>
          </div>

        </div>
      </SectionContainer>
    </PageTransition>
  );
}
