'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function AdminTopbar() {
  const router = useRouter();

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
    <header className="h-20 border-b border-primary/20 bg-[#050B1E] px-8 flex items-center justify-between z-10 shrink-0 font-sans" aria-label="Admin Topbar">
      {/* System Status Indicator */}
      <div className="flex items-center space-x-3">
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
          Status:
        </span>
        <span className="inline-flex items-center px-3 py-1 rounded-full text-[9px] font-bold tracking-widest uppercase border bg-green-500/10 text-green-400 border-green-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 mr-1.5 animate-pulse" />
          Połączono / Live Connected
        </span>
      </div>

      {/* Admin Profile Details */}
      <div className="flex items-center space-x-6">
        <div className="flex items-center space-x-3 border-r border-primary/10 pr-6">
          {/* Mock user initials avatar */}
          <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center text-primary font-bold text-xs" aria-hidden="true">
            OA
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-bold text-foreground leading-tight">Owner Admin</p>
            <p className="text-[9px] text-muted-foreground uppercase tracking-widest mt-0.5">Właściciel / Owner</p>
          </div>
        </div>

        {/* Real Logout Button */}
        <button
          onClick={handleLogout}
          className="text-[9px] font-bold uppercase tracking-widest border border-red-500/30 text-red-400 hover:bg-red-500/10 px-4 py-2.5 rounded transition-all duration-300 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none"
          aria-label="Wyloguj się z panelu / Logout"
        >
          Wyloguj / Logout
        </button>
      </div>
    </header>
  );
}
