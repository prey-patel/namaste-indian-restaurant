import React from 'react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import PageTransition from '@/components/ui/page-transition';
import SectionContainer from '@/components/ui/section-container';
import MenuHero from '@/components/public/menu/menu-hero';
import MenuClientWrapper from '@/components/public/menu/menu-client-wrapper';
import { getPublicMenuData } from '@/lib/supabase/menu';

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

  // Load public menu categories and available items from Supabase (respecting RLS)
  const { categories, items } = await getPublicMenuData();
  const isPl = locale === 'pl';

  // Restaurant/FoodMenu JSON-LD schema configuration
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    "name": "Namaste Indian Restaurant",
    "image": "https://raw.githubusercontent.com/preyanshu/namaste-restaurant/main/public/images/hero-bg.jpg", // fallback placeholder or site logo
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "Warszawska 1/3",
      "addressLocality": "Ciechanów",
      "postalCode": "06-400",
      "addressCountry": "PL"
    },
    "telephone": "511984331",
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
