import { ReactNode } from 'react';
import { Playfair_Display, Outfit } from 'next/font/google';
import PwaRegister from '@/components/pwa-register';
import './globals.css';

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
});

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
});

export const metadata = {
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Namaste Admin',
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport = {
  themeColor: '#d4af37',
};

type Props = {
  children: ReactNode;
};

export default function RootLayout({ children }: Props) {
  return (
    <html lang="pl" className={`${playfair.variable} ${outfit.variable} dark`}>
      <body className="antialiased min-h-screen bg-background text-foreground flex flex-col font-sans">
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
