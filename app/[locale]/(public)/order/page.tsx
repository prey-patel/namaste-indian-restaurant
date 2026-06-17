import React from 'react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import PageTransition from '@/components/ui/page-transition';
import SectionContainer from '@/components/ui/section-container';
import { getPublicMenuData } from '@/lib/supabase/menu';
import { createAdminClient } from '@/lib/supabase/admin';
import OrderingWorkflowClient from '@/components/public/order/ordering-workflow-client';
import { getPublicSystemSettings } from '@/lib/supabase/settings';
import { getPublicOpeningHours } from '@/lib/public/opening-hours';

type Props = {
  params: Promise<{ locale: string }>;
};

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'seo' });
  return {
    title: t('orderTitle'),
    description: t('orderDesc'),
    openGraph: {
      title: t('orderTitle'),
      description: t('orderDesc'),
      locale: locale === 'pl' ? 'pl_PL' : 'en_US',
      type: 'website',
    },
  };
}

export default async function PublicOrderPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('order');

  // Load public menu categories and available items
  const { categories, items } = await getPublicMenuData();
  const availableItems = items.filter(item => item.is_available);

  // Load operational status, settings, opening hours, and packaging rules concurrently
  const adminClient = createAdminClient();
  const [opStatusRes, settings, openingHoursData, packagingRulesRes, menuItemPackagingRulesRes] = await Promise.all([
    adminClient.from('operational_status').select('delivery_enabled, takeaway_enabled').single(),
    getPublicSystemSettings(),
    getPublicOpeningHours(locale),
    adminClient.from('packaging_fee_rules').select('*').eq('is_active', true),
    adminClient.from('menu_item_packaging_rules').select('*').eq('is_required', true)
  ]);
  const opStatus = opStatusRes.data;

  const isPl = locale === 'pl';
  const address = settings.restaurant_full_address || settings.restaurant_address || 'Warszawska 1/3, 06-400 Ciechanów, Poland';
  const phone = settings.restaurant_phone ?? '511 984 331';

  return (
    <PageTransition>
      {/* Header Banner */}
      <section className="relative overflow-hidden bg-[#070B1E] py-12 text-center border-b border-primary/15">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[250px] h-[250px] bg-primary/5 rounded-full blur-[80px] pointer-events-none" />
        <div className="max-w-3xl mx-auto px-4 relative z-10 space-y-3">
          <h1 className="text-3xl sm:text-4xl font-serif font-black tracking-wide text-foreground">
            {t('title')}
          </h1>
          <p className="text-xs text-muted-foreground/80 font-light leading-relaxed max-w-md mx-auto">
            {t('subtitle')}
          </p>
        </div>
      </section>

      <SectionContainer>
        <OrderingWorkflowClient
          categories={categories}
          items={availableItems}
          operationalStatus={{
            delivery_enabled: opStatus?.delivery_enabled ?? true,
            takeaway_enabled: opStatus?.takeaway_enabled ?? true,
          }}
          locale={locale as 'pl' | 'en'}
          restaurantInfo={{ address, phone }}
          deliveryHours={openingHoursData.delivery}
          deliveryMinimumOrderValue={settings.delivery_minimum_order_value}
          packagingRules={packagingRulesRes.data || []}
          menuItemPackagingRules={menuItemPackagingRulesRes.data || []}
        />
      </SectionContainer>
    </PageTransition>
  );
}
