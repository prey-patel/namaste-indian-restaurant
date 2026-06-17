import { getTranslations, setRequestLocale } from 'next-intl/server';
import PageTransition from '@/components/ui/page-transition';
import SectionContainer from '@/components/ui/section-container';
import PremiumCard from '@/components/ui/premium-card';
import MandalaWatermark from '@/components/ui/mandala-watermark';
import LuxuryAlert from '@/components/ui/luxury-alert';
import { getPublicSystemSettings } from '@/lib/supabase/settings';
import ContactMap from '@/components/public/contact-map';
import ContactForm from './contact-form';
import { getPublicOpeningHours } from '@/lib/public/opening-hours';
import WeeklyHoursTable from '@/components/public/opening-hours/weekly-hours-table';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'seo' });
  return {
    title: t('contactTitle'),
    description: t('contactDesc'),
    openGraph: {
      title: t('contactTitle'),
      description: t('contactDesc'),
      locale: locale === 'pl' ? 'pl_PL' : 'en_US',
      type: 'website',
    },
  };
}

export default async function ContactPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const tNav = await getTranslations('nav');
  const tHome = await getTranslations('home');

  // Load public settings and opening hours server-side
  const settings = await getPublicSystemSettings();
  const openingHoursData = await getPublicOpeningHours(locale);

  const address = settings.restaurant_full_address || settings.restaurant_address || 'Warszawska 1/3, 06-400 Ciechanów, Poland';
  const phone = settings.restaurant_phone || '511984331';
  const email = settings.restaurant_email || 'contact@namaste-ciechanow.pl';
  const dineInHours = settings.public_service_hours?.dine_in || '12:00 - 22:00';
  const deliveryHours = settings.public_service_hours?.delivery || '12:00 - 21:30';

  return (
    <PageTransition>
      {/* Contact Hero */}
      <section className="relative overflow-hidden bg-[#070B1E] py-16 md:py-24 text-center border-b border-primary/15">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-primary/5 rounded-full blur-[80px] pointer-events-none" />
        <MandalaWatermark className="w-[300px] h-[300px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03]" />

        <div className="max-w-3xl mx-auto px-4 relative z-10 space-y-4">
          <div className="flex justify-center items-center space-x-2 text-primary">
            <div className="h-[1px] w-6 bg-primary/30" />
            <span className="text-[10px] tracking-[0.25em] font-extrabold uppercase">{tNav('contact')}</span>
            <div className="h-[1px] w-6 bg-primary/30" />
          </div>
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-serif font-black tracking-wide text-foreground">
            {tNav('contact')}
          </h1>
        </div>
      </section>

      <SectionContainer className="space-y-12">
        {/* Phase 4B Notice Banner */}
        <div className="max-w-3xl mx-auto">
          <LuxuryAlert type="info" title={locale === 'pl' ? 'Wdrożenie Formularza' : 'Form Integration'}>
            <p className="text-xs sm:text-sm leading-relaxed">
              {locale === 'pl'
                ? 'Formularz kontaktowy został zintegrowany z bezpieczną obsługą po stronie serwera i zapisuje zgłoszenia bezpośrednio w systemie.'
                : 'The contact form is integrated with secure server-side processing and writes inquiries directly to our system database.'}
            </p>
          </LuxuryAlert>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          {/* Contact Details & Map */}
          <div className="space-y-8">
            <PremiumCard hoverable={false} className="space-y-6">
              <h2 className="text-xl font-serif font-bold text-primary border-b border-primary/20 pb-2">
                {locale === 'pl' ? 'Informacje Kontaktowe' : 'Contact Information'}
              </h2>

              <div className="space-y-4 text-xs sm:text-sm font-sans font-light text-muted-foreground">
                <div>
                  <h3 className="font-bold text-foreground uppercase tracking-widest text-[10px] mb-1">Adres / Address</h3>
                  <p>{address}</p>
                </div>
                <div>
                  <h3 className="font-bold text-foreground uppercase tracking-widest text-[10px] mb-1">Telefon / Phone</h3>
                  <p className="font-bold text-primary">{phone}</p>
                </div>
                <div>
                  <h3 className="font-bold text-foreground uppercase tracking-widest text-[10px] mb-1">Email</h3>
                  <p>{email}</p>
                </div>

              </div>
            </PremiumCard>

            {/* Leaflet/OSM map component */}
            <ContactMap 
              address={address} 
              phone={phone} 
              coordinates={settings.coordinates} 
              locale={locale} 
            />
          </div>

          {/* Contact Form client component */}
          <ContactForm locale={locale} />
        </div>

        {/* Weekly Opening Hours Section */}
        <div className="border-t border-primary/10 pt-12 grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-1 space-y-4">
            <h2 className="text-2xl sm:text-3xl font-serif font-black tracking-wide text-foreground">
              {locale === 'pl' ? 'Godziny Otwarcia' : 'Opening Hours'}
            </h2>
            <p className="text-muted-foreground text-xs sm:text-sm font-light leading-relaxed">
              {locale === 'pl' 
                ? 'Jesteśmy otwarci każdego dnia, aby serwować Państwu najlepsze dania kuchni indyjskiej.'
                : 'We are open every day to serve you the best of Indian cuisine.'}
            </p>
            <div className="space-y-3 pt-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span>{locale === 'pl' ? 'Obsługa na miejscu' : 'Restaurant Dine-in Service'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span>{locale === 'pl' ? 'Dostawa do domu' : 'Delivery Service to your doorstep'}</span>
              </div>
            </div>
          </div>
          <div className="lg:col-span-2">
            <WeeklyHoursTable 
              weeklyHours={openingHoursData.weeklyHours} 
              todayDayOfWeek={openingHoursData.todayDayOfWeek} 
            />
          </div>
        </div>
      </SectionContainer>
    </PageTransition>
  );
}
