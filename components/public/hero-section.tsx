'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { ROUTES } from '@/lib/routes/path';
import { useTranslations } from 'next-intl';

type HeroSectionProps = {
  heroTitle: string;
  heroTitleAccent: string;
  heroSubhead: string;
  welcomeMessage: string;
  alertBanner?: string | null;
  address: string;
  phone: string;
  orderOnlineText: string;
  reserveTableText: string;
  viewMenuText: string;
  locale: string;
  todaysHoursCard?: React.ReactNode;
};

export default function HeroSection({
  heroTitle,
  heroTitleAccent,
  heroSubhead,
  welcomeMessage,
  alertBanner,
  address,
  phone,
  orderOnlineText,
  reserveTableText,
  viewMenuText,
  locale,
  todaysHoursCard,
}: HeroSectionProps) {
  const tHome = useTranslations('home');
  
  // Format address: remove "Poland" or ", Poland" and prepend "ul. " if not present
  let formattedAddress = address;
  formattedAddress = formattedAddress.replace(/,\s*Poland/i, '').replace(/\s*Poland/i, '').trim();
  if (!formattedAddress.toLowerCase().startsWith('ul.')) {
    formattedAddress = `ul. ${formattedAddress}`;
  }

  // Format phone: e.g. 511984331 -> +48 511 984 331
  const formatPhone = (phoneStr: string) => {
    const digits = phoneStr.replace(/\D/g, '');
    if (digits.length === 9) {
      return `+48 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
    } else if (digits.length === 11 && digits.startsWith('48')) {
      return `+48 ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
    } else if (digits.length === 12 && digits.startsWith('0048')) {
      return `+48 ${digits.slice(4, 7)} ${digits.slice(7, 10)} ${digits.slice(10)}`;
    }
    return phoneStr.startsWith('+') ? phoneStr : `+48 ${phoneStr}`;
  };

  const formattedPhone = formatPhone(phone);

  const splitText = (text: string, baseDelay = 0) => {
    return text.split(' ').map((word, i) => (
      <span key={i} className="inline-block overflow-hidden mr-[0.25em] pb-1.5 align-bottom">
        <motion.span
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: i * 0.06 + baseDelay, ease: [0.16, 1, 0.3, 1] }}
          className="inline-block"
        >
          {word}
        </motion.span>
      </span>
    ));
  };

  return (
    <section className="relative min-h-[90vh] lg:min-h-screen bg-[#040815] text-left overflow-hidden flex flex-col justify-between px-6 sm:px-12 pt-32 pb-12 select-none">
      
      {/* Background mandala decoration */}
      <div className="absolute -right-20 -top-20 w-[600px] h-[600px] opacity-[0.02] pointer-events-none">
        <svg viewBox="0 0 100 100" className="w-full h-full text-primary fill-none stroke-current" strokeWidth="0.3">
          <circle cx="50" cy="50" r="45" />
          <circle cx="50" cy="50" r="35" />
          <circle cx="50" cy="50" r="25" />
          {Array.from({ length: 36 }).map((_, i) => (
            <path
              key={i}
              d={`M 50 50 L ${50 + 45 * Math.cos((i * Math.PI) / 18)} ${50 + 45 * Math.sin((i * Math.PI) / 18)}`}
            />
          ))}
        </svg>
      </div>

      {/* Subtle background glow */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[300px] sm:w-[600px] h-[300px] sm:h-[600px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Alert Banner if present in system settings */}
      {alertBanner && (
        <div className="absolute top-4 left-0 right-0 flex justify-center px-4 z-20">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-primary/20 border border-primary/50 text-primary-foreground text-xs py-2 px-6 rounded-full backdrop-blur-md shadow-lg animate-pulse"
          >
            {alertBanner}
          </motion.div>
        </div>
      )}

      <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col justify-between relative z-10">
        
        {/* Main Columns Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center my-auto">
          
          {/* Left Column: Text & CTAs */}
          <div className="lg:col-span-7 space-y-6 sm:space-y-8">
            
            {/* Authenticity Badge */}
            <motion.div
              initial={{ opacity: 0, x: -25 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="flex items-center space-x-2 text-primary"
            >
              <svg className="w-4 h-4 text-primary animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 2l2.4 4.8 5.3.8-3.8 3.7.9 5.3-4.8-2.5-4.8 2.5.9-5.3-3.8-3.7 5.3-.8z" fill="currentColor" />
              </svg>
              <span className="text-[10px] sm:text-xs font-sans tracking-[0.25em] font-extrabold uppercase text-primary/95">
                {locale === 'pl' ? 'AUTENTYCZNA KUCHNIA INDYJSKA' : 'AUTHENTIC INDIAN CUISINE'}
              </span>
            </motion.div>

            {/* Main Headline */}
            <div className="space-y-4">
              <h1 className="text-4xl sm:text-6xl md:text-[62px] font-serif font-medium tracking-wide text-foreground leading-[1.12]">
                {splitText(heroTitle, 0.1)} <br />
                <span className="text-primary block mt-1 font-light italic">
                  {splitText(heroTitleAccent, 0.45)}
                </span>
              </h1>

              {/* Gold divider line with diamond/star ornament - placed directly below the headline */}
              <motion.div
                initial={{ opacity: 0, scaleX: 0 }}
                animate={{ opacity: 1, scaleX: 1 }}
                transition={{ duration: 0.8, delay: 0.7, ease: 'easeOut' }}
                className="flex items-center space-x-3 py-2 origin-left"
              >
                <div className="w-20 h-[1px] bg-gradient-to-r from-primary/60 to-transparent" />
                <svg className="w-3.5 h-3.5 text-primary rotate-45 fill-primary/10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="5" y="5" width="14" height="14" />
                </svg>
                <div className="w-20 h-[1px] bg-gradient-to-l from-primary/60 to-transparent" />
              </motion.div>
            </div>

            {/* Subtext */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
              className="text-muted-foreground/90 max-w-xl text-sm sm:text-base leading-relaxed font-light font-sans"
            >
              {heroSubhead}
            </motion.p>

            {/* Buttons Row */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.95 }}
              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2"
            >
              {/* Order Online (Filled Gold) */}
              <Link href={ROUTES.order} className="w-full sm:w-auto">
                <motion.button 
                  whileHover={{ scale: 1.03, boxShadow: '0 8px 30px rgba(212,175,55,0.45)' }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full sm:w-auto px-8 py-4.5 rounded bg-primary hover:bg-primary/95 text-black font-extrabold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2.5 font-sans"
                >
                  <svg className="w-4 h-4 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M12 2l2.4 4.8 5.3.8-3.8 3.7.9 5.3-4.8-2.5-4.8 2.5.9-5.3-3.8-3.7 5.3-.8z" fill="currentColor" />
                  </svg>
                  {orderOnlineText}
                </motion.button>
              </Link>

              {/* Reserve Table (Outline) */}
              <Link href={ROUTES.reservations} className="w-full sm:w-auto">
                <motion.button 
                  whileHover={{ scale: 1.03, backgroundColor: 'rgba(212,175,55,0.06)' }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full sm:w-auto px-8 py-4.5 rounded border border-primary/30 hover:border-primary/80 hover:bg-primary/5 text-primary font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2.5 font-sans"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  {reserveTableText}
                </motion.button>
              </Link>

              {/* View Menu (Outline) */}
              <Link href={ROUTES.menu} className="w-full sm:w-auto">
                <motion.button 
                  whileHover={{ scale: 1.03, backgroundColor: 'rgba(212,175,55,0.06)' }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full sm:w-auto px-8 py-4.5 rounded border border-primary/30 hover:border-primary/80 hover:bg-primary/5 text-primary font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2.5 font-sans"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                    <path d="M6.5 20.5H20" />
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                  </svg>
                  {viewMenuText}
                </motion.button>
              </Link>
            </motion.div>

            {/* Stats Row */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 1.1 }}
              className="grid grid-cols-3 gap-4 pt-6 border-t border-primary/10 max-w-xl text-left font-sans"
            >
              <div className="space-y-1">
                <span className="text-xl sm:text-2xl font-serif font-bold text-primary block">5 ★</span>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground/80 block font-semibold">
                  {tHome('heroQuality' as any)}
                </span>
                <span className="text-[9px] text-muted-foreground/50 block font-light leading-tight">
                  {tHome('heroQualityDesc' as any)}
                </span>
              </div>
              <div className="space-y-1 border-l border-primary/10 pl-4">
                <span className="text-xl sm:text-2xl font-serif font-bold text-primary block">100%</span>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground/80 block font-semibold">
                  {tHome('heroAroma' as any)}
                </span>
                <span className="text-[9px] text-muted-foreground/50 block font-light leading-tight">
                  {tHome('heroAromaDesc' as any)}
                </span>
              </div>
              <div className="space-y-1 border-l border-primary/10 pl-4">
                <span className="text-xl sm:text-2xl font-serif font-bold text-primary block">
                  {locale === 'pl' ? 'Kuchnia' : 'Artisans'}
                </span>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground/80 block font-semibold">
                  {tHome('heroService' as any)}
                </span>
                <span className="text-[9px] text-muted-foreground/50 block font-light leading-tight">
                  {tHome('heroServiceDesc' as any)}
                </span>
              </div>
            </motion.div>

          </div>

          {/* Right Column: Today's Hours Card & Dish Image stack */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, type: 'spring', stiffness: 50, damping: 15, delay: 0.45 }}
            className="lg:col-span-5 flex flex-col items-center justify-center gap-6 w-full"
          >
            {todaysHoursCard}
            
            <div className="relative w-[340px] h-[340px] hidden lg:block select-none mt-4">
              {/* Rotating background mandala */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 50, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-0 w-full h-full opacity-[0.08] flex items-center justify-center pointer-events-none text-primary"
              >
                <svg viewBox="0 0 100 100" className="w-full h-full stroke-current fill-none" strokeWidth="0.3">
                  <circle cx="50" cy="50" r="45" />
                  <circle cx="50" cy="50" r="35" />
                  <circle cx="50" cy="50" r="25" />
                  {Array.from({ length: 36 }).map((_, i) => (
                    <path
                      key={i}
                      d={`M 50 50 L ${50 + 45 * Math.cos((i * Math.PI) / 18)} ${50 + 45 * Math.sin((i * Math.PI) / 18)}`}
                    />
                  ))}
                </svg>
              </motion.div>

              {/* Floating food image */}
              <motion.div
                animate={{ y: [0, -14, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                className="relative w-full h-full cursor-grab active:cursor-grabbing"
                whileHover={{ scale: 1.05 }}
              >
                <Image
                  src="/images/hero_kebabs.png"
                  alt="Signature Kebabs"
                  fill
                  priority
                  className="object-contain filter drop-shadow-[0_15px_35px_rgba(212,175,55,0.25)]"
                />
              </motion.div>
            </div>
          </motion.div>

        </div>

        {/* Divider Line with Diamond/Star Ornament */}
        <div className="relative flex items-center justify-center my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
          </div>
          <div className="relative bg-[#040815] px-4 flex items-center space-x-1 text-primary/60">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 2L15 12L12 22L9 12Z" fill="currentColor" fillOpacity="0.2" />
            </svg>
          </div>
        </div>

        {/* Bottom Info Strip - 3 Columns (Omitted Opening Hours) */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.25 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs sm:text-sm pt-2"
        >
          {/* Location */}
          <div className="flex items-start space-x-4 p-1 md:border-r md:border-primary/20 md:pr-6 text-left">
            {/* Octagonal Icon Frame */}
            <div className="flex-shrink-0 relative w-11 h-11 flex items-center justify-center text-primary">
              <svg className="absolute inset-0 w-full h-full text-primary/20 fill-primary/5 stroke-current" strokeWidth="1" viewBox="0 0 100 100">
                <polygon points="30,10 70,10 90,30 90,70 70,90 30,90 10,70 10,30" />
              </svg>
              <svg className="w-5 h-5 relative z-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 2l2.4 4.8 5.3.8-3.8 3.7.9 5.3-4.8-2.5-4.8 2.5.9-5.3-3.8-3.7 5.3-.8z" fill="currentColor" fillOpacity="0.1" />
                <circle cx="12" cy="12" r="1.5" fill="currentColor" />
              </svg>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] uppercase tracking-[0.2em] text-primary font-bold block font-sans">
                {locale === 'pl' ? 'LOKALIZACJA' : 'LOCATION'}
              </span>
              <span className="text-muted-foreground/80 font-light block leading-relaxed whitespace-pre-line font-sans">
                {formattedAddress}
              </span>
            </div>
          </div>

          {/* Dine-In • Takeaway • Delivery */}
          <div className="flex items-start space-x-4 p-1 md:border-r md:border-primary/20 md:px-6 text-left">
            {/* Octagonal Icon Frame */}
            <div className="flex-shrink-0 relative w-11 h-11 flex items-center justify-center text-primary">
              <svg className="absolute inset-0 w-full h-full text-primary/20 fill-primary/5 stroke-current" strokeWidth="1" viewBox="0 0 100 100">
                <polygon points="30,10 70,10 90,30 90,70 70,90 30,90 10,70 10,30" />
              </svg>
              <svg className="w-5 h-5 relative z-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 22h18M5 18a7 7 0 0 1 14 0M12 2v2M12 4a3 3 0 0 0-3 3h6a3 3 0 0 0-3-3z" />
              </svg>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] uppercase tracking-[0.2em] text-primary font-bold block font-sans">
                DINE-IN • TAKEAWAY • DELIVERY
              </span>
              <span className="text-muted-foreground/80 font-light block leading-relaxed font-sans">
                {locale === 'pl' ? 'Wybierz swój ulubiony sposób na delektowanie się Namaste' : 'Choose your favourite way to enjoy Namaste'}
              </span>
            </div>
          </div>

          {/* Call Us */}
          <div className="flex items-start space-x-4 p-1 md:pl-6 text-left">
            {/* Octagonal Icon Frame */}
            <div className="flex-shrink-0 relative w-11 h-11 flex items-center justify-center text-primary">
              <svg className="absolute inset-0 w-full h-full text-primary/20 fill-primary/5 stroke-current" strokeWidth="1" viewBox="0 0 100 100">
                <polygon points="30,10 70,10 90,30 90,70 70,90 30,90 10,70 10,30" />
              </svg>
              <svg className="w-5 h-5 relative z-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] uppercase tracking-[0.2em] text-primary font-bold block font-sans">
                {locale === 'pl' ? 'ZADZWOŃ DO NAS' : 'CALL US'}
              </span>
              <span className="text-muted-foreground font-bold font-mono block text-sm sm:text-base tracking-wider">
                {formattedPhone}
              </span>
            </div>
          </div>

        </motion.div>

        {/* Bottom divider ornament */}
        <div className="relative flex items-center justify-center mt-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-primary/25 to-transparent" />
          </div>
          <div className="relative bg-[#040815] px-4">
            <svg className="w-3 h-3 text-primary/50 animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 6L14.5 12L12 18L9.5 12Z" fill="currentColor" />
            </svg>
          </div>
        </div>

      </div>
    </section>
  );
}
