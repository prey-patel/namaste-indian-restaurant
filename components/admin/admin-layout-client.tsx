'use client';

import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import AdminSidebar from './admin-sidebar';
import AdminTopbar from './admin-topbar';

export default function AdminLayoutClient({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/admin/login';
  const isKdsPage = pathname === '/admin/kds';

  if (isLoginPage) {
    return (
      <div className="min-h-screen admin-theme bg-background text-foreground flex items-center justify-center">
        {children}
      </div>
    );
  }

  // KDS page: minimal chrome for kitchen display
  if (isKdsPage) {
    return (
      <div className="min-h-screen bg-[#070B1E]">
        <main className="p-4 sm:p-6">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="flex w-full min-h-screen admin-theme bg-background text-foreground">
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

