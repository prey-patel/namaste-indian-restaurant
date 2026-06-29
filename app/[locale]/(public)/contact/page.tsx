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
import { MapPin, Phone, Mail, Clock } from 'lucide-react';
import ThreeDTiltCard from '@/components/ui/three-d-tilt';
import GoldFrame from '@/components/ui/gold-frame';

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
      <section className="relative overflow-hidden bg-[#070B1E] py-20 md:py-28 text-center border-b border-primary/15">
        {/* Glow Effects */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] sm:w-[600px] h-[350px] sm:h-[600px] bg-[radial-gradient(circle,rgba(212,175,55,0.06)_0%,rgba(7,11,30,0.2)_50%,transparent_100%)] rounded-full blur-[80px] pointer-events-none" />
        <MandalaWatermark className="w-[300px] h-[300px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] animate-pulse" />

        <div className="max-w-3xl mx-auto px-4 relative z-10 space-y-4">
          <div className="flex justify-center items-center space-x-2 text-primary">
            <div className="h-[1px] w-6 bg-primary/30" />
            <span className="text-[10px] tracking-[0.25em] font-extrabold uppercase text-primary/80">
              {locale === 'pl' ? 'Kontakt z Namaste' : 'Namaste Contact'}
            </span>
            <div className="h-[1px] w-6 bg-primary/30" />
          </div>
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-serif font-black tracking-wide bg-gradient-to-b from-white via-white to-zinc-400 bg-clip-text text-transparent pb-1">
            {tNav('contact')}
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm font-sans uppercase tracking-widest text-primary/65 font-bold">
            {locale === 'pl' ? 'Tradycyjna Gościnność • Rezerwacje • Catering' : 'Traditional Hospitality • Reservations • Catering'}
          </p>
        </div>
      </section>

      <SectionContainer className="space-y-16">
        {/* SSL Secured Notice Badge */}
        <div className="max-w-4xl mx-auto text-center">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-primary text-[10px] font-extrabold uppercase tracking-widest">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            {locale === 'pl' ? 'Zabezpieczone Szyfrowaniem SSL' : 'SSL Secured Connection'}
          </span>
        </div>

        {/* 3D Contact Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {/* Phone Card */}
          <ThreeDTiltCard maxTilt={10} glareOpacity={0.1}>
            <div className="relative rounded-2xl border border-primary/20 bg-[#050b1e]/60 p-6 backdrop-blur-md h-full text-center group hover:border-primary/50 transition-all duration-300">
              <div className="absolute inset-1.5 rounded-[12px] border border-primary/5 pointer-events-none" />
              <div className="relative z-10 space-y-4">
                <div className="w-12 h-12 rounded-full border border-primary/30 flex items-center justify-center text-primary bg-primary/5 mx-auto group-hover:scale-110 transition-transform duration-300">
                  <Phone className="w-5 h-5 text-primary animate-pulse" />
                </div>
                <h3 className="font-bold text-foreground uppercase tracking-widest text-xs">{locale === 'pl' ? 'Zadzwoń do nas' : 'Call Us'}</h3>
                <a
                  href={`tel:${phone}`}
                  className="block text-primary font-extrabold text-sm tracking-wide hover:underline hover:text-primary/80 transition-colors cursor-pointer"
                >
                  {phone}
                </a>
                <p className="text-[10px] text-muted-foreground/60 font-light font-sans">{locale === 'pl' ? 'Rezerwacje i zamówienia' : 'Reservations & orders'}</p>
              </div>
            </div>
          </ThreeDTiltCard>

          {/* Address Card */}
          <ThreeDTiltCard maxTilt={10} glareOpacity={0.1}>
            <div className="relative rounded-2xl border border-primary/20 bg-[#050b1e]/60 p-6 backdrop-blur-md h-full text-center group hover:border-primary/50 transition-all duration-300">
              <div className="absolute inset-1.5 rounded-[12px] border border-primary/5 pointer-events-none" />
              <div className="relative z-10 space-y-4">
                <div className="w-12 h-12 rounded-full border border-primary/30 flex items-center justify-center text-primary bg-primary/5 mx-auto group-hover:scale-110 transition-transform duration-300">
                  <MapPin className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-bold text-foreground uppercase tracking-widest text-xs">{locale === 'pl' ? 'Odwiedź nas' : 'Visit Us'}</h3>
                <a
                  href={settings.google_maps_link && settings.google_maps_link.trim().startsWith('http') ? settings.google_maps_link.trim() : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-muted-foreground text-xs leading-relaxed font-light hover:text-primary hover:underline transition-colors cursor-pointer"
                >
                  {address}
                </a>
              </div>
            </div>
          </ThreeDTiltCard>

          {/* Email Card */}
          <ThreeDTiltCard maxTilt={10} glareOpacity={0.1}>
            <div className="relative rounded-2xl border border-primary/20 bg-[#050b1e]/60 p-6 backdrop-blur-md h-full text-center group hover:border-primary/50 transition-all duration-300">
              <div className="absolute inset-1.5 rounded-[12px] border border-primary/5 pointer-events-none" />
              <div className="relative z-10 space-y-4">
                <div className="w-12 h-12 rounded-full border border-primary/30 flex items-center justify-center text-primary bg-primary/5 mx-auto group-hover:scale-110 transition-transform duration-300">
                  <Mail className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-bold text-foreground uppercase tracking-widest text-xs">{locale === 'pl' ? 'Napisz do nas' : 'Email Us'}</h3>
                <a
                  href={`mailto:${email}`}
                  className="block text-muted-foreground text-xs leading-relaxed font-light break-all hover:text-primary hover:underline transition-colors cursor-pointer"
                >
                  {email}
                </a>
              </div>
            </div>
          </ThreeDTiltCard>
        </div>

        {/* 2-Column Split: Map & Contact Form */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start max-w-5xl mx-auto w-full">
          {/* Map Column */}
          <div className="lg:col-span-5 h-full flex flex-col space-y-4 min-h-[400px]">
            <GoldFrame className="w-full h-full flex-1 overflow-hidden rounded-2xl">
              <div className="w-full h-full min-h-[350px] relative">
                <ContactMap 
                  address={address} 
                  phone={phone} 
                  coordinates={settings.coordinates} 
                  locale={locale} 
                />
              </div>
            </GoldFrame>
          </div>

          {/* Form Column */}
          <div className="lg:col-span-7">
            <ContactForm locale={locale} />
          </div>
        </div>

        {/* Weekly Opening Hours Section */}
        <div className="border-t border-primary/10 pt-16 grid grid-cols-1 lg:grid-cols-3 gap-12 items-center max-w-5xl mx-auto w-full">
          <div className="lg:col-span-1 space-y-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/5 border border-primary/30 text-primary">
              <Clock className="w-6 h-6 animate-pulse" />
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-serif font-black tracking-wide text-foreground">
                {locale === 'pl' ? 'Godziny Otwarcia' : 'Opening Hours'}
              </h2>
              <div className="h-[1px] w-16 bg-primary/40" />
            </div>
            <p className="text-muted-foreground text-sm font-light leading-relaxed">
              {locale === 'pl' 
                ? 'Zapraszamy do skosztowania autentycznych indyjskich dań na miejscu w naszej restauracji lub zamówienia z dostawą bezpośrednio pod Twoje drzwi.'
                : 'We invite you to taste authentic Indian curries dine-in at our restaurant or order delivery directly to your doorstep.'}
            </p>
            <div className="space-y-3.5 pt-2 text-xs text-muted-foreground/80">
              <div className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-primary" />
                <span>{locale === 'pl' ? 'Obsługa na miejscu (Dine-in)' : 'Dine-in Service'}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-primary" />
                <span>{locale === 'pl' ? 'Bezpieczna dostawa (Delivery)' : 'Contactless Delivery'}</span>
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
