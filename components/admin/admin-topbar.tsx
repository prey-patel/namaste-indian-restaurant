'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import AdminLanguageSwitcher from './admin-language-switcher';
import { useTranslations } from 'next-intl';

export default function AdminTopbar() {
  const router = useRouter();
  const t = useTranslations('adminTopbar');

  const handleLogout = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push('/admin/login');
      router.refresh();
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <header className="h-20 border-b border-border bg-card px-8 flex items-center justify-between z-10 shrink-0 font-sans text-foreground" aria-label="Admin Topbar">
      {/* System Status Indicator */}
      <div className="flex items-center space-x-3">
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
          {t('statusLabel')}
        </span>
        <span className="inline-flex items-center px-3 py-1 rounded-full text-[9px] font-bold tracking-widest uppercase border bg-green-500/10 text-green-600 [.admin-theme_&]:text-green-800 dark:text-green-400 border-green-500/25">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 [.admin-theme_&]:bg-green-700 dark:bg-green-400 mr-1.5 animate-pulse" />
          {t('statusConnected')}
        </span>
      </div>

      {/* Admin Profile Details */}
      <div className="flex items-center space-x-6">
        <AdminLanguageSwitcher />
        <div className="flex items-center space-x-3 border-r border-border pr-6">
          {/* Mock user initials avatar */}
          <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xs" aria-hidden="true">
            OA
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-bold text-foreground leading-tight">Owner Admin</p>
            <p className="text-[9px] text-muted-foreground uppercase tracking-widest mt-0.5">{t('roleOwner')}</p>
          </div>
        </div>

        {/* Real Logout Button */}
        <button
          onClick={handleLogout}
          className="text-[9px] font-bold uppercase tracking-widest border border-red-500/40 text-red-600 [.admin-theme_&]:text-red-700 dark:text-red-400 hover:bg-red-500/10 px-4 py-2.5 rounded transition-all duration-300 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none"
          aria-label={t('logoutButton')}
        >
          {t('logoutButton')}
        </button>
      </div>
    </header>
  );
}
