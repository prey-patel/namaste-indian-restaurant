import React from 'react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import PageTransition from '@/components/ui/page-transition';
import SectionContainer from '@/components/ui/section-container';
import MenuHero from '@/components/public/menu/menu-hero';
import MenuClientWrapper from '@/components/public/menu/menu-client-wrapper';
import { getPublicMenuData } from '@/lib/supabase/menu';
import { getPublicSystemSettings } from '@/lib/supabase/settings';

type Props = {
  params: Promise<{ locale: string }>;
};

// Force dynamic rendering on this route so that 1-hour signed storage URLs remain fresh and never expire on statically cached pages
export const dynamic = 'force-dynamic';

// Dynamic SEO metadata matching standard localized content
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'seo' });
  return {
    title: t('menuTitle'),
    description: t('menuDesc'),
    alternates: {
      canonical: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/${locale}/menu`,
    },
    openGraph: {
      title: t('menuTitle'),
      description: t('menuDesc'),
      locale: locale === 'pl' ? 'pl_PL' : 'en_US',
      type: 'website',
      url: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/${locale}/menu`,
    },
  };
}

export default async function MenuPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Load public settings and menu data
  const [settings, { categories, items }] = await Promise.all([
    getPublicSystemSettings(),
    getPublicMenuData()
  ]);
  const isPl = locale === 'pl';

  const address = settings.restaurant_full_address || settings.restaurant_address || 'Warszawska 1/3, 06-400 Ciechanów, Poland';
  const phone = settings.restaurant_phone || '511984331';
  const name = settings.restaurant_name || 'Namaste Indian Restaurant';

  // Parse address for JSON-LD fields
  const addressParts = address.split(',').map(p => p.trim());
  const streetAddress = addressParts[0] || 'Warszawska 1/3';
  const zipAndCity = addressParts[1] ? addressParts[1].split(' ') : ['06-400', 'Ciechanów'];
  const postalCode = zipAndCity[0] || '06-400';
  const addressLocality = zipAndCity[1] || 'Ciechanów';

  // Restaurant/FoodMenu JSON-LD schema configuration
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    "name": name,
    "image": "https://raw.githubusercontent.com/preyanshu/namaste-restaurant/main/public/images/hero-bg.jpg", // fallback placeholder or site logo
    "address": {
      "@type": "PostalAddress",
      "streetAddress": streetAddress,
      "addressLocality": addressLocality,
      "postalCode": postalCode,
      "addressCountry": "PL"
    },
    "telephone": phone,
    "servesCuisine": "Indian",
    "priceRange": "$$",
    "hasMenu": {
      "@type": "FoodMenu",
      "name": isPl ? "Menu Namaste Ciechanów" : "Namaste Menu Ciechanów",
      "inLanguage": locale,
      "hasMenuSection": categories.map((cat) => ({
        "@type": "MenuSection",
        "name": isPl ? cat.name_pl : cat.name_en,
        "hasMenuItem": items
          .filter((item) => item.category_id === cat.id)
          .map((item) => ({
            "@type": "MenuItem",
            "name": isPl ? item.name_pl : item.name_en,
            "description": isPl ? item.description_pl : item.description_en,
            "offers": {
              "@type": "Offer",
              "price": item.price,
              "priceCurrency": "PLN"
            }
          }))
      }))
    }
  };

  return (
    <PageTransition>
      {/* Inject JSON-LD structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Menu Hero Header */}
      <MenuHero />

      {/* Main Interactive Menu Section */}
      <SectionContainer className="py-12">
        <MenuClientWrapper
          categories={categories}
          items={items}
          locale={locale}
        />
      </SectionContainer>
    </PageTransition>
  );
}
