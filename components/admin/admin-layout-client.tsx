'use client';

import { ReactNode, useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import AdminSidebar from './admin-sidebar';
import AdminTopbar from './admin-topbar';

export default function AdminLayoutClient({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/admin/login';
  const isKdsPage = pathname === '/admin/kds';
  const [kdsTheme, setKdsTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    if (!isKdsPage) return;
    const stored = localStorage.getItem('kds_theme') as 'dark' | 'light';
    if (stored) {
      setKdsTheme(stored);
    }

    const handleThemeChange = (e: Event) => {
      const customEvent = e as CustomEvent<'dark' | 'light'>;
      setKdsTheme(customEvent.detail);
    };

    window.addEventListener('kds-theme-change', handleThemeChange);
    return () => {
      window.removeEventListener('kds-theme-change', handleThemeChange);
    };
  }, [isKdsPage]);

  if (isLoginPage) {
    return (
      <div 
        className="min-h-screen admin-theme bg-background text-foreground flex items-center justify-center notranslate"
        translate="no"
      >
        {children}
      </div>
    );
  }

  // KDS page: minimal chrome for kitchen display
  if (isKdsPage) {
    const isLight = kdsTheme === 'light';
    return (
      <div 
        className={`min-h-screen transition-colors duration-300 notranslate ${
          isLight ? 'admin-theme bg-background text-foreground' : 'bg-[#070B1E] text-white'
        }`}
        translate="no"
      >
        <main className="p-4 sm:p-6">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div 
      className="flex w-full min-h-screen admin-theme bg-background text-foreground notranslate"
      translate="no"
    >
      <AdminSidebar />
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <AdminTopbar />
        <main className="flex-1 p-8 overflow-y-auto bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}

