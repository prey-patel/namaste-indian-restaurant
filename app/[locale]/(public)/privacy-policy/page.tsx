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
    title: t('privacyTitle'),
    description: t('privacyDesc'),
    openGraph: {
      title: t('privacyTitle'),
      description: t('privacyDesc'),
      locale: locale === 'pl' ? 'pl_PL' : 'en_US',
      type: 'website',
    },
  };
}

export default async function PrivacyPolicyPage({ params }: Props) {
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
            {locale === 'pl' ? 'Polityka Prywatności' : 'Privacy Policy'}
          </h1>
          <div className="h-[1px] w-24 bg-primary/30" />
          <p className="text-xs text-muted-foreground">
            Last updated: June 2026 | Status: DRAFT / PLACEHOLDER
          </p>
        </div>

        <div className="space-y-6 text-sm text-muted-foreground leading-relaxed font-light">
          <section className="space-y-2">
            <h2 className="text-lg font-serif font-bold text-foreground">
              1. {locale === 'pl' ? 'Administrator Danych' : 'Data Administrator'}
            </h2>
            <p>
              {locale === 'pl'
                ? 'Administratorem Twoich danych osobowych jest Namaste Indian Restaurant z siedzibą przy ul. Warszawskiej 1/3, 06-400 Ciechanów, Polska.'
                : 'The administrator of your personal data is Namaste Indian Restaurant located at Warszawska 1/3, 06-400 Ciechanów, Poland.'}
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-serif font-bold text-foreground">
              2. {locale === 'pl' ? 'Cele i Podstawy Przetwarzania Danych' : 'Purposes and Grounds for Data Processing'}
            </h2>
            <p>
              {locale === 'pl'
                ? 'Dane osobowe przetwarzane są w celu realizacji rezerwacji stolików (podstawa prawna: art. 6 ust. 1 lit. b RODO), kontaktu z klientami oraz marketingu usług własnych.'
                : 'Personal data is processed to manage table reservations (legal basis: Art. 6 par. 1 lit. b GDPR), communicate with customers, and market our own services.'}
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-serif font-bold text-foreground">
              3. {locale === 'pl' ? 'Prawa Użytkowników' : 'User Rights'}
            </h2>
            <p>
              {locale === 'pl'
                ? 'Posiadasz prawo dostępu do swoich danych, ich sprostowania, usunięcia, ograniczenia przetwarzania, wniesienia sprzeciwu oraz przenoszenia danych.'
                : 'You have the right to access, rectify, delete, restrict processing of, object to, and transfer your personal data.'}
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-serif font-bold text-foreground">
              4. {locale === 'pl' ? 'Okres Przechowywania Danych' : 'Data Retention Period'}
            </h2>
            <p>
              {locale === 'pl'
                ? 'Dane przetwarzane w celu rezerwacji będą przechowywane przez okres niezbędny do realizacji rezerwacji oraz obrony przed roszczeniami.'
                : 'Data processed for reservations will be retained for the period necessary to complete the reservation and defend against potential claims.'}
            </p>
          </section>
        </div>
      </SectionContainer>
    </PageTransition>
  );
}
