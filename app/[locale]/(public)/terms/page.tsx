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
            {isPl ? 'Regulamin Serwisu' : 'Terms of Service'}
          </h1>
          <div className="h-[1px] w-24 bg-primary/30" />
          <p className="text-xs text-muted-foreground">
            {isPl ? `Ostatnia aktualizacja: ${currentDate}` : `Last updated: ${currentDate}`}
          </p>
        </div>

        <div className="space-y-6 text-sm text-muted-foreground leading-relaxed font-light font-sans">
          {isPl ? (
            // Polish Version (Regulamin Serwisu)
            <>
              <section className="space-y-2">
                <h2 className="text-lg font-serif font-bold text-foreground">
                  1. Postanowienia Ogólne
                </h2>
                <p>
                  Niniejszy Regulamin określa zasady korzystania z serwisu internetowego oraz usług gastronomicznych Namaste Indian Restaurant.
                </p>
                <p>
                  Właścicielem i administratorem serwisu jest <strong>LOUNGE AND LUXURY SPÓŁKA Z OGRANICZONĄ ODPOWIEDZIALNOŚCIĄ</strong> z siedzibą pod adresem: ul. Warszawska 1/3, 06-400 Ciechanów, Polska, wpisana do Rejestru Przedsiębiorców Krajowego Rejestru Sądowego pod numerem KRS: <strong>0001236476</strong>, NIP: <strong>5662043347</strong> oraz REGON: <strong>544558643</strong>.
                </p>
                <p>
                  Korzystanie z serwisu i składanie zamówień oznacza akceptację postanowień niniejszego Regulaminu.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-lg font-serif font-bold text-foreground">
                  2. Świadczone Usługi Elektroniczne
                </h2>
                <p>Serwis umożliwia Użytkownikom korzystanie z następujących usług drogą elektroniczną:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Przeglądanie menu restauracji i informacji o lokalu.</li>
                  <li>Składanie zamówień online na wynos (odbiór osobisty) lub z dostawą pod wskazany adres.</li>
                  <li>Dokonywanie rezerwacji stolików online.</li>
                  <li>Zamawianie dań bezpośrednio ze stolika za pomocą dedykowanych kodów QR (Digital Waiter).</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h2 className="text-lg font-serif font-bold text-foreground">
                  3. Składanie Zamówień i Ceny
                </h2>
                <p>
                  Wszystkie ceny podane w serwisie są cenami brutto (zawierają podatek VAT) i są wyrażone w złotych polskich (PLN).
                </p>
                <p>
                  Do zamówień mogą być doliczane dodatkowe opłaty, w tym opłata za dostawę (zależna od strefy dowozu) oraz opłaty opakowaniowe (1.50 PLN za pojemnik na jedzenie, 1.00 PLN za kubek na napój). Pełna i ostateczna cena zamówienia prezentowana jest w podsumowaniu koszyka przed kliknięciem przycisku &quot;Złóż zamówienie&quot;.
                </p>
                <p>
                  Składając zamówienie online, Klient zobowiązuje się do odbioru jedzenia oraz zapłaty ustalonej kwoty zgodnie z wybraną formą płatności (gotówka lub karta płatnicza przy odbiorze / dostawie).
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-lg font-serif font-bold text-foreground">
                  4. Rezerwacje Stolików
                </h2>
                <p>
                  Rezerwacja stolika online za pośrednictwem formularza stanowi zapytanie rezerwacyjne. Rezerwacja staje się wiążąca po otrzymaniu przez Klienta potwierdzenia od managera restauracji drogą e-mailową lub telefoniczną.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-lg font-serif font-bold text-foreground">
                  5. Prawo do odstąpienia od umowy i Reklamacje
                </h2>
                <p>
                  Zgodnie z art. 38 pkt 4 i 12 ustawy z dnia 30 maja 2014 r. o prawach konsumenta, prawo do odstąpienia od umowy zawartej na odległość **nie przysługuje** konsumentowi w odniesieniu do umów, w których przedmiotem świadczenia jest rzecz ulegająca szybkiemu zepsuciu lub mająca krótki termin przydatności do użycia (produkty gastronomiczne, posiłki gotowe).
                </p>
                <p>
                  Wszelkie reklamacje dotyczące jakości posiłków lub dostawy należy zgłaszać telefonicznie pod numerem <strong>511984331</strong> lub mailowo na adres: <a href="mailto:namasteadmin.pl@gmail.com" className="text-primary hover:underline">namasteadmin.pl@gmail.com</a> niezwłocznie po otrzymaniu zamówienia. Reklamacje będą rozpatrywane indywidualnie w terminie 14 dni od ich zgłoszenia.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-lg font-serif font-bold text-foreground">
                  6. Postanowienia Końcowe
                </h2>
                <p>
                  W sprawach nieuregulowanych niniejszym Regulaminem mają zastosowanie odpowiednie przepisy prawa polskiego, w szczególności Kodeksu Cywilnego oraz Ustawy o prawach konsumenta.
                </p>
              </section>
            </>
          ) : (
            // English Version (Terms of Service)
            <>
              <section className="space-y-2">
                <h2 className="text-lg font-serif font-bold text-foreground">
                  1. General Provisions
                </h2>
                <p>
                  These Terms of Service define the rules for using the website and food delivery/takeaway services of Namaste Indian Restaurant.
                </p>
                <p>
                  The website is owned and operated by <strong>LOUNGE AND LUXURY SPÓŁKA Z OGRANICZONĄ ODPOWIEDZIALNOŚCIĄ</strong> with its registered office at: ul. Warszawska 1/3, 06-400 Ciechanów, Poland, registered under KRS: <strong>0001236476</strong>, NIP: <strong>5662043347</strong>, and REGON: <strong>544558643</strong>.
                </p>
                <p>
                  Using our website and submitting food orders indicates full acceptance of these Terms of Service.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-lg font-serif font-bold text-foreground">
                  2. Provided Electronic Services
                </h2>
                <p>The website enables users to access the following services online:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Browse restaurant menu, details, and opening hours.</li>
                  <li>Submit food orders for takeaway (pickup) or delivery under a specified address.</li>
                  <li>Submit online requests for table reservations.</li>
                  <li>Order dishes directly from a table inside the restaurant using QR codes (Digital Waiter).</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h2 className="text-lg font-serif font-bold text-foreground">
                  3. Ordering Process and Pricing
                </h2>
                <p>
                  All prices listed on the website are gross prices (inclusive of VAT) and are expressed in Polish Zloty (PLN).
                </p>
                <p>
                  Orders may be subject to additional fees, including a delivery fee (based on the delivery zone) and packaging fees (1.50 PLN per food container, 1.00 PLN per beverage cup). The total cost is clearly shown at checkout before you submit the order.
                </p>
                <p>
                  By submitting an order, the customer commits to receiving the food and paying the total cost using the chosen payment method (cash or card on pickup or delivery).
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-lg font-serif font-bold text-foreground">
                  4. Table Reservations
                </h2>
                <p>
                  Table booking requests made online are pending. A reservation is officially confirmed only when the customer receives a confirmation email or call from the restaurant manager.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-lg font-serif font-bold text-foreground">
                  5. Right to Withdraw and Complaints
                </h2>
                <p>
                  In accordance with Article 38 of the Polish Consumer Rights Act, the right to withdraw from a distance contract **does not apply** to contracts where the subject of service is food or items subject to rapid deterioration or having a short shelf-life (gastronomic meals).
                </p>
                <p>
                  Any quality or delivery complaints must be reported immediately upon receipt of the order by phone at <strong>511984331</strong> or via email: <a href="mailto:namasteadmin.pl@gmail.com" className="text-primary hover:underline">namasteadmin.pl@gmail.com</a>. Complaints are processed within 14 days of filing.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-lg font-serif font-bold text-foreground">
                  6. Final Provisions
                </h2>
                <p>
                  For matters not covered by these Terms, the provisions of Polish law, including the Polish Civil Code and the Consumer Rights Act, shall apply.
                </p>
              </section>
            </>
          )}
        </div>
      </SectionContainer>
    </PageTransition>
  );
}
