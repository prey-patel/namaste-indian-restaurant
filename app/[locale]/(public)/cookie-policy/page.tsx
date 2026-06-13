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
    title: t('cookieTitle'),
    description: t('cookieDesc'),
    openGraph: {
      title: t('cookieTitle'),
      description: t('cookieDesc'),
      locale: locale === 'pl' ? 'pl_PL' : 'en_US',
      type: 'website',
    },
  };
}

export default async function CookiePolicyPage({ params }: Props) {
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
            {locale === 'pl' ? 'Polityka Plików Cookies' : 'Cookie Policy'}
          </h1>
          <div className="h-[1px] w-24 bg-primary/30" />
          <p className="text-xs text-muted-foreground">
            Last updated: June 2026 | Status: DRAFT / PLACEHOLDER
          </p>
        </div>

        <div className="space-y-6 text-sm text-muted-foreground leading-relaxed font-light">
          <section className="space-y-2">
            <h2 className="text-lg font-serif font-bold text-foreground">
              1. {locale === 'pl' ? 'Czym są pliki Cookies?' : 'What are Cookies?'}
            </h2>
            <p>
              {locale === 'pl'
                ? 'Pliki cookies (tzw. „ciasteczka”) stanowią dane informatyczne, w szczególności pliki tekstowe, które przechowywane są w urządzeniu końcowym Użytkownika Serwisu i przeznaczone są do korzystania ze stron internetowych Serwisu.'
                : 'Cookies are small text files stored on your device that help improve website functionality and user experience.'}
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-serif font-bold text-foreground">
              2. {locale === 'pl' ? 'W jaki sposób wykorzystujemy pliki Cookies?' : 'How do we use Cookies?'}
            </h2>
            <p>
              {locale === 'pl'
                ? 'Wykorzystujemy pliki cookies w celach statystycznych, analitycznych oraz w celu zapewnienia prawidłowego działania podstawowych funkcji naszej witryny, takich jak sesja użytkownika i koszyk rezerwacji.'
                : 'We use cookies for statistical, analytical purposes, and to ensure the proper functioning of our website, including user sessions and reservations.'}
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-serif font-bold text-foreground">
              3. {locale === 'pl' ? 'Zarządzanie plikami Cookies' : 'Managing Cookies'}
            </h2>
            <p>
              {locale === 'pl'
                ? 'Większość przeglądarek internetowych domyślnie dopuszcza przechowywanie plików cookies. Użytkownik może w każdej chwili samodzielnie zmienić ustawienia dotyczące plików cookies w swojej przeglądarce.'
                : 'Most web browsers accept cookies by default. You can change your cookie settings in your browser at any time.'}
            </p>
          </section>
        </div>
      </SectionContainer>
    </PageTransition>
  );
}
