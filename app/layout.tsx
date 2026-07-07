import { ReactNode } from 'react';
import { Playfair_Display, Outfit, Pinyon_Script } from 'next/font/google';
import PwaRegister from '@/components/pwa-register';
import DomSafetyPatch from '@/components/common/dom-safety-patch';
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

const pinyon = Pinyon_Script({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-pinyon',
  display: 'swap',
});

export const metadata = {
  icons: {
    icon: '/icon-192.png',
    shortcut: '/icon-192.png',
    apple: '/icon-192.png',
  },
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
    <html lang="pl" className={`${playfair.variable} ${outfit.variable} ${pinyon.variable} dark`} suppressHydrationWarning>
      <body className="antialiased min-h-screen bg-background text-foreground flex flex-col font-sans" suppressHydrationWarning>
        <DomSafetyPatch />
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:shadow-lg focus:outline-none font-bold text-xs uppercase tracking-wider"
        >
          Skip to main content / Przejdź do treści
        </a>
        <PwaRegister />
        <div id="main-content" className="flex-1 flex flex-col">
          {children}
        </div>
      </body>
    </html>
  );
}

