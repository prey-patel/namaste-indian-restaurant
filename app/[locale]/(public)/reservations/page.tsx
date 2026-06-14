import { getTranslations, setRequestLocale } from 'next-intl/server';
import PageTransition from '@/components/ui/page-transition';
import SectionContainer from '@/components/ui/section-container';
import PremiumCard from '@/components/ui/premium-card';
import MandalaWatermark from '@/components/ui/mandala-watermark';
import LuxuryAlert from '@/components/ui/luxury-alert';
import GoldFrame from '@/components/ui/gold-frame';
import ReservationForm from '@/components/public/reservations/reservation-form';
import { getPublicSystemSettings } from '@/lib/supabase/settings';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'seo' });
  return {
    title: t('reservationsTitle'),
    description: t('reservationsDesc'),
    openGraph: {
      title: t('reservationsTitle'),
      description: t('reservationsDesc'),
      locale: locale === 'pl' ? 'pl_PL' : 'en_US',
      type: 'website',
    },
  };
}

export default async function ReservationsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('reservations');
  const tNav = await getTranslations('nav');
  const settings = await getPublicSystemSettings();

  const maxGuests = settings.reservation_max_guests ?? 8;
  const phone = settings.restaurant_phone ?? '+48 511 984 331';
  const address = settings.restaurant_address ?? 'Warszawska 1/3, 06-400 Ciechanów';

  return (
    <PageTransition>
      {/* Reservations Hero */}
      <section className="relative overflow-hidden bg-[#070B1E] py-16 md:py-24 text-center border-b border-primary/15">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-primary/5 rounded-full blur-[80px] pointer-events-none" />
        <MandalaWatermark className="w-[300px] h-[300px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03]" />

        <div className="max-w-3xl mx-auto px-4 relative z-10 space-y-4">
          <div className="flex justify-center items-center space-x-2 text-primary">
            <div className="h-[1px] w-6 bg-primary/30" />
            <span className="text-[10px] tracking-[0.25em] font-extrabold uppercase">{tNav('reservations')}</span>
            <div className="h-[1px] w-6 bg-primary/30" />
          </div>
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-serif font-black tracking-wide text-foreground">
            {t('title')}
          </h1>
          <p className="text-sm text-muted-foreground/80 max-w-lg mx-auto font-light leading-relaxed">
            {t('subtitle')}
          </p>
        </div>
      </section>

      <SectionContainer>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start max-w-6xl mx-auto">
          
          {/* Reservation Policy Details (Left 5 cols) */}
          <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-28">
            <h2 className="text-2xl font-serif font-bold text-primary tracking-wide">
              {locale === 'pl' ? 'Zasady Rezerwacji' : 'Reservation Policy'}
            </h2>
            <div className="space-y-6 text-muted-foreground text-xs sm:text-sm leading-relaxed font-sans font-light">
              <div className="flex items-start space-x-3">
                <span className="text-primary font-bold mt-0.5">&bull;</span>
                <p>
                  {locale === 'pl'
                    ? 'Wszystkie rezerwacje przechodzą przez system wstępnej weryfikacji i wymagają potwierdzenia przez managera restauracji.'
                    : 'All reservations pass through a preliminary validation system and require manual confirmation by the restaurant manager.'}
                </p>
              </div>
              <div className="flex items-start space-x-3">
                <span className="text-primary font-bold mt-0.5">&bull;</span>
                <p>
                  {locale === 'pl'
                    ? `Rezerwacje stolików powyżej ${maxGuests} osób prosimy ustalać telefonicznie pod numerem: ${phone}.`
                    : `For table bookings exceeding ${maxGuests} guests, please contact us directly by phone: ${phone}.`}
                </p>
              </div>
              <div className="flex items-start space-x-3">
                <span className="text-primary font-bold mt-0.5">&bull;</span>
                <p>
                  {locale === 'pl'
                    ? 'Zarezerwowany stolik utrzymujemy przez maksymalnie 15 minut po planowanej godzinie przybycia.'
                    : 'We will hold your reserved table for a maximum of 15 minutes past your scheduled reservation time.'}
                </p>
              </div>
            </div>

            <div className="border-t border-primary/10 pt-6 space-y-2 text-xs">
              <p className="text-muted-foreground">
                <strong className="text-primary">{address}</strong>
              </p>
              <p className="text-muted-foreground">
                {locale === 'pl' ? 'Telefon:' : 'Phone:'} <strong className="text-foreground">{phone}</strong>
              </p>
            </div>
          </div>

          {/* Reservation Request Form (Right 7 cols) */}
          <div className="lg:col-span-7 w-full">
            <ReservationForm locale={locale as 'pl' | 'en'} maxGuests={maxGuests} />
          </div>

        </div>
      </SectionContainer>
    </PageTransition>
  );
}
