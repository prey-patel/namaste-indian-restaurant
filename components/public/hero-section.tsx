'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { ROUTES } from '@/lib/routes/path';

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
}: HeroSectionProps) {
  
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
              className="flex items-center space-x-2.5 text-primary"
            >
              {/* Gold flower/star ornament */}
              <svg className="w-5 h-5 animate-spin-slow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 2l2.4 4.8 5.3.8-3.8 3.7.9 5.3-4.8-2.5-4.8 2.5.9-5.3-3.8-3.7 5.3-.8z" />
              </svg>
              <span className="text-[10px] sm:text-xs font-sans tracking-[0.3em] font-extrabold uppercase">
                {locale === 'pl' ? 'Autentyczna Kuchnia Indyjska' : 'Authentic Indian Cuisine'}
              </span>
            </motion.div>

            {/* Main Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="text-4xl sm:text-6xl md:text-7xl font-serif font-black tracking-wide text-foreground leading-[1.12]"
            >
              {heroTitle} <br />
              <span className="text-primary block mt-1">
                {heroTitleAccent}
              </span>
            </motion.h1>

            {/* Subtext */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-muted-foreground/85 max-w-xl text-xs sm:text-base md:text-lg leading-relaxed font-light font-sans"
            >
              {heroSubhead}
            </motion.p>

            {/* Buttons Row */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2"
            >
              {/* Order Online (Filled Gold) */}
              <Link href={ROUTES.order}>
                <button className="w-full sm:w-auto px-7 py-4 rounded bg-primary hover:bg-primary/95 text-black font-extrabold text-xs uppercase tracking-widest transition-all shadow-[0_4px_16px_rgba(212,175,55,0.25)] flex items-center justify-center gap-2.5">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2l2 4 4.5.5-3.2 3.2.7 4.5-4-2.2-4 2.2.7-4.5-3.2-3.2 4.5-.5z" />
                  </svg>
                  {orderOnlineText}
                </button>
              </Link>

              {/* Reserve Table (Outline) */}
              <Link href={ROUTES.reservations}>
                <button className="w-full sm:w-auto px-7 py-4 rounded border border-primary/30 hover:border-primary/60 hover:bg-primary/5 text-primary font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2.5">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  {reserveTableText}
                </button>
              </Link>

              {/* View Menu (Outline) */}
              <Link href={ROUTES.menu}>
                <button className="w-full sm:w-auto px-7 py-4 rounded border border-primary/30 hover:border-primary/60 hover:bg-primary/5 text-primary font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2.5">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                  </svg>
                  {viewMenuText}
                </button>
              </Link>
            </motion.div>

          </div>

          {/* Right Column: Dish Image inside Arch Frame */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, type: 'spring', stiffness: 50, damping: 15 }}
            className="lg:col-span-5 relative flex items-center justify-center"
          >
            <div className="relative w-[340px] h-[340px] sm:w-[450px] sm:h-[450px] md:w-[500px] md:h-[500px] transition-all duration-300">
              <Image
                src="/images/hero_kebabs.png"
                alt="Signature Kebabs"
                fill
                priority
                className="object-contain filter drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)]"
              />
            </div>
          </motion.div>

        </div>

        {/* Divider Line */}
        <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-primary/20 to-transparent my-6" />

        {/* Bottom Info Strip - 3 Columns (Omitted Opening Hours) */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs sm:text-sm pt-2"
        >
          {/* Location */}
          <div className="flex items-start space-x-3.5 p-1">
            <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full border border-primary/20 bg-primary/5 text-primary">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            </div>
            <div className="space-y-0.5">
              <span className="text-[9px] uppercase tracking-[0.2em] text-primary font-extrabold block">
                {locale === 'pl' ? 'Lokalizacja' : 'Location'}
              </span>
              <span className="text-muted-foreground/80 font-light block">
                {address}
              </span>
            </div>
          </div>

          {/* Dine-In • Takeaway • Delivery */}
          <div className="flex items-start space-x-3.5 p-1 md:border-x md:border-primary/10 px-4">
            <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full border border-primary/20 bg-primary/5 text-primary">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 22h18M5 18a7 7 0 0 1 14 0M12 2v2M12 4a3 3 0 0 0-3 3h6a3 3 0 0 0-3-3z" />
              </svg>
            </div>
            <div className="space-y-0.5">
              <span className="text-[9px] uppercase tracking-[0.2em] text-primary font-extrabold block">
                Dine-in • Takeaway • Delivery
              </span>
              <span className="text-muted-foreground/80 font-light block">
                {locale === 'pl' ? 'Wybierz swój ulubiony sposób na delektowanie się Namaste' : 'Choose your favourite way to enjoy Namaste'}
              </span>
            </div>
          </div>

          {/* Call Us */}
          <div className="flex items-start space-x-3.5 p-1">
            <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full border border-primary/20 bg-primary/5 text-primary">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
            </div>
            <div className="space-y-0.5">
              <span className="text-[9px] uppercase tracking-[0.2em] text-primary font-extrabold block">
                {locale === 'pl' ? 'Zadzwoń do nas' : 'Call Us'}
              </span>
              <span className="text-muted-foreground font-bold font-mono block">
                {phone}
              </span>
            </div>
          </div>

        </motion.div>

      </div>
    </section>
  );
}
