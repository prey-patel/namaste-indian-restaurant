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
import { Calendar, Users, Clock, AlertTriangle } from 'lucide-react';
import ReservationStatusRealtimeListener from '@/components/public/reservations/reservation-status-realtime-listener';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Reservation Tracking | Namaste Indian Restaurant',
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

function getStatusPillType(status: string): 'pending' | 'success' | 'warning' | 'error' | 'info' | 'neutral' {
  switch (status) {
    case 'pending': return 'pending';
    case 'confirmed': return 'success';
    case 'rejected': return 'error';
    case 'cancelled': return 'warning';
    case 'completed': return 'info';
    case 'no_show': return 'neutral';
    default: return 'neutral';
  }
}

export default async function ReservationStatusPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const { id, token } = await searchParams;
  const t = await getTranslations('reservations');

  // Validate parameters are valid UUIDs
  const isValid = id && token && uuidRegex.test(id) && uuidRegex.test(token);

  let isLimited = false;
  let retryAfter = 0;

  if (isValid) {
    const headersList = await headers();
    const ip = headersList.get('x-forwarded-for')?.split(',')[0] || headersList.get('x-real-ip') || '127.0.0.1';
    const secret = process.env.RESERVATION_IP_HASH_SECRET;
    if (secret) {
      const ipHash = crypto.createHmac('sha256', secret).update(ip).digest('hex');
      try {
        const rateCheck = await isRateLimited(ipHash, 'reservation_status_lookup', 30, 60); // 30 requests per minute
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
      console.error('ERROR: RESERVATION_IP_HASH_SECRET is missing in environment!');
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

  let reservation: any = null;

  if (isValid) {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient.rpc('get_public_reservation_status_by_token', {
      res_id: id,
      sec_token: token,
    });

    if (!error && data && data.length > 0) {
      reservation = data[0];
    }
  }

  // Not Found State
  if (!reservation) {
    return (
      <PageTransition>
        <section className="relative overflow-hidden bg-[#070B1E] py-20 text-center border-b border-primary/15 min-h-[50vh] flex flex-col justify-center animate-fade-in">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-primary/5 rounded-full blur-[80px] pointer-events-none" />
          <MandalaWatermark className="w-[300px] h-[300px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03]" />
          
          <div className="max-w-md mx-auto px-4 relative z-10 space-y-6">
            <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
            <h1 className="text-2xl font-serif font-bold text-foreground">
              {locale === 'pl' ? 'Rezerwacja nie została znaleziona' : 'Reservation Not Found'}
            </h1>
            <p className="text-sm text-muted-foreground/80 font-light leading-relaxed">
              {locale === 'pl'
                ? 'Podany numer referencyjny rezerwacji jest nieprawidłowy, wygasł lub rezerwacja nie istnieje.'
                : 'The provided reservation reference is invalid, expired, or does not exist.'}
            </p>
            <div className="pt-2">
              <Link href={`/${locale}/reservations`}>
                <Button className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs uppercase tracking-wider px-6 py-2.5">
                  {locale === 'pl' ? 'Wróć do rezerwacji' : 'Back to reservations'}
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </PageTransition>
    );
  }

  // Status localization & helpers
  const statusLabel = t(`status.${reservation.status}` as any);
  const statusDesc = t(`statusDesc.${reservation.status}` as any);
  const startDateTime = new Date(reservation.reservation_start_at);

  const formattedDate = startDateTime.toLocaleDateString(locale === 'pl' ? 'pl-PL' : 'en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const formattedTime = startDateTime.toLocaleTimeString(locale === 'pl' ? 'pl-PL' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  return (
    <PageTransition>
      <ReservationStatusRealtimeListener reservationId={id!} />
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
            {locale === 'pl' ? 'Twoja Rezerwacja' : 'Your Reservation'}
          </h1>
          <p className="text-xs text-muted-foreground/60 font-mono select-all">
            ID: {id}
          </p>
        </div>
      </section>

      <SectionContainer>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 max-w-5xl mx-auto items-start">
          
          {/* Main Status & Details Card (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <PremiumCard hoverable={false} className="border-primary/20 bg-[#050B1E]/60 p-6 sm:p-8 space-y-6">
              
              {/* Header: Status Pill */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-primary/10">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">
                    {locale === 'pl' ? 'Bieżący status' : 'Current status'}
                  </span>
                  <StatusPill status={getStatusPillType(reservation.status)} label={statusLabel} />
                </div>
                <div className="text-left sm:text-right">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">
                    {t('guestsLabel')}
                  </span>
                  <div className="flex items-center gap-1.5 text-foreground font-semibold text-sm">
                    <Users className="w-4 h-4 text-primary" />
                    {reservation.guests_count} {reservation.guests_count === 1 ? (locale === 'pl' ? 'osoba' : 'guest') : (locale === 'pl' ? 'osoby' : 'guests')}
                  </div>
                </div>
              </div>

              {/* Status Explanation Alert */}
              <div className={`p-4 rounded border text-xs sm:text-sm leading-relaxed ${
                reservation.status === 'confirmed' ? 'bg-green-500/5 border-green-500/20 text-green-400/95' :
                reservation.status === 'rejected' ? 'bg-red-500/5 border-red-500/20 text-red-400/95' :
                reservation.status === 'cancelled' ? 'bg-orange-500/5 border-orange-500/20 text-orange-400/95' :
                'bg-primary/5 border-primary/25 text-primary/95'
              }`}>
                {statusDesc}
              </div>

              {/* Rejection / Cancellation Reason (If available) */}
              {reservation.status === 'rejected' && reservation.rejection_reason && (
                <div className="p-4 rounded border border-red-500/25 bg-red-500/5 text-xs text-red-300/90 space-y-1">
                  <span className="font-bold uppercase tracking-wider text-[9px] block text-red-400">
                    {locale === 'pl' ? 'Powód odrzucenia:' : 'Reason for rejection:'}
                  </span>
                  <p className="italic font-light">&quot;{reservation.rejection_reason}&quot;</p>
                </div>
              )}
              {reservation.status === 'cancelled' && reservation.cancellation_reason && (
                <div className="p-4 rounded border border-orange-500/25 bg-orange-500/5 text-xs text-orange-300/90 space-y-1">
                  <span className="font-bold uppercase tracking-wider text-[9px] block text-orange-400">
                    {locale === 'pl' ? 'Powód anulowania:' : 'Reason for cancellation:'}
                  </span>
                  <p className="italic font-light">&quot;{reservation.cancellation_reason}&quot;</p>
                </div>
              )}

              {/* Date & Time Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-4 bg-[#070B1E] border border-primary/10 rounded-lg flex gap-3.5 items-center">
                  <div className="w-10 h-10 rounded-full bg-primary/5 border border-primary/20 flex items-center justify-center text-primary">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[9px] uppercase tracking-wider text-muted-foreground/60 block">
                      {t('dateLabel')}
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
                      {t('timeLabel')}
                    </span>
                    <span className="text-xs font-semibold text-foreground leading-tight block pt-0.5">
                      {formattedTime}
                    </span>
                  </div>
                </div>
              </div>

              {/* Customer Notes */}
              {reservation.customer_notes && (
                <div className="space-y-1.5 pt-2 border-t border-primary/10 text-xs">
                  <span className="uppercase tracking-wider text-muted-foreground/60 font-semibold block text-[10px]">
                    {locale === 'pl' ? 'Twoje uwagi:' : 'Your requests:'}
                  </span>
                  <p className="p-3 bg-[#070B1E] border border-primary/10 rounded text-muted-foreground/80 font-light italic leading-relaxed">
                    {reservation.customer_notes}
                  </p>
                </div>
              )}

              {/* Footer contact */}
              <div className="pt-4 border-t border-primary/10 text-[10px] text-center text-muted-foreground/50">
                {t('contactNote')}
              </div>

            </PremiumCard>
          </div>

          {/* Timeline & Actions Card (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <PremiumCard hoverable={false} className="border-primary/20 bg-[#050B1E]/45 p-6 space-y-6">
              <h3 className="text-lg font-serif font-bold text-primary tracking-wide border-b border-primary/20 pb-2">
                {locale === 'pl' ? 'Oś czasu statusu' : 'Status Timeline'}
              </h3>

              {/* Step Timeline */}
              <div className="relative pl-6 space-y-6 border-l border-primary/15 py-1">
                {reservation.timeline && reservation.timeline.map((event: any, idx: number) => {
                  const eventTime = new Date(event.created_at).toLocaleString(locale === 'pl' ? 'pl-PL' : 'en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  const isLast = idx === reservation.timeline.length - 1;
                  const dotColor = isLast
                    ? (reservation.status === 'confirmed' || reservation.status === 'completed' ? 'bg-green-500 ring-4 ring-green-500/20 border-green-400' :
                       reservation.status === 'rejected' || reservation.status === 'no_show' ? 'bg-red-500 ring-4 ring-red-500/20 border-red-400' :
                       reservation.status === 'cancelled' ? 'bg-orange-500 ring-4 ring-orange-500/20 border-orange-400' :
                       'bg-amber-500 ring-4 ring-amber-500/20 border-amber-400')
                    : 'bg-primary/45 border-primary/30';

                  return (
                    <div key={idx} className="relative space-y-1">
                      {/* Timeline Dot */}
                      <span className={`absolute -left-[31px] top-1.5 w-2.5 h-2.5 rounded-full border ${dotColor}`} />
                      
                      <div className="flex justify-between items-center gap-2">
                        <span className={`text-[11px] font-sans font-semibold tracking-wide ${isLast ? 'text-foreground font-bold' : 'text-muted-foreground/75'}`}>
                          {t(`status.${event.status}` as any)}
                        </span>
                        <span className="text-[9px] font-mono text-muted-foreground/50">
                          {eventTime}
                        </span>
                      </div>
                      
                      <p className="text-[10px] text-muted-foreground/60 leading-relaxed font-light font-sans">
                        {event.status === 'pending' && (locale === 'pl' ? 'Wysłano prośbę o rezerwację stolika.' : 'Reservation request successfully submitted.')}
                        {event.status === 'confirmed' && (locale === 'pl' ? 'Stolik został pomyślnie przypisany i potwierdzony.' : 'Table assigned and booking confirmed by staff.')}
                        {event.status === 'rejected' && (locale === 'pl' ? 'Rezerwacja odrzucona przez obsługę restauracji.' : 'Reservation declined by the restaurant manager.')}
                        {event.status === 'cancelled' && (locale === 'pl' ? 'Rezerwacja anulowana.' : 'Reservation cancelled.')}
                        {event.status === 'completed' && (locale === 'pl' ? 'Wizyta zakończona pomyślnie.' : 'Visit completed successfully.')}
                        {event.status === 'no_show' && (locale === 'pl' ? 'Odnotowano brak obecności gości.' : 'Marked as guest no-show.')}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Action: Back to Home or Reservations */}
              <div className="pt-4 border-t border-primary/10 flex flex-col gap-3">
                <Link href={`/${locale}/reservations`} className="w-full">
                  <Button className="w-full bg-[#070B1E] border border-primary/20 hover:bg-primary/5 text-muted-foreground hover:text-foreground text-xs uppercase tracking-wider py-2 font-semibold">
                    {locale === 'pl' ? 'Nowa Rezerwacja' : 'New Reservation'}
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
