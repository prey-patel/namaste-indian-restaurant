'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Link, usePathname } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import LanguageSwitcher from '../public/language-switcher';
import { ROUTES } from '@/lib/routes/path';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Search } from 'lucide-react';

export default function Header() {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const shouldReduceMotion = useReducedMotion();
  const drawerRef = useRef<HTMLDivElement>(null);
  const toggleButtonRef = useRef<HTMLButtonElement>(null);

  const isActive = (path: string) => {
    if (path === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(path);
  };

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

  // Lock body scroll and prevent touch-move on mobile when drawer is open
  useEffect(() => {
    if (isDrawerOpen) {
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
      document.body.dataset.scrollY = scrollY.toString();
    } else {
      const scrollY = parseInt(document.body.dataset.scrollY || '0', 10);
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
      if (scrollY > 0) {
        window.scrollTo(0, scrollY);
      }
    }
    return () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
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
      focusableElements[0].focus();

      const handleTabKey = (e: KeyboardEvent) => {
        if (e.key !== 'Tab') return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus();
            e.preventDefault();
          }
        } else {
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
    <>
      <header className="sticky top-0 z-[1000] w-full border-b border-primary/20 bg-[#040815]/90 backdrop-blur-md">
        <div className="container mx-auto px-4 h-20 flex items-center justify-between">
          
          <Link href={ROUTES.home} className="flex items-center group focus-visible:ring-2 focus-visible:ring-primary rounded p-1">
            <img
              src="/images/logo.png"
              alt="Namaste Logo"
              className="h-14 w-auto object-contain transition-transform group-hover:scale-105"
            />
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-8 h-full" aria-label="Główne menu / Main Menu">
            <Link 
              href={ROUTES.home} 
              className={`text-xs uppercase tracking-widest font-sans font-bold transition-all duration-300 relative py-2 ${
                isActive(ROUTES.home) ? 'text-primary' : 'text-foreground/90 hover:text-primary'
              }`}
            >
              {t('home')}
              {isActive(ROUTES.home) && (
                <motion.span 
                  layoutId="activeNavLine" 
                  className="absolute bottom-[-10px] left-0 right-0 h-[2px] bg-primary rounded-full" 
                />
              )}
            </Link>
            <Link 
              href={ROUTES.menu} 
              className={`text-xs uppercase tracking-widest font-sans font-bold transition-all duration-300 relative py-2 ${
                isActive(ROUTES.menu) ? 'text-primary' : 'text-foreground/90 hover:text-primary'
              }`}
            >
              {t('menu')}
              {isActive(ROUTES.menu) && (
                <motion.span 
                  layoutId="activeNavLine" 
                  className="absolute bottom-[-10px] left-0 right-0 h-[2px] bg-primary rounded-full" 
                />
              )}
            </Link>
            <Link 
              href={ROUTES.reservations} 
              className={`text-xs uppercase tracking-widest font-sans font-bold transition-all duration-300 relative py-2 ${
                isActive(ROUTES.reservations) ? 'text-primary' : 'text-foreground/90 hover:text-primary'
              }`}
            >
              {t('reservations')}
              {isActive(ROUTES.reservations) && (
                <motion.span 
                  layoutId="activeNavLine" 
                  className="absolute bottom-[-10px] left-0 right-0 h-[2px] bg-primary rounded-full" 
                />
              )}
            </Link>
            <Link 
              href={ROUTES.story} 
              className={`text-xs uppercase tracking-widest font-sans font-bold transition-all duration-300 relative py-2 ${
                isActive(ROUTES.story) ? 'text-primary' : 'text-foreground/90 hover:text-primary'
              }`}
            >
              {t('story')}
              {isActive(ROUTES.story) && (
                <motion.span 
                  layoutId="activeNavLine" 
                  className="absolute bottom-[-10px] left-0 right-0 h-[2px] bg-primary rounded-full" 
                />
              )}
            </Link>
            <Link 
              href={ROUTES.gallery} 
              className={`text-xs uppercase tracking-widest font-sans font-bold transition-all duration-300 relative py-2 ${
                isActive(ROUTES.gallery) ? 'text-primary' : 'text-foreground/90 hover:text-primary'
              }`}
            >
              {t('gallery')}
              {isActive(ROUTES.gallery) && (
                <motion.span 
                  layoutId="activeNavLine" 
                  className="absolute bottom-[-10px] left-0 right-0 h-[2px] bg-primary rounded-full" 
                />
              )}
            </Link>
            <Link 
              href={ROUTES.contact} 
              className={`text-xs uppercase tracking-widest font-sans font-bold transition-all duration-300 relative py-2 ${
                isActive(ROUTES.contact) ? 'text-primary' : 'text-foreground/90 hover:text-primary'
              }`}
            >
              {t('contact')}
              {isActive(ROUTES.contact) && (
                <motion.span 
                  layoutId="activeNavLine" 
                  className="absolute bottom-[-10px] left-0 right-0 h-[2px] bg-primary rounded-full" 
                />
              )}
            </Link>
          </nav>

          {/* Desktop Utility elements */}
          <div className="hidden md:flex items-center space-x-4">
            <LanguageSwitcher />
            
            {/* Vertical Separator Line */}
            <div className="w-[1px] h-6 bg-primary/20" />

            {/* Track Order Icon Button */}
            <Link
              href={ROUTES.status}
              title={t('status')}
              aria-label={t('status')}
              className={`flex items-center gap-1.5 text-[10px] font-sans font-bold uppercase tracking-widest transition-all duration-300 px-3 py-2 rounded border ${
                isActive(ROUTES.status)
                  ? 'border-primary/40 text-primary bg-primary/5'
                  : 'border-transparent text-foreground/70 hover:text-primary hover:border-primary/20 hover:bg-primary/5'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              {t('status')}
            </Link>

            {/* Vertical Separator Line */}
            <div className="w-[1px] h-6 bg-primary/20" />
            
            <Link
              href={ROUTES.order}
              className="text-[10px] font-sans font-extrabold uppercase tracking-widest border border-primary/30 hover:border-primary/80 hover:bg-primary/5 text-primary px-5 py-2.5 rounded transition-all duration-300 flex items-center gap-2"
            >
              {t('orderOnline')}
              <svg className="w-3 h-3 text-primary animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2l1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5Z" fill="currentColor" />
              </svg>
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
      </header>

      {/* Mobile Menu Slide-out Drawer */}
      <AnimatePresence>
        {isDrawerOpen && (
          <div className="fixed inset-0 z-[9998] overflow-hidden md:hidden">
            {/* Dark blur backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: shouldReduceMotion ? 0 : 0.3 }}
              onClick={() => setIsDrawerOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
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
              style={{ backfaceVisibility: 'hidden', willChange: 'transform' }}
              className="absolute top-0 right-0 bottom-0 z-[1] w-80 max-w-[85vw] bg-[#070B1E] border-l border-primary/20 p-6 flex flex-col shadow-2xl"
              role="dialog"
              aria-modal="true"
              aria-label="Mobile Navigation"
            >
              {/* Close Button */}
              <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-2">
                  <img
                    src="/images/logo.png"
                    alt="Namaste Logo"
                    className="h-8 w-auto object-contain"
                  />
                  <span className="font-serif text-lg font-bold text-primary tracking-widest">MENU</span>
                </div>
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
                  href={ROUTES.gallery}
                  onClick={() => setIsDrawerOpen(false)}
                  className={`text-sm uppercase tracking-widest font-sans font-bold py-2 transition-colors border-b border-primary/5 ${
                    isActive(ROUTES.gallery) ? 'text-primary' : 'hover:text-primary'
                  }`}
                >
                  {t('gallery')}
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
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
