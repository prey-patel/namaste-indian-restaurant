import { getTranslations, setRequestLocale } from 'next-intl/server';
import PageTransition from '@/components/ui/page-transition';
import SectionContainer from '@/components/ui/section-container';

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

  const isPl = locale === 'pl';
  const currentDate = new Date().toLocaleDateString(isPl ? 'pl-PL' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <PageTransition>
      <SectionContainer className="max-w-4xl space-y-8 font-sans">
        <div className="space-y-6">
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-primary">
            {isPl ? 'Polityka Plików Cookies' : 'Cookie Policy'}
          </h1>
          <div className="h-[1px] w-24 bg-primary/30" />
          <p className="text-xs text-muted-foreground">
            {isPl ? `Ostatnia aktualizacja: ${currentDate}` : `Last updated: ${currentDate}`}
          </p>
        </div>

        <div className="space-y-6 text-sm text-muted-foreground leading-relaxed font-light font-sans">
          {isPl ? (
            // Polish Version (Polityka Plików Cookies)
            <>
              <p className="text-foreground">
                Niniejsza Polityka Cookies dotyczy serwisu internetowego Namaste Indian Restaurant, którego administratorem jest <strong>LOUNGE AND LUXURY SPÓŁKA Z OGRANICZONĄ ODPOWIEDZIALNOŚCIĄ</strong> z siedzibą w Ciechanowie przy ul. Warszawskiej 1/3 (KRS: 0001236476, NIP: 5662043347, REGON: 544558643).
              </p>

              <section className="space-y-2">
                <h2 className="text-lg font-serif font-bold text-foreground">
                  1. Czym są pliki Cookies?
                </h2>
                <p>
                  Pliki cookies (tzw. „ciasteczka”) to małe pliki tekstowe zapisywane i przechowywane na urządzeniu końcowym Użytkownika (komputerze, telefonie, tablecie) podczas przeglądania stron internetowych. Służą one ułatwieniu korzystania z witryn, zapamiętywaniu preferencji oraz dostarczaniu informacji analitycznych.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-lg font-serif font-bold text-foreground">
                  2. Jakie pliki Cookies wykorzystujemy i w jakich celach?
                </h2>
                <p>Nasz serwis wykorzystuje dwa główne typy plików cookies:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>Cookies Sesyjne (Session Cookies):</strong> Są to pliki tymczasowe, które są przechowywane w urządzeniu Użytkownika do czasu wylogowania, opuszczenia strony internetowej lub wyłączenia przeglądarki. Są one niezbędne do poprawnego działania funkcji koszyka zakupowego, procesu rezerwacji oraz Digital Waitera (obsługi stolików za pomocą kodu QR).</li>
                  <li><strong>Cookies Stałe (Persistent Cookies):</strong> Pozostają na urządzeniu Użytkownika przez czas określony w parametrach plików cookies lub do momentu ich ręcznego usunięcia. Służą np. do zapamiętania wybranego języka (polski/angielski) przy kolejnej wizycie w serwisie.</li>
                </ul>
                <p className="pt-2 font-medium text-foreground">Podział ze względu na funkcjonalność:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>Niezbędne / Techniczne:</strong> Umożliwiają poruszanie się po witrynie i korzystanie z jej funkcji, takich jak dodawanie potraw do koszyka i zamawianie online. Bez nich usługi nie mogłyby zostać zrealizowane.</li>
                  <li><strong>Funkcjonalne:</strong> Pozwalają serwisowi zapamiętać wybory dokonane przez Użytkownika (np. język serwisu, preferencje dotyczące filtrów potraw wegetariańskich).</li>
                  <li><strong>Analityczne / Statystyczne:</strong> Służą do tworzenia anonimowych statystyk odwiedzin witryny (np. ruch na stronie, najpopularniejsze kategorie menu). Pomagają nam ulepszać strukturę i treść witryny.</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h2 className="text-lg font-serif font-bold text-foreground">
                  3. Zarządzanie plikami Cookies i ich usuwanie
                </h2>
                <p>
                  Większość przeglądarek internetowych domyślnie dopuszcza umieszczanie plików cookies na urządzeniu końcowym. Użytkownik może samodzielnie zmienić te ustawienia w swojej przeglądarce w dowolnym momencie.
                </p>
                <p>Użytkownik ma możliwość:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Zablokowania automatycznej obsługi plików cookies.</li>
                  <li>Ustawienia powiadomień o każdorazowym przesłaniu pliku cookie na urządzenie.</li>
                  <li>Usunięcia plików cookies już zapisanych w pamięci przeglądarki.</li>
                </ul>
                <p className="pt-2 text-xs">
                  <strong>Uwaga:</strong> Wyłączenie lub ograniczenie stosowania niektórych plików cookies niezbędnych i funkcjonalnych może utrudnić lub uniemożliwić korzystanie z niektórych funkcji naszego serwisu, takich jak składanie zamówień online lub rezerwacja stolików.
                </p>
              </section>
            </>
          ) : (
            // English Version (Cookie Policy)
            <>
              <p className="text-foreground">
                This Cookie Policy applies to the Namaste Indian Restaurant website, managed by <strong>LOUNGE AND LUXURY SPÓŁKA Z OGRANICZONĄ ODPOWIEDZIALNOŚCIĄ</strong> with its registered office in Ciechanów at ul. Warszawska 1/3 (KRS: 0001236476, NIP: 5662043347, REGON: 544558643).
              </p>

              <section className="space-y-2">
                <h2 className="text-lg font-serif font-bold text-foreground">
                  1. What are Cookies?
                </h2>
                <p>
                  Cookies are small text files placed and stored on your terminal device (computer, smartphone, tablet) while browsing websites. They are used to facilitate website operation, remember settings, and provide analytical data.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-lg font-serif font-bold text-foreground">
                  2. What Cookies do we use and for what purposes?
                </h2>
                <p>Our website utilizes two main types of cookies:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>Session Cookies:</strong> Temporary files stored on your device until you log out, leave the website, or close the web browser. They are technically essential for the shopping cart system, online reservation form, and Digital Waiter QR table service to operate correctly.</li>
                  <li><strong>Persistent Cookies:</strong> These remain on your device for the duration specified in the cookie parameters or until manually deleted. They are used, for example, to remember your language preference (Polish/English) on subsequent visits.</li>
                </ul>
                <p className="pt-2 font-medium text-foreground">Classification by functionality:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>Essential / Technical:</strong> Necessary for site navigation and ordering functions (like adding dishes to the cart and finalizing checkouts). Without these, the site cannot provide basic services.</li>
                  <li><strong>Functional:</strong> Allow the site to remember choices you make (such as active language or food filtering preferences like vegetarian/vegan options).</li>
                  <li><strong>Analytical / Statistical:</strong> Help us build anonymous traffic statistics (such as page views, visitor count, popular menu categories) to analyze and optimize website performance.</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h2 className="text-lg font-serif font-bold text-foreground">
                  3. Managing and Deleting Cookies
                </h2>
                <p>
                  Most web browsers accept cookies by default. You can modify your browser settings to adjust your cookie preferences at any time.
                </p>
                <p>You have the ability to:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Block the automatic storage of cookies.</li>
                  <li>Request notification whenever a cookie is placed on your device.</li>
                  <li>Manually delete cookies currently stored in your browser cache.</li>
                </ul>
                <p className="pt-2 text-xs">
                  <strong>Note:</strong> Disabling or limiting technical/essential cookies may degrade site performance or prevent you from placing online orders and booking tables.
                </p>
              </section>
            </>
          )}
        </div>
      </SectionContainer>
    </PageTransition>
  );
}
