import { ReactNode } from 'react';
import { Playfair_Display, Outfit, Pinyon_Script } from 'next/font/google';
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
    <html lang="pl" className={`${playfair.variable} ${outfit.variable} ${pinyon.variable} dark`}>
      <body className="antialiased min-h-screen bg-background text-foreground flex flex-col font-sans">
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
