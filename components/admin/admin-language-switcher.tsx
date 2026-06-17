'use client';

import React from 'react';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';

export default function AdminLanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();

  const handleLocaleChange = (newLocale: 'pl' | 'en') => {
    // Set the cookie for next-intl
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
    // Refresh the server components to reload the translated messages
    router.refresh();
  };

  return (
    <div className="flex items-center space-x-1 border border-[#EAE3D2] rounded-full p-1 bg-amber-50/20 backdrop-blur-sm mr-2" aria-label="Language Switcher">
      <button
        onClick={() => handleLocaleChange('pl')}
        className={`text-[10px] font-bold tracking-widest uppercase px-3 py-1 rounded-full transition-all duration-300 focus-visible:outline-none ${
          locale === 'pl'
            ? 'bg-[#9E690A] text-white shadow-md'
            : 'text-muted-foreground hover:text-foreground hover:bg-amber-100/30'
        }`}
        aria-label="Zmień język na Polski"
      >
        PL
      </button>
      <button
        onClick={() => handleLocaleChange('en')}
        className={`text-[10px] font-bold tracking-widest uppercase px-3 py-1 rounded-full transition-all duration-300 focus-visible:outline-none ${
          locale === 'en'
            ? 'bg-[#9E690A] text-white shadow-md'
            : 'text-muted-foreground hover:text-foreground hover:bg-amber-100/30'
        }`}
        aria-label="Change language to English"
      >
        EN
      </button>
    </div>
  );
}
