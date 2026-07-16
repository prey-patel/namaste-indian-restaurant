import React from 'react';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import PageTransition from '@/components/ui/page-transition';
import SectionContainer from '@/components/ui/section-container';
import { getPublicMenuData } from '@/lib/supabase/menu';
import { createAdminClient } from '@/lib/supabase/admin';
import DineInOrderClient from '@/components/public/table/dine-in-order-client';

type Props = {
  params: Promise<{ locale: string; token: string }>;
};

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'seo' });
  return {
    title: `${t('orderTitle')} - Table Ordering`,
    description: t('orderDesc'),
    robots: {
      index: false,
      follow: false,
    }
  };
}

export default async function TableOrderingPage({ params }: Props) {
  const { locale, token } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('order');
  const adminClient = createAdminClient();

  // 1. Fetch table details by QR token
  const { data: table, error: tableError } = await adminClient
    .from('dining_tables')
    .select('id, table_number, section, is_active, qr_token')
    .eq('qr_token', token)
    .maybeSingle();

  if (tableError || !table) {
    return notFound();
  }

  // 2. Fetch dine-in operational status
  const { data: opStatus } = await adminClient
    .from('operational_status')
    .select('dine_in_ordering_enabled')
    .single();

  // 3. Check service hours
  const nowInWarsaw = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Warsaw' }));
  const dayOfWeek = nowInWarsaw.getDay();
  const currentHour = String(nowInWarsaw.getHours()).padStart(2, '0');
  const currentMinute = String(nowInWarsaw.getMinutes()).padStart(2, '0');
  const currentTimeStr = `${currentHour}:${currentMinute}:00`;

  const { data: serviceHour } = await adminClient
    .from('service_hours')
    .select('open_time, close_time, is_closed')
    .eq('service_type', 'dine_in')
    .eq('day_of_week', dayOfWeek)
    .maybeSingle();

  const isClosedToday = serviceHour?.is_closed ?? false;
  const isOutsideHours = serviceHour 
    ? (currentTimeStr < serviceHour.open_time || currentTimeStr > serviceHour.close_time) 
    : false;

  const serviceHoursDisplay = serviceHour 
    ? `${serviceHour.open_time.substring(0, 5)} - ${serviceHour.close_time.substring(0, 5)}`
    : null;

  // 4. Fetch menu data
  const { categories, items } = await getPublicMenuData();
  const availableItems = items.filter(item => item.is_available);

  // 5. Fetch active session and existing orders
  const { data: activeSession } = await adminClient
    .from('table_sessions')
    .select('id, customer_name, status')
    .eq('table_id', table.id)
    .eq('status', 'active')
    .maybeSingle();

  let existingOrders: any[] = [];
  if (activeSession) {
    const { data: orders } = await adminClient
      .from('orders')
      .select(`
        id,
        status,
        created_at,
        total_amount,
        payment_status,
        payment_method,
        order_items (
          id,
          item_name_pl,
          item_name_en,
          quantity,
          unit_price
        )
      `)
      .eq('table_session_id', activeSession.id)
      .order('created_at', { ascending: false });

    existingOrders = orders || [];
  }

  return (
    <PageTransition>
      <section className="relative overflow-hidden bg-gradient-to-b from-[#090D24] to-[#05091C] py-10 text-center border-b border-primary/15">
        {/* Ambient glow backgrounds */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute -top-12 -left-12 w-48 h-48 bg-amber-500/5 rounded-full blur-[60px] pointer-events-none" />
        
        <div className="max-w-3xl mx-auto px-4 relative z-10 space-y-4">
          {/* Table Badge and Section Indicator */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="inline-flex items-center px-3.5 py-1 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400 text-[10px] font-black uppercase tracking-widest shadow-[0_0_12px_rgba(245,158,11,0.15)]">
              {locale === 'pl' ? `Stolik ${table.table_number}` : `Table ${table.table_number}`}
            </span>
            {table.section && (
              <span className="inline-flex items-center px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-muted-foreground text-[9px] font-semibold uppercase tracking-wider">
                {locale === 'pl' ? `Sala: ${table.section}` : `Section: ${table.section}`}
              </span>
            )}
          </div>

          {/* Title */}
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-black tracking-wide bg-gradient-to-r from-foreground via-amber-100 to-foreground bg-clip-text text-transparent uppercase">
              {t('dine_in')}
            </h1>
            <div className="w-12 h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent mx-auto mt-2" />
          </div>

          <p className="text-[11px] text-muted-foreground/60 font-light leading-relaxed max-w-sm mx-auto">
            {locale === 'pl' 
              ? 'Wybierz ulubione dania z naszego menu i złóż zamówienie bezpośrednio do swojego stolika.' 
              : 'Browse our menu, add your favorites, and place your order directly to your table.'}
          </p>
        </div>
      </section>

      <SectionContainer className="py-6">
        <DineInOrderClient
          table={{
            id: table.id,
            table_number: table.table_number,
            qr_token: table.qr_token || ''
          }}
          categories={categories}
          items={availableItems}
          dineInOrderingEnabled={opStatus?.dine_in_ordering_enabled ?? true}
          isClosedToday={isClosedToday}
          isOutsideHours={isOutsideHours}
          serviceHoursDisplay={serviceHoursDisplay}
          locale={locale as 'pl' | 'en'}
          initialSession={activeSession ? {
            id: activeSession.id,
            customerName: activeSession.customer_name || '',
            existingOrders
          } : null}
        />
      </SectionContainer>
    </PageTransition>
  );
}
