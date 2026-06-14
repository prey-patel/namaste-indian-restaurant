import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { ROUTES } from '@/lib/routes/path';
import PageTransition from '@/components/ui/page-transition';
import MandalaWatermark from '@/components/ui/mandala-watermark';
import SectionContainer from '@/components/ui/section-container';
import PremiumCard from '@/components/ui/premium-card';
import PremiumButton from '@/components/ui/premium-button';
import GoldFrame from '@/components/ui/gold-frame';
import { getPublicSystemSettings } from '@/lib/supabase/settings';
import { getSiteContent } from '@/lib/supabase/content';
import WhyChooseNamaste from '@/components/public/why-choose-namaste';
import HeroSection from '@/components/public/hero-section';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'seo' });
  return {
    title: t('homeTitle'),
    description: t('homeDesc'),
    openGraph: {
      title: t('homeTitle'),
      description: t('homeDesc'),
      locale: locale === 'pl' ? 'pl_PL' : 'en_US',
      type: 'website',
    },
  };
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('home');
  const tNav = await getTranslations('nav');

  // Load public settings and CMS content server-side
  const settings = await getPublicSystemSettings();
  const cmsHero = await getSiteContent('home_hero');

  // Dynamic content loading with fallback to translation dictionaries
  const heroTitle = (cmsHero as any)?.[`value_${locale}`]?.title || t('heroTitle');
  const heroTitleAccent = (cmsHero as any)?.[`value_${locale}`]?.titleAccent || t('heroTitleAccent');
  const heroSubhead = (cmsHero as any)?.[`value_${locale}`]?.subhead || t('heroSubhead');
  
  const welcomeMessage = settings.public_messages?.welcome_message || t('infoOpening');
  const alertBanner = settings.public_messages?.alert_banner;
  
  const address = settings.restaurant_address || 'Warszawska 1/3, 06-400 Ciechanów, Poland';
  const phone = settings.restaurant_phone || '511984331';
  const dineInHours = settings.public_service_hours?.dine_in || '12:00 - 22:00';
  const deliveryHours = settings.public_service_hours?.delivery || '12:00 - 21:30';

  // JSON-LD structured data for Restaurant / LocalBusiness (Confirmed information only)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://namaste-ciechanow.pl';
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    'name': 'Namaste Indian Restaurant',
    'image': `${siteUrl}/images/logo.png`,
    '@id': siteUrl,
    'url': siteUrl,
    'telephone': `+48${phone}`,
    'address': {
      '@type': 'PostalAddress',
      'streetAddress': 'Warszawska 1/3',
      'addressLocality': 'Ciechanów',
      'postalCode': '06-400',
      'addressCountry': 'PL'
    },
    'servesCuisine': 'Indian',
    'openingHoursSpecification': [
      {
        '@type': 'OpeningHoursSpecification',
        'dayOfWeek': [
          'Monday',
          'Tuesday',
          'Wednesday',
          'Thursday',
          'Friday',
          'Saturday',
          'Sunday'
        ],
        'opens': '12:00',
        'closes': '22:00'
      }
    ]
  };

  return (
    <PageTransition>
      {/* Inject JSON-LD structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* 1. HERO & INFO STRIP SECTION (Redesigned matching mock-ups) */}
      <HeroSection
        heroTitle={heroTitle}
        heroTitleAccent={heroTitleAccent}
        heroSubhead={heroSubhead}
        welcomeMessage={welcomeMessage}
        alertBanner={alertBanner}
        address={address}
        phone={phone}
        orderOnlineText={t('orderOnline')}
        reserveTableText={t('reserveTable')}
        viewMenuText={t('viewMenu')}
        locale={locale}
      />

      {/* 3. WHY NAMASTE */}
      <WhyChooseNamaste
        whyTitle={t('whyTitle')}
        whySubtitle={t('whySubtitle')}
        whyRecipes={t('whyRecipes')}
        whyRecipesDesc={t('whyRecipesDesc')}
        whyVegetarian={t('whyVegetarian')}
        whyVegetarianDesc={t('whyVegetarianDesc')}
        whyIngredients={t('whyIngredients')}
        whyIngredientsDesc={t('whyIngredientsDesc')}
        whyHospitality={t('whyHospitality')}
        whyHospitalityDesc={t('whyHospitalityDesc')}
        whySpices={t('whySpices')}
        whySpicesDesc={t('whySpicesDesc')}
        madeWith={t('madeWith')}
        tradition={t('tradition')}
        madeFor={t('madeFor')}
        you={t('you')}
      />

      {/* 4. SIGNATURE DISHES */}
      <section className="w-full bg-[#050918] py-16 md:py-24 border-y border-primary/10">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <div className="flex justify-center items-center space-x-2 text-primary">
              <span className="text-[10px] tracking-[0.25em] font-extrabold uppercase">Chef Recommends</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-serif font-bold tracking-wide text-foreground">
              {t('dishesTitle')}
            </h2>
            <p className="text-muted-foreground text-xs sm:text-sm font-light">
              {t('dishesSub')}
            </p>
            <div className="h-[1px] w-24 bg-primary/40 mx-auto" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Dish 1: Butter Chicken */}
            <PremiumCard hoverable className="flex flex-col h-full justify-between">
              <div className="space-y-4">
                <div className="aspect-video w-full rounded-lg bg-[#070B1E] border border-primary/15 relative overflow-hidden flex items-center justify-center text-primary/40">
                  <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 3v1m0 16v1m9-9h-1M4 12H3" />
                  </svg>
                  <span className="absolute bottom-2 right-2 text-[8px] uppercase tracking-widest text-primary/60">Photo preview</span>
                </div>
                <h3 className="text-lg font-serif font-bold text-foreground">{t('dishButter')}</h3>
                <p className="text-muted-foreground text-xs leading-relaxed">{t('dishButterDesc')}</p>
              </div>
              <div className="pt-6 border-t border-primary/10 mt-6 flex justify-between items-center text-xs">
                <span className="text-primary tracking-wider font-bold uppercase">{t('placeholderPrice')}</span>
              </div>
            </PremiumCard>

            {/* Dish 2: Dal Makhani */}
            <PremiumCard hoverable className="flex flex-col h-full justify-between">
              <div className="space-y-4">
                <div className="aspect-video w-full rounded-lg bg-[#070B1E] border border-primary/15 relative overflow-hidden flex items-center justify-center text-primary/40">
                  <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 3v1m0 16v1m9-9h-1M4 12H3" />
                  </svg>
                  <span className="absolute bottom-2 right-2 text-[8px] uppercase tracking-widest text-primary/60">Photo preview</span>
                </div>
                <h3 className="text-lg font-serif font-bold text-foreground">{t('dishDal')}</h3>
                <p className="text-muted-foreground text-xs leading-relaxed">{t('dishDalDesc')}</p>
              </div>
              <div className="pt-6 border-t border-primary/10 mt-6 flex justify-between items-center text-xs">
                <span className="text-primary tracking-wider font-bold uppercase">{t('placeholderPrice')}</span>
              </div>
            </PremiumCard>

            {/* Dish 3: Chicken Biryani */}
            <PremiumCard hoverable className="flex flex-col h-full justify-between">
              <div className="space-y-4">
                <div className="aspect-video w-full rounded-lg bg-[#070B1E] border border-primary/15 relative overflow-hidden flex items-center justify-center text-primary/40">
                  <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 3v1m0 16v1m9-9h-1M4 12H3" />
                  </svg>
                  <span className="absolute bottom-2 right-2 text-[8px] uppercase tracking-widest text-primary/60">Photo preview</span>
                </div>
                <h3 className="text-lg font-serif font-bold text-foreground">{t('dishBiryani')}</h3>
                <p className="text-muted-foreground text-xs leading-relaxed">{t('dishBiryaniDesc')}</p>
              </div>
              <div className="pt-6 border-t border-primary/10 mt-6 flex justify-between items-center text-xs">
                <span className="text-primary tracking-wider font-bold uppercase">{t('placeholderPrice')}</span>
              </div>
            </PremiumCard>

            {/* Dish 4: Garlic Naan */}
            <PremiumCard hoverable className="flex flex-col h-full justify-between">
              <div className="space-y-4">
                <div className="aspect-video w-full rounded-lg bg-[#070B1E] border border-primary/15 relative overflow-hidden flex items-center justify-center text-primary/40">
                  <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 3v1m0 16v1m9-9h-1M4 12H3" />
                  </svg>
                  <span className="absolute bottom-2 right-2 text-[8px] uppercase tracking-widest text-primary/60">Photo preview</span>
                </div>
                <h3 className="text-lg font-serif font-bold text-foreground">{t('dishNaan')}</h3>
                <p className="text-muted-foreground text-xs leading-relaxed">{t('dishNaanDesc')}</p>
              </div>
              <div className="pt-6 border-t border-primary/10 mt-6 flex justify-between items-center text-xs">
                <span className="text-primary tracking-wider font-bold uppercase">{t('placeholderPrice')}</span>
              </div>
            </PremiumCard>
          </div>
        </div>
      </section>

      {/* 5. DINING EXPERIENCE */}
      <SectionContainer className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <div className="space-y-6">
          <div className="flex items-center space-x-2 text-primary">
            <span className="text-[10px] tracking-[0.25em] font-extrabold uppercase">Premium Experience</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-serif font-bold tracking-wide text-foreground">
            {t('ambienceTitle')}
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed font-light font-sans">
            {t('ambienceDesc')}
          </p>
          <div className="pt-4">
            <Link href={ROUTES.reservations}>
              <PremiumButton variant="primary" size="md">
                {t('reserveTable')}
              </PremiumButton>
            </Link>
          </div>
        </div>

        <GoldFrame className="w-full max-w-lg mx-auto">
          <div className="aspect-[4/3] bg-[#070B1E]/40 flex items-center justify-center border border-primary/10 relative text-primary/30">
            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="absolute bottom-3 right-3 text-[9px] uppercase tracking-widest text-primary/50">Ambience Preview Frame</span>
          </div>
        </GoldFrame>
      </SectionContainer>

      {/* 6. CHEF CRAFT */}
      <section className="w-full bg-[#050918] py-16 md:py-24 border-y border-primary/10 relative overflow-hidden">
        <MandalaWatermark className="w-[400px] h-[400px] -left-20 -top-20 opacity-[0.02]" />

        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="order-2 lg:order-1">
            <GoldFrame className="w-full max-w-lg mx-auto">
              <div className="aspect-[4/3] bg-[#070B1E]/40 flex items-center justify-center border border-primary/10 relative text-primary/30">
                <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <span className="absolute bottom-3 right-3 text-[9px] uppercase tracking-widest text-primary/50">Chef Craft Frame</span>
              </div>
            </GoldFrame>
          </div>

          <div className="space-y-6 order-1 lg:order-2">
            <div className="flex items-center space-x-2 text-primary">
              <span className="text-[10px] tracking-[0.25em] font-extrabold uppercase">Traditional Kitchen</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-serif font-bold tracking-wide text-foreground">
              {t('chefTitle')}
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed font-light font-sans">
              {t('chefDesc')}
            </p>
          </div>
        </div>
      </section>

      {/* 7. SERVICES PREVIEW */}
      <SectionContainer>
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="flex justify-center items-center space-x-2 text-primary">
            <span className="text-[10px] tracking-[0.25em] font-extrabold uppercase">Premium Offerings</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-serif font-bold tracking-wide text-foreground">
            {t('servicesTitle')}
          </h2>
          <div className="h-[1px] w-24 bg-primary/40 mx-auto" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Service 1: Dine-In */}
          <PremiumCard hoverable className="flex flex-col h-full justify-between">
            <div className="space-y-4">
              <h3 className="text-lg font-serif font-bold text-primary">{t('servicesDine')}</h3>
              <p className="text-muted-foreground text-xs leading-relaxed">{t('servicesDineDesc')}</p>
            </div>
            <div className="pt-6 border-t border-primary/10 mt-6">
              <Link href={ROUTES.reservations} className="text-primary text-[10px] uppercase font-bold tracking-wider hover:underline">
                Book a Table &rarr;
              </Link>
            </div>
          </PremiumCard>

          {/* Service 2: Takeaway */}
          <PremiumCard hoverable className="flex flex-col h-full justify-between">
            <div className="space-y-4">
              <h3 className="text-lg font-serif font-bold text-primary">{t('servicesTakeaway')}</h3>
              <p className="text-muted-foreground text-xs leading-relaxed">{t('servicesTakeawayDesc')}</p>
            </div>
            <div className="pt-6 border-t border-primary/10 mt-6">
              <Link href={ROUTES.menu} className="text-primary text-[10px] uppercase font-bold tracking-wider hover:underline">
                View Menu &rarr;
              </Link>
            </div>
          </PremiumCard>

          {/* Service 3: Delivery */}
          <PremiumCard hoverable className="flex flex-col h-full justify-between">
            <div className="space-y-4">
              <h3 className="text-lg font-serif font-bold text-primary">{t('servicesDelivery')}</h3>
              <p className="text-muted-foreground text-xs leading-relaxed">{t('servicesDeliveryDesc')}</p>
            </div>
            <div className="pt-6 border-t border-primary/10 mt-6 text-[10px] text-muted-foreground italic">
              Wdrożenie w Fazie 8 / Launch in Phase 8
            </div>
          </PremiumCard>

          {/* Service 4: Reservations */}
          <PremiumCard hoverable className="flex flex-col h-full justify-between">
            <div className="space-y-4">
              <h3 className="text-lg font-serif font-bold text-primary">{t('servicesReservations')}</h3>
              <p className="text-muted-foreground text-xs leading-relaxed">{t('servicesReservationsDesc')}</p>
            </div>
            <div className="pt-6 border-t border-primary/10 mt-6">
              <Link href={ROUTES.reservations} className="text-primary text-[10px] uppercase font-bold tracking-wider hover:underline">
                Reserve Online &rarr;
              </Link>
            </div>
          </PremiumCard>
        </div>
      </SectionContainer>

      {/* 8. LOCATION */}
      <section className="w-full bg-[#050918] py-16 md:py-24 border-y border-primary/10">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="flex items-center space-x-2 text-primary">
              <span className="text-[10px] tracking-[0.25em] font-extrabold uppercase">Visit Us</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-serif font-bold tracking-wide text-foreground">
              {t('locationTitle')}
            </h2>
            <div className="space-y-3 font-sans text-sm text-muted-foreground">
              <p className="font-bold text-foreground">Namaste Indian Restaurant</p>
              <p>{address}</p>
              <p>Telefon: {phone}</p>
              <p>Email: contact@namaste-ciechanow.pl</p>
            </div>
            <div className="pt-4">
              <Link href={ROUTES.contact}>
                <PremiumButton variant="outline" size="md">
                  {t('locationContact')}
                </PremiumButton>
              </Link>
            </div>
          </div>

          <div className="w-full h-80 rounded-2xl border border-primary/20 overflow-hidden relative bg-[#070B1E] flex items-center justify-center text-primary/30">
            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            <span className="absolute bottom-3 right-3 text-[9px] uppercase tracking-widest text-primary/50">Map View Placeholder</span>
          </div>
        </div>
      </section>

      {/* 9. FINAL CTA */}
      <SectionContainer className="text-center relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[250px] sm:w-[500px] h-[250px] sm:h-[500px] bg-primary/5 rounded-full blur-[80px] sm:blur-[120px] pointer-events-none" />

        <div className="max-w-3xl mx-auto space-y-8 relative z-10">
          <h2 className="text-3xl sm:text-5xl font-serif font-bold tracking-wide text-foreground">
            {t('finalCtaTitle')}
          </h2>
          <p className="text-muted-foreground text-xs sm:text-base font-light font-sans max-w-xl mx-auto leading-relaxed">
            {t('finalCtaSub')}
          </p>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 max-w-md mx-auto">
            <Link href={ROUTES.reservations} className="w-full sm:w-auto">
              <PremiumButton variant="primary" size="lg" fullWidth>
                {t('reserveTable')}
              </PremiumButton>
            </Link>
            <Link href={ROUTES.menu} className="w-full sm:w-auto">
              <PremiumButton variant="outline" size="lg" fullWidth>
                {t('viewMenu')}
              </PremiumButton>
            </Link>
          </div>
        </div>
      </SectionContainer>
    </PageTransition>
  );
}
