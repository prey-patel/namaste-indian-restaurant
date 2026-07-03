import React from 'react';
import Image from 'next/image';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import PageTransition from '@/components/ui/page-transition';
import MandalaWatermark from '@/components/ui/mandala-watermark';
import StatusLookupClient from './status-lookup-client';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'nav' });
  return {
    title: `${t('status')} | Namaste Indian Restaurant`,
    description: 'Track the real-time status of your takeaway, delivery orders or table reservations.',
  };
}

export default async function MyStatusPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('nav');

  return (
    <PageTransition>
      <section className="relative overflow-hidden bg-[#070B1E] py-20 text-center border-b border-primary/15 min-h-[85vh] flex flex-col justify-center animate-fade-in">
        {/* Decorative Watermarks */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-primary/5 rounded-full blur-[90px] pointer-events-none" />
        <MandalaWatermark className="w-[300px] h-[300px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.02]" />

        <div className="container mx-auto px-4 relative z-10 space-y-8 max-w-2xl">
          {/* Header */}
          <div className="space-y-3 flex flex-col items-center">
            <Image
              src="/images/logo.png"
              alt="Namaste Logo"
              width={140}
              height={64}
              className="h-16 w-auto object-contain mb-2"
              priority
            />
            <div className="flex justify-center items-center space-x-2 text-primary">
              <div className="h-[1px] w-6 bg-primary/30" />
              <span className="text-[10px] tracking-[0.25em] font-extrabold uppercase">
                {locale === 'pl' ? 'Śledzenie Zamówienia' : 'Track Order'}
              </span>
              <div className="h-[1px] w-6 bg-primary/30" />
            </div>
            
            <h1 className="text-3xl sm:text-5xl font-serif font-black tracking-wide text-foreground uppercase">
              {t('status')}
            </h1>
            
            <p className="text-xs sm:text-sm text-muted-foreground/80 font-light leading-relaxed max-w-md mx-auto">
              {locale === 'pl'
                ? 'Wprowadź swój kod referencyjny, aby natychmiast sprawdzić i śledzić w czasie rzeczywistym status swojego zamówienia lub rezerwacji stolika.'
                : 'Enter your reference code below to check and track the real-time status of your order or table reservation.'}
            </p>
          </div>

          {/* Interactive Search Lookup Component */}
          <StatusLookupClient locale={locale as 'pl' | 'en'} />
        </div>
      </section>
    </PageTransition>
  );
}
