'use client';

import React from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { Link } from '@/i18n/routing';
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
  dineInStatus?: any;
  deliveryStatus?: any;
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
  dineInStatus,
  deliveryStatus,
}: HeroSectionProps) {
  const tHome = useTranslations('home');
  const tHours = useTranslations('openingHours');

  // Mouse Parallax for Background Glows and Mandalas
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springX = useSpring(mouseX, { stiffness: 80, damping: 20 });
  const springY = useSpring(mouseY, { stiffness: 80, damping: 20 });

  // Map mouse movement to subtle translations
  const parallaxX = useTransform(springX, [-0.5, 0.5], [-20, 20]);
  const parallaxY = useTransform(springY, [-0.5, 0.5], [-20, 20]);
  const parallaxRotate = useTransform(springX, [-0.5, 0.5], [-5, 5]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (typeof window !== 'undefined') {
      const relativeX = e.clientX / window.innerWidth - 0.5;
      const relativeY = e.clientY / window.innerHeight - 0.5;
      mouseX.set(relativeX);
      mouseY.set(relativeY);
    }
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  // Determine if open now
  const isOpenNow = dineInStatus?.isOpen || deliveryStatus?.isOpen || false;
  const dineInHoursText = dineInStatus?.hoursText || '12:00 - 22:00';
  const deliveryHoursText = deliveryStatus?.hoursText || '12:00 - 21:30';

  return (
    <section
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative min-h-screen bg-[#040815] text-center overflow-hidden flex flex-col justify-center items-center px-6 sm:px-12 pt-32 pb-16 select-none"
    >
      {/* 3D PARALLAX BACKGROUND GLOWS */}
      <motion.div
        style={{
          x: parallaxX,
          y: parallaxY,
        }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] sm:w-[700px] h-[350px] sm:h-[700px] bg-[radial-gradient(circle,rgba(212,175,55,0.06)_0%,rgba(141,37,37,0.03)_50%,transparent_100%)] rounded-full blur-[100px] pointer-events-none"
      />

      <motion.div
        style={{
          x: useTransform(parallaxX, (v) => -v),
          y: useTransform(parallaxY, (v) => -v),
        }}
        className="absolute top-1/3 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[250px] sm:w-[500px] h-[250px] sm:h-[500px] bg-[radial-gradient(circle,rgba(212,175,55,0.04)_0%,transparent_80%)] rounded-full blur-[80px] pointer-events-none"
      />

      {/* Floating background mandalas with scroll & hover rotation */}
      <motion.div
        style={{
          x: parallaxX,
          y: parallaxY,
          rotate: parallaxRotate,
        }}
        className="absolute -right-20 -top-20 w-[550px] h-[550px] opacity-[0.015] pointer-events-none"
      >
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
      </motion.div>

      {/* Alert Banner if present */}
      {alertBanner && (
        <div className="absolute top-4 left-0 right-0 flex justify-center px-4 z-20">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-primary/20 border border-primary/50 text-primary-foreground text-xs py-2 px-6 rounded-full backdrop-blur-md shadow-lg"
          >
            {alertBanner}
          </motion.div>
        </div>
      )}

      {/* HERO CONTENT CONTAINER */}
      <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col justify-center items-center relative z-10 space-y-8 my-auto">
        
        {/* Subtitle / Philosophy strip */}
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="flex items-center justify-center space-x-2 text-primary"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          <span className="text-[10px] md:text-xs font-sans tracking-[0.25em] font-extrabold uppercase text-primary/95">
            {tHome('heroSubtitle')}
          </span>
        </motion.div>

        {/* Serif Headline Reveal */}
        <h1 className="text-4xl sm:text-6xl md:text-[70px] lg:text-[76px] font-serif font-medium tracking-normal text-foreground leading-[1.12] max-w-3xl mx-auto">
          <motion.span
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15 }}
            className="block"
          >
            {tHome('heroTitle')}
          </motion.span>
          <motion.span
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="text-primary italic block mt-1 font-light"
          >
            {tHome('heroTitleAccent')}
          </motion.span>
          <motion.span
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.45 }}
            className="block"
          >
            {tHome('heroTitleEnd')}
          </motion.span>
        </h1>

        {/* Elegant Graphic Divider */}
        <motion.div
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ duration: 1, delay: 0.6, ease: 'easeOut' }}
          className="flex items-center justify-center space-x-4 w-full max-w-lg mx-auto py-2"
        >
          <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-primary/45" />
          <div className="flex items-center space-x-3 text-primary/75">
            {/* Bowl / Saucer */}
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 12h18M5 12v3a5 5 0 0 0 5 5h4a5 5 0 0 0 5-5v-3M9 8h6M12 4v4" />
            </svg>
            {/* Starburst */}
            <svg className="w-4 h-4 text-primary animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 2L15 9L22 12L15 15L12 22L9 15L2 12L9 9Z" fill="currentColor" fillOpacity="0.15" />
            </svg>
            {/* Spice Leaf */}
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 3c-1.5 2-2 3.5-3.1 9.2A7 7 0 0 1 11 20z" />
            </svg>
          </div>
          <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-primary/45" />
        </motion.div>

        {/* Narrative Description */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.7 }}
          className="text-muted-foreground/90 max-w-2xl mx-auto text-sm sm:text-base md:text-lg leading-relaxed font-light font-sans"
        >
          {tHome('heroSubhead')}
        </motion.p>

        {/* Action Buttons Row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.85 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-4 w-full"
        >
          {/* Order Online (Pill Gold Button) */}
          <Link href={ROUTES.order} className="w-full sm:w-auto">
            <motion.button
              whileHover={{ scale: 1.04, backgroundColor: '#c89243' }}
              whileTap={{ scale: 0.98 }}
              className="w-full sm:w-auto px-8 py-4.5 rounded-full bg-primary text-black font-extrabold text-xs uppercase tracking-widest transition-all duration-300 shadow-lg hover:shadow-primary/20 font-sans"
            >
              {tHome('heroOrderOnline')}
            </motion.button>
          </Link>

          {/* Reserve Table (Pill Outline Button) */}
          <Link href={ROUTES.reservations} className="w-full sm:w-auto">
            <motion.button
              whileHover={{ scale: 1.04, backgroundColor: 'rgba(212,175,55,0.06)', borderColor: 'rgba(212,175,55,0.8)' }}
              whileTap={{ scale: 0.98 }}
              className="w-full sm:w-auto px-8 py-4.5 rounded-full border border-primary/30 text-primary font-bold text-xs uppercase tracking-widest transition-all duration-300 font-sans"
            >
              {tHome('heroReserveTable')}
            </motion.button>
          </Link>

          {/* View Menu (Text Link with Arrow) */}
          <Link href={ROUTES.menu} className="text-primary hover:text-primary/80 font-bold text-xs uppercase tracking-widest flex items-center gap-1.5 transition-all duration-300 font-sans py-2.5">
            <span>{tHome('heroViewMenu')}</span>
          </Link>
        </motion.div>

        {/* Dynamic Opening Hours status strip */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1 }}
          className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs md:text-sm text-muted-foreground/60 pt-6 border-t border-primary/10 w-full max-w-2xl mx-auto font-sans"
        >
          {/* Status Indicator Dot */}
          <span className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isOpenNow ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            <span className="font-bold text-foreground/80">
              {isOpenNow ? tHours('openNow') : tHours('closedNow')}
            </span>
          </span>
          
          <span className="hidden sm:inline text-primary/30">|</span>

          {/* Dine-In Hours */}
          <span>
            {tHours('dineIn')}: <span className="font-mono text-foreground/75 font-semibold">{dineInHoursText}</span>
          </span>

          <span className="hidden sm:inline text-primary/30">|</span>

          {/* Delivery Hours */}
          <span>
            {tHours('delivery')}: <span className="font-mono text-foreground/75 font-semibold">{deliveryHoursText}</span>
          </span>

          <span className="hidden sm:inline text-primary/30">|</span>

          {/* Full weekly hours link */}
          <Link href={ROUTES.contact} className="underline text-primary/75 hover:text-primary font-semibold">
            {tHours('viewFullWeeklyHours')}
          </Link>
        </motion.div>

      </div>
    </section>
  );
}
