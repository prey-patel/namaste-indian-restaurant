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
            {isPl ? 'Polityka Prywatności' : 'Privacy Policy'}
          </h1>
          <div className="h-[1px] w-24 bg-primary/30" />
          <p className="text-xs text-muted-foreground">
            {isPl ? `Ostatnia aktualizacja: ${currentDate}` : `Last updated: ${currentDate}`}
          </p>
        </div>

        <div className="space-y-6 text-sm text-muted-foreground leading-relaxed font-light font-sans">
          {isPl ? (
            // Polish Version (Polityka Prywatności - RODO)
            <>
              <p className="text-foreground">
                Niniejsza Polityka Prywatności określa zasady przetwarzania i ochrony danych osobowych osób korzystających z serwisu internetowego oraz usług Namaste Indian Restaurant.
              </p>

              <section className="space-y-2">
                <h2 className="text-lg font-serif font-bold text-foreground">
                  1. Administrator Danych Osobowych (ADO)
                </h2>
                <p>
                  Administratorem Państwa danych osobowych jest <strong>LOUNGE AND LUXURY SPÓŁKA Z OGRANICZONĄ ODPOWIEDZIALNOŚCIĄ</strong> z siedzibą pod adresem: ul. Warszawska 1/3, 06-400 Ciechanów, Polska, wpisana do Rejestru Przedsiębiorców Krajowego Rejestru Sądowego pod numerem KRS: <strong>0001236476</strong>, posiadająca NIP: <strong>5662043347</strong> oraz REGON: <strong>544558643</strong>.
                </p>
                <p>
                  W sprawach związanych z ochroną danych osobowych mogą Państwo skontaktować się z nami drogą mailową pod adresem: <a href="mailto:namasteadmin.pl@gmail.com" className="text-primary hover:underline">namasteadmin.pl@gmail.com</a> lub telefonicznie: <strong>511984331</strong>.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-lg font-serif font-bold text-foreground">
                  2. Cele i Podstawy Prawne Przetwarzania Danych
                </h2>
                <p>Państwa dane osobowe są przetwarzane zgodnie z Rozporządzeniem Parlamentu Europejskiego i Rady (UE) 2016/679 (RODO) w następujących celach:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>Realizacja zamówień online i dostaw</strong> (art. 6 ust. 1 lit. b RODO) – przetwarzanie jest niezbędne do wykonania umowy świadczenia usług lub realizacji zamówienia gastronomicznego.</li>
                  <li><strong>Obsługa rezerwacji stolików online</strong> (art. 6 ust. 1 lit. b RODO) – w celu potwierdzenia i zarządzania rezerwacjami stolików w restauracji.</li>
                  <li><strong>Kontakt telefoniczny oraz mailowy</strong> (art. 6 ust. 1 lit. f RODO) – uzasadniony interes Administratora polegający na udzielaniu odpowiedzi na zapytania klientów przesyłane formularzem kontaktowym.</li>
                  <li><strong>Wypełnienie obowiązków prawnych</strong> (art. 6 ust. 1 lit. c RODO) – w celach rachunkowych, podatkowych oraz wystawiania faktur.</li>
                  <li><strong>Ustalenie, dochodzenie lub obrona przed roszczeniami</strong> (art. 6 ust. 1 lit. f RODO) – uzasadniony interes prawny Administratora polegający na ochronie własnych praw.</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h2 className="text-lg font-serif font-bold text-foreground">
                  3. Rodzaj Przetwarzanych Danych
                </h2>
                <p>Przetwarzamy dane niezbędne do realizacji określonych celów:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Imię i nazwisko</li>
                  <li>Numer telefonu</li>
                  <li>Adres e-mail</li>
                  <li>Adres dostawy (ulica, numer domu/mieszkania, kod pocztowy, miasto)</li>
                  <li>Dane dotyczące zamówienia (koszyk zakupowy, uwagi klienta)</li>
                  <li>Adres IP urządzenia i logi systemowe (zbierane automatycznie w celach bezpieczeństwa i analitycznych)</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h2 className="text-lg font-serif font-bold text-foreground">
                  4. Odbiorcy Danych Osobowych
                </h2>
                <p>Państwa dane mogą być udostępniane podmiotom trzecim wspierającym realizację naszych usług na podstawie umów powierzenia przetwarzania danych:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Dostawcy usług hostingowych i chmurowych (Vercel Inc., Supabase Inc.)</li>
                  <li>Dostawcy systemów wysyłki wiadomości e-mail (Brevo / Sendinblue)</li>
                  <li>Pracownicy i kurierzy dostarczający zamówienia gastronomiczne</li>
                  <li>Biura rachunkowe i doradcy prawni (w niezbędnym zakresie wynikającym z przepisów prawa)</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h2 className="text-lg font-serif font-bold text-foreground">
                  5. Okres Przechowywania Danych
                </h2>
                <p>Dane osobowe będą przechowywane przez okres:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Dane dotyczące zamówień i rezerwacji – przez czas niezbędny do realizacji usługi oraz przez okres wymagany przepisami prawa podatkowego (5 lat od końca roku podatkowego).</li>
                  <li>Dane kontaktowe (formularze) – do czasu wyjaśnienia sprawy i zakończenia korespondencji.</li>
                  <li>Dane przetwarzane na podstawie uzasadnionego interesu – do czasu wniesienia skutecznego sprzeciwu.</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h2 className="text-lg font-serif font-bold text-foreground">
                  6. Prawa Osób, Których Dane Dotyczą
                </h2>
                <p>Posiadają Państwo prawo do:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Dostępu do swoich danych osobowych oraz otrzymania ich kopii</li>
                  <li>Sprostowania (poprawiania) nieprawidłowych danych</li>
                  <li>Usunięcia danych (&quot;prawo do bycia zapomnianym&quot;), jeśli nie ma innych podstaw prawnych do ich przetwarzania</li>
                  <li>Ograniczenia przetwarzania danych</li>
                  <li>Przenoszenia danych do innego administratora</li>
                  <li>Wniesienia sprzeciwu wobec przetwarzania danych opartego na uzasadnionym interesie ADO</li>
                  <li>Wniesienia skargi do organu nadzorczego – Prezesa Urzędu Ochrony Danych Osobowych (PUODO), ul. Stawki 2, 00-193 Warszawa.</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h2 className="text-lg font-serif font-bold text-foreground">
                  7. Zautomatyzowane Podejmowanie Decyzji i Profilowanie
                </h2>
                <p>
                  Państwa dane osobowe nie będą wykorzystywane do zautomatyzowanego podejmowania decyzji wywołujących skutki prawne, w tym do profilowania w rozumieniu przepisów RODO.
                </p>
              </section>
            </>
          ) : (
            // English Version (Privacy Policy - GDPR)
            <>
              <p className="text-foreground">
                This Privacy Policy defines the rules for processing and protecting personal data of users accessing the website and ordering services of Namaste Indian Restaurant.
              </p>

              <section className="space-y-2">
                <h2 className="text-lg font-serif font-bold text-foreground">
                  1. Data Controller
                </h2>
                <p>
                  The controller of your personal data is <strong>LOUNGE AND LUXURY SPÓŁKA Z OGRANICZONĄ ODPOWIEDZIALNOŚCIĄ</strong> with its registered office at: ul. Warszawska 1/3, 06-400 Ciechanów, Poland, registered in the Register of Entrepreneurs of the National Court Register under KRS number: <strong>0001236476</strong>, NIP: <strong>5662043347</strong>, and REGON: <strong>544558643</strong>.
                </p>
                <p>
                  In all matters regarding personal data protection, you can contact us via email at: <a href="mailto:namasteadmin.pl@gmail.com" className="text-primary hover:underline">namasteadmin.pl@gmail.com</a> or by phone: <strong>511984331</strong>.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-lg font-serif font-bold text-foreground">
                  2. Purposes and Legal Bases for Data Processing
                </h2>
                <p>Your personal data is processed in accordance with Regulation (EU) 2016/679 of the European Parliament and of the Council (GDPR) for the following purposes:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>Fulfilling online orders and delivery</strong> (Art. 6 par. 1 lit. b GDPR) – processing is necessary to perform the service contract and deliver food orders.</li>
                  <li><strong>Handling table reservations online</strong> (Art. 6 par. 1 lit. b GDPR) – to confirm and manage table reservations in our restaurant.</li>
                  <li><strong>Phone and email contact</strong> (Art. 6 par. 1 lit. f GDPR) – legitimate interest of the Controller consisting in responding to customer inquiries sent via contact forms.</li>
                  <li><strong>Fulfillment of legal obligations</strong> (Art. 6 par. 1 lit. c GDPR) – for accounting, tax, and invoicing purposes.</li>
                  <li><strong>Establishment, investigation, or defense against claims</strong> (Art. 6 par. 1 lit. f GDPR) – legitimate interest of the Controller to protect business and legal rights.</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h2 className="text-lg font-serif font-bold text-foreground">
                  3. Types of Processed Data
                </h2>
                <p>We process personal data necessary for the specified purposes, including:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>First and last name</li>
                  <li>Phone number</li>
                  <li>Email address</li>
                  <li>Delivery address (street name, house/flat number, postal code, city)</li>
                  <li>Order details (shopping cart items, customer notes)</li>
                  <li>IP address and system logs (collected automatically for security and analytical purposes)</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h2 className="text-lg font-serif font-bold text-foreground">
                  4. Recipients of Personal Data
                </h2>
                <p>Your data may be shared with trusted third-party service providers acting on our behalf under data processing agreements:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Hosting and cloud database providers (Vercel Inc., Supabase Inc.)</li>
                  <li>Email notification delivery systems (Brevo / Sendinblue)</li>
                  <li>Restaurant employees and delivery drivers</li>
                  <li>Accounting offices and legal advisors (only as required by law)</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h2 className="text-lg font-serif font-bold text-foreground">
                  5. Data Retention Period
                </h2>
                <p>Personal data will be stored for the following durations:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Order and reservation data – for the period necessary to complete the service and the period required by tax laws (5 years from the end of the tax year).</li>
                  <li>Contact details (forms) – until the inquiry is resolved and correspondence is closed.</li>
                  <li>Data processed on the basis of legitimate interest – until a successful objection is lodged.</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h2 className="text-lg font-serif font-bold text-foreground">
                  6. Rights of Data Subjects
                </h2>
                <p>You have the right to:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Access your personal data and obtain a copy of it</li>
                  <li>Rectify (correct) incorrect data</li>
                  <li>Erase data (&quot;right to be forgotten&quot;), provided there are no other legal bases for processing</li>
                  <li>Restrict the processing of data</li>
                  <li>Transfer your data to another controller</li>
                  <li>Object to data processing based on the Controller&apos;s legitimate interest</li>
                  <li>Lodge a complaint with a supervisory authority – President of the Personal Data Protection Office (PUODO), ul. Stawki 2, 00-193 Warsaw, Poland.</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h2 className="text-lg font-serif font-bold text-foreground">
                  7. Automated Decision-Making and Profiling
                </h2>
                <p>
                  Your personal data will not be subjected to automated decision-making, including profiling, that produces legal effects or similarly affects you.
                </p>
              </section>
            </>
          )}
        </div>
      </SectionContainer>
    </PageTransition>
  );
}
