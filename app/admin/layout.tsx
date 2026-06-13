import { ReactNode } from 'react';
import AdminLayoutClient from '@/components/admin/admin-layout-client';
import { NextIntlClientProvider } from 'next-intl';
import plMessages from '@/messages/pl.json';

type Props = {
  children: ReactNode;
};

export const metadata = {
  title: 'Namaste Admin Panel',
  description: 'Namaste Restaurant Admin Panel',
};

export default function AdminLayout({ children }: Props) {
  return (
    <NextIntlClientProvider locale="pl" messages={plMessages}>
      <AdminLayoutClient>
        {children}
      </AdminLayoutClient>
    </NextIntlClientProvider>
  );
}

