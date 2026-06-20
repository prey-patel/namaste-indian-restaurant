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
import { getPublicOpeningHours } from '@/lib/public/opening-hours';
import TodaysHoursCard from '@/components/public/opening-hours/todays-hours-card';
import RedesignedHomeClient from '@/components/public/redesigned-home-client';

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

  // Load public settings, CMS content, and opening hours server-side
  const settings = await getPublicSystemSettings();
  const cmsHero = await getSiteContent('home_hero');
  const openingHoursData = await getPublicOpeningHours(locale);

  // Dynamic content loading with fallback to translation dictionaries
  const heroTitle = (cmsHero as any)?.[`value_${locale}`]?.title || t('heroTitle');
  const heroTitleAccent = (cmsHero as any)?.[`value_${locale}`]?.titleAccent || t('heroTitleAccent');
  const heroSubhead = (cmsHero as any)?.[`value_${locale}`]?.subhead || t('heroSubhead');
  
  const welcomeMessage = settings.public_messages?.welcome_message || t('infoOpening');
  const alertBanner = settings.public_messages?.alert_banner;
  
  const address = settings.restaurant_full_address || settings.restaurant_address || 'Warszawska 1/3, 06-400 Ciechanów, Poland';
  const phone = settings.restaurant_phone || '511984331';
  const email = settings.restaurant_email || 'contact@namaste-ciechanow.pl';
  const dineInHours = settings.public_service_hours?.dine_in || '12:00 - 22:00';
  const deliveryHours = settings.public_service_hours?.delivery || '12:00 - 21:30';

  // JSON-LD structured data for Restaurant / LocalBusiness (Confirmed information only)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://namaste-ciechanow.pl';
  const cleanPhone = phone.replace(/\s+/g, '');
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    'name': settings.public_display_name || 'Namaste Indian Restaurant',
    'image': `${siteUrl}/images/logo.png`,
    '@id': siteUrl,
    'url': siteUrl,
    'telephone': cleanPhone.startsWith('+') ? cleanPhone : `+48${cleanPhone}`,
    'address': {
      '@type': 'PostalAddress',
      'streetAddress': settings.restaurant_address?.split(',')[0]?.trim() || 'Warszawska 1/3',
      'addressLocality': settings.restaurant_city || 'Ciechanów',
      'postalCode': settings.restaurant_postal_code || '06-400',
      'addressCountry': settings.restaurant_country === 'Poland' ? 'PL' : (settings.restaurant_country || 'PL')
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
        todaysHoursCard={
          <TodaysHoursCard 
            dineIn={openingHoursData.dineIn} 
            delivery={openingHoursData.delivery} 
          />
        }
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

      {/* Redesigned interactive client components for home */}
      <RedesignedHomeClient
        locale={locale}
        address={address}
        phone={phone}
        email={email}
        coordinates={settings.coordinates}
      />
    </PageTransition>
  );
}
