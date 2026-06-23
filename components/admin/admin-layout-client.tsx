'use client';

import { ReactNode, useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import AdminSidebar from './admin-sidebar';
import AdminTopbar from './admin-topbar';
import RealtimeTableListener from '@/components/common/realtime-table-listener';
import { useScreenWakeLock } from '@/hooks/use-screen-wake-lock';

export default function AdminLayoutClient({ children }: { children: ReactNode }) {
  useScreenWakeLock();
  const pathname = usePathname();
  const isLoginPage = pathname === '/admin/login';
  const isKdsPage = pathname === '/admin/kds';
  const [kdsTheme, setKdsTheme] = useState<'dark' | 'light'>('dark');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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

  // Close sidebar drawer on screen width changes (e.g., resizing to desktop)
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
        className={`min-h-screen transition-colors duration-300 notranslate relative ${
          isLight ? 'admin-theme bg-background text-foreground' : 'bg-[#070B1E] text-white'
        }`}
        translate="no"
      >
        <RealtimeTableListener
          channelName="admin-kds-global-realtime"
          tables={[
            'system_settings',
            'operational_status',
            'orders',
            'order_items'
          ]}
        />
        <main className="p-4 sm:p-6">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div 
      className="flex w-full min-h-screen admin-theme bg-background text-foreground notranslate relative"
      translate="no"
    >
      <RealtimeTableListener
        channelName="admin-global-realtime"
        tables={[
          'system_settings',
          'operational_status',
          'service_hours',
          'holiday_closures',
          'categories',
          'menu_items',
          'delivery_fee_rules',
          'packaging_fee_rules',
          'site_content',
          'dining_tables',
          'orders',
          'order_items',
          'reservations'
        ]}
      />
      {/* Sidebar Backdrop Drawer Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-25 lg:hidden transition-all duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <AdminSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <AdminTopbar onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
        <main className="flex-1 p-4 sm:p-8 overflow-y-auto bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}

