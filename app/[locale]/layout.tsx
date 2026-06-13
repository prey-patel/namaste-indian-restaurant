import {notFound} from 'next/navigation';
import {getMessages, setRequestLocale} from 'next-intl/server';
import {ReactNode} from 'react';
import {routing} from '@/i18n/routing';
import {NextIntlClientProvider} from 'next-intl';

type Props = {
  children: ReactNode;
  params: Promise<{locale: string}>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({locale}));
}

export default async function LocaleLayout({children, params}: Props) {
  const {locale} = await params;

  // Validate that the incoming locale parameter is either 'pl' or 'en'
  if (!routing.locales.includes(locale as any)) {
    notFound();
  }

  // Set request locale for server caching
  setRequestLocale(locale);

  // Load the parsed dictionary messages
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
