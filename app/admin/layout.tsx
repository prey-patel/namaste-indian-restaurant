import { ReactNode } from 'react';
import AdminLayoutClient from '@/components/admin/admin-layout-client';
import { NextIntlClientProvider } from 'next-intl';
import plMessages from '@/messages/pl.json';
import enMessages from '@/messages/en.json';
import { cookies } from 'next/headers';

type Props = {
  children: ReactNode;
};

export const metadata = {
  title: 'Namaste Admin Panel',
  description: 'Namaste Restaurant Admin Panel',
};

export default async function AdminLayout({ children }: Props) {
  const cookieStore = await cookies();
  const locale = cookieStore.get('NEXT_LOCALE')?.value || 'pl';
  const messages = locale === 'en' ? enMessages : plMessages;

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <AdminLayoutClient>
        {children}
      </AdminLayoutClient>
    </NextIntlClientProvider>
  );
}


