'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Link } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import LanguageSwitcher from '../public/language-switcher';
import { ROUTES } from '@/lib/routes/path';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

export default function Header() {
  const t = useTranslations('nav');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const shouldReduceMotion = useReducedMotion();
  const drawerRef = useRef<HTMLDivElement>(null);
  const toggleButtonRef = useRef<HTMLButtonElement>(null);

  // Close drawer on window Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isDrawerOpen) {
        setIsDrawerOpen(false);
        toggleButtonRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDrawerOpen]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isDrawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isDrawerOpen]);

  // Focus trap / focus management inside the drawer
  useEffect(() => {
    if (!isDrawerOpen) return;

    const focusableElements = drawerRef.current?.querySelectorAll(
      'a[href], button:not([disabled]), [tabindex="0"]'
    ) as NodeListOf<HTMLElement>;

    if (focusableElements && focusableElements.length > 0) {
      // Focus the close button or first element inside the drawer
      focusableElements[0].focus();

      const handleTabKey = (e: KeyboardEvent) => {
        if (e.key !== 'Tab') return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          // If Shift + Tab and focused on first element, wrap to last
          if (document.activeElement === firstElement) {
            lastElement.focus();
            e.preventDefault();
          }
        } else {
          // If Tab and focused on last element, wrap to first
          if (document.activeElement === lastElement) {
            firstElement.focus();
            e.preventDefault();
          }
        }
      };

      window.addEventListener('keydown', handleTabKey);
      return () => window.removeEventListener('keydown', handleTabKey);
    }
  }, [isDrawerOpen]);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-primary/20 bg-background/85 backdrop-blur-md">
      <div className="container mx-auto px-4 h-20 flex items-center justify-between">
        
        {/* Brand Logo with Premium Serif Styling */}
        <Link href={ROUTES.home} className="flex flex-col group focus-visible:ring-2 focus-visible:ring-primary rounded p-1">
          <span className="text-2xl font-serif font-bold tracking-widest text-primary leading-tight group-hover:brightness-110 transition-all">
            NAMASTE
          </span>
          <span className="text-[9px] tracking-[0.25em] text-muted-foreground font-sans font-medium uppercase group-hover:text-foreground transition-all">
            Indian Restaurant
          </span>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center space-x-8" aria-label="Główne menu / Main Menu">
          <Link href={ROUTES.home} className="text-xs uppercase tracking-widest font-sans font-bold hover:text-primary transition-colors duration-300">
            {t('home')}
          </Link>
          <Link href={ROUTES.menu} className="text-xs uppercase tracking-widest font-sans font-bold hover:text-primary transition-colors duration-300">
            {t('menu')}
          </Link>
          <Link href={ROUTES.reservations} className="text-xs uppercase tracking-widest font-sans font-bold hover:text-primary transition-colors duration-300">
            {t('reservations')}
          </Link>
          <Link href={ROUTES.story} className="text-xs uppercase tracking-widest font-sans font-bold hover:text-primary transition-colors duration-300">
            {t('story')}
          </Link>
          <Link href={ROUTES.contact} className="text-xs uppercase tracking-widest font-sans font-bold hover:text-primary transition-colors duration-300">
            {t('contact')}
          </Link>
          <Link href={ROUTES.status} className="text-xs uppercase tracking-widest font-sans font-bold hover:text-primary transition-colors duration-300">
            {t('status')}
          </Link>
        </nav>

        {/* Desktop Utility elements */}
        <div className="hidden md:flex items-center space-x-6">
          <LanguageSwitcher />
          <Link
            href={ROUTES.order}
            className="text-[10px] font-sans font-bold uppercase tracking-widest bg-primary text-[#070B1E] border border-primary hover:bg-transparent hover:text-primary px-4 py-2.5 rounded shadow-[0_0_12px_rgba(212,175,55,0.25)] transition-all duration-300"
          >
            {t('orderOnline')}
          </Link>
        </div>

        {/* Mobile Hamburger Menu Toggle Button */}
        <button
          ref={toggleButtonRef}
          onClick={() => setIsDrawerOpen(!isDrawerOpen)}
          className="md:hidden flex flex-col justify-center items-center w-10 h-10 border border-primary/20 rounded-lg bg-[#0A1128]/50 text-primary hover:bg-[#0A1128]/85 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none transition-all duration-300"
          aria-label={isDrawerOpen ? 'Zamknij menu / Close menu' : 'Otwórz menu / Open menu'}
          aria-expanded={isDrawerOpen}
        >
          <span className={`block w-5 h-0.5 bg-current transition-all duration-300 ${isDrawerOpen ? 'transform rotate-45 translate-y-1.5' : ''}`} />
          <span className={`block w-5 h-0.5 bg-current my-1 transition-all duration-300 ${isDrawerOpen ? 'opacity-0' : ''}`} />
          <span className={`block w-5 h-0.5 bg-current transition-all duration-300 ${isDrawerOpen ? 'transform -rotate-45 -translate-y-1.5' : ''}`} />
        </button>
      </div>

      {/* Mobile Menu Slide-out Drawer */}
      <AnimatePresence>
        {isDrawerOpen && (
          <>
            {/* Dark blur backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              transition={{ duration: shouldReduceMotion ? 0 : 0.3 }}
              onClick={() => setIsDrawerOpen(false)}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
              aria-hidden="true"
            />

            {/* Slide-out Panel */}
            <motion.div
              ref={drawerRef}
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{
                type: 'spring',
                damping: 25,
                stiffness: 200,
                duration: shouldReduceMotion ? 0 : 0.4
              }}
              className="fixed top-0 right-0 bottom-0 z-50 w-80 max-w-[85vw] bg-[#070B1E] border-l border-primary/20 p-6 flex flex-col shadow-2xl md:hidden"
              role="dialog"
              aria-modal="true"
              aria-label="Mobile Navigation"
            >
              {/* Close Button */}
              <div className="flex justify-between items-center mb-8">
                <span className="font-serif text-lg font-bold text-primary tracking-widest">MENU</span>
                <button
                  onClick={() => {
                    setIsDrawerOpen(false);
                    toggleButtonRef.current?.focus();
                  }}
                  className="w-8 h-8 flex items-center justify-center border border-primary/20 rounded bg-[#0A1128]/50 text-primary hover:bg-[#0A1128]/85 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                  aria-label="Zamknij menu / Close menu"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Mobile Drawer Navigation Links */}
              <nav className="flex flex-col space-y-4 mb-auto">
                <Link
                  href={ROUTES.home}
                  onClick={() => setIsDrawerOpen(false)}
                  className="text-sm uppercase tracking-widest font-sans font-bold py-2 hover:text-primary transition-colors border-b border-primary/5"
                >
                  {t('home')}
                </Link>
                <Link
                  href={ROUTES.menu}
                  onClick={() => setIsDrawerOpen(false)}
                  className="text-sm uppercase tracking-widest font-sans font-bold py-2 hover:text-primary transition-colors border-b border-primary/5"
                >
                  {t('menu')}
                </Link>
                <Link
                  href={ROUTES.reservations}
                  onClick={() => setIsDrawerOpen(false)}
                  className="text-sm uppercase tracking-widest font-sans font-bold py-2 hover:text-primary transition-colors border-b border-primary/5"
                >
                  {t('reservations')}
                </Link>
                <Link
                  href={ROUTES.story}
                  onClick={() => setIsDrawerOpen(false)}
                  className="text-sm uppercase tracking-widest font-sans font-bold py-2 hover:text-primary transition-colors border-b border-primary/5"
                >
                  {t('story')}
                </Link>
                <Link
                  href={ROUTES.contact}
                  onClick={() => setIsDrawerOpen(false)}
                  className="text-sm uppercase tracking-widest font-sans font-bold py-2 hover:text-primary transition-colors border-b border-primary/5"
                >
                  {t('contact')}
                </Link>
                <Link
                  href={ROUTES.status}
                  onClick={() => setIsDrawerOpen(false)}
                  className="text-sm uppercase tracking-widest font-sans font-bold py-2 hover:text-primary transition-colors border-b border-primary/5"
                >
                  {t('status')}
                </Link>
              </nav>

              {/* Mobile Drawer Footer Utilities */}
              <div className="pt-6 border-t border-primary/20 flex flex-col space-y-6">
                <div className="flex justify-between items-center">
                  <span className="text-xs uppercase tracking-wider text-muted-foreground">Język / Language</span>
                  <LanguageSwitcher />
                </div>
                <Link
                  href={ROUTES.order}
                  onClick={() => setIsDrawerOpen(false)}
                  className="text-center text-xs font-sans font-bold uppercase tracking-widest bg-primary text-[#070B1E] border border-primary hover:bg-transparent hover:text-primary py-3 rounded transition-all duration-300"
                >
                  {t('orderOnline')}
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
