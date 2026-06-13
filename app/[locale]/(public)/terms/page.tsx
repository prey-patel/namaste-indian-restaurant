import { getTranslations, setRequestLocale } from 'next-intl/server';
import PageTransition from '@/components/ui/page-transition';
import SectionContainer from '@/components/ui/section-container';
import LuxuryAlert from '@/components/ui/luxury-alert';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'seo' });
  return {
    title: t('termsTitle'),
    description: t('termsDesc'),
    openGraph: {
      title: t('termsTitle'),
      description: t('termsDesc'),
      locale: locale === 'pl' ? 'pl_PL' : 'en_US',
      type: 'website',
    },
  };
}

export default async function TermsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const tLegal = await getTranslations('legal');

  return (
    <PageTransition>
      <SectionContainer className="max-w-4xl space-y-8 font-sans">
        {/* Urgent Draft Legal Disclaimer at the top */}
        <LuxuryAlert type="warning" title={tLegal('draftTitle')}>
          <p className="text-xs sm:text-sm leading-relaxed">
            {tLegal('draftDesc')}
          </p>
        </LuxuryAlert>

        <div className="space-y-6">
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-primary">
            {locale === 'pl' ? 'Regulamin Serwisu' : 'Terms of Service'}
          </h1>
          <div className="h-[1px] w-24 bg-primary/30" />
          <p className="text-xs text-muted-foreground">
            Last updated: June 2026 | Status: DRAFT / PLACEHOLDER
          </p>
        </div>

        <div className="space-y-6 text-sm text-muted-foreground leading-relaxed font-light">
          <section className="space-y-2">
            <h2 className="text-lg font-serif font-bold text-foreground">
              1. {locale === 'pl' ? 'Postanowienia Ogólne' : 'General Provisions'}
            </h2>
            <p>
              {locale === 'pl'
                ? 'Niniejszy Regulamin określa zasady korzystania z witryny internetowej Namaste Indian Restaurant oraz dokonywania rezerwacji stolików online.'
                : 'These Terms of Service define the rules for using the Namaste Indian Restaurant website and making table reservations online.'}
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-serif font-bold text-foreground">
              2. {locale === 'pl' ? 'Warunki Świadczenia Usług' : 'Terms of Service Delivery'}
            </h2>
            <p>
              {locale === 'pl'
                ? 'Do korzystania z serwisu wymagane jest urządzenie z dostępem do Internetu oraz poprawnie skonfigurowana przeglądarka internetowa.'
                : 'To use the service, you need a device connected to the Internet and a properly configured web browser.'}
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-serif font-bold text-foreground">
              3. {locale === 'pl' ? 'Rezerwacja Stolików' : 'Table Reservations'}
            </h2>
            <p>
              {locale === 'pl'
                ? 'Dokonanie rezerwacji za pośrednictwem serwisu stanowi zapytanie ofertowe i wymaga otrzymania potwierdzenia od managera w celu uzyskania statusu zatwierdzenia rezerwacji.'
                : 'Making a reservation through our website represents an inquiry and is subject to manual manager approval to become a confirmed booking.'}
            </p>
          </section>
        </div>
      </SectionContainer>
    </PageTransition>
  );
}
