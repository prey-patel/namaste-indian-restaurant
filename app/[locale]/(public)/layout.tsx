import { ReactNode } from 'react';
import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';

type Props = {
  children: ReactNode;
};

export default function PublicLayout({ children }: Props) {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 flex flex-col">
        {children}
      </main>
      <Footer />
    </div>
  );
}
