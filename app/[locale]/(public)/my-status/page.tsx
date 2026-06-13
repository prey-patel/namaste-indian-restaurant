import { getTranslations, setRequestLocale } from 'next-intl/server';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function MyStatusPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('nav');

  return (
    <div className="container mx-auto px-4 py-16 flex-1 flex flex-col justify-center items-center">
      <div className="max-w-2xl text-center space-y-6">
        <h1 className="text-3xl sm:text-5xl font-serif font-bold text-primary">{t('status')}</h1>
        <p className="text-muted-foreground leading-relaxed">
          Monitorowanie statusu rezerwacji oraz zamówień dostawy/odbioru. Bezpieczne wyszukiwanie za pomocą unikalnego tokena bez konieczności logowania klienta zostanie wdrożone w Fazie 6 i Fazie 8.
        </p>
        <p className="text-sm text-primary/60 italic">
          Reservation and order status tracking interface. Secure token-based lookups without guest logins will be integrated in Phase 6 and Phase 8.
        </p>
      </div>
    </div>
  );
}
