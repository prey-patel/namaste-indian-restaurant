import React from 'react';
import Link from 'next/link';
import { ROUTES } from '@/lib/routes/path';

export default function AdminSidebar() {
  return (
    <aside className="w-64 border-r border-primary/20 bg-[#050B1E] text-muted-foreground flex flex-col h-screen sticky top-0">
      {/* Admin Branding Header */}
      <div className="p-6 border-b border-primary/10">
        <Link href={ROUTES.admin.dashboard} className="flex flex-col">
          <span className="text-lg font-serif font-bold tracking-widest text-primary leading-tight">
            NAMASTE ADMIN
          </span>
          <span className="text-[8px] tracking-[0.2em] text-muted-foreground font-light uppercase">
            Management Panel
          </span>
        </Link>
      </div>

      {/* Admin Menu Links */}
      <nav className="flex-1 p-4 space-y-1">
        <span className="px-3 py-2 text-[10px] uppercase font-bold tracking-wider text-muted-foreground/45 block">
          Operations
        </span>
        <Link 
          href={ROUTES.admin.dashboard} 
          className="flex items-center px-3 py-2 text-sm font-medium hover:text-primary hover:bg-primary/5 rounded transition-colors"
        >
          Dashboard Overview
        </Link>
        <Link 
          href={ROUTES.admin.orders} 
          className="flex items-center px-3 py-2 text-sm font-medium hover:text-primary hover:bg-primary/5 rounded transition-colors"
        >
          Orders Approval
        </Link>
        <Link 
          href={ROUTES.admin.reservations} 
          className="flex items-center px-3 py-2 text-sm font-medium hover:text-primary hover:bg-primary/5 rounded transition-colors"
        >
          Reservations Grid
        </Link>
        <Link 
          href={ROUTES.admin.kds} 
          className="flex items-center px-3 py-2 text-sm font-medium hover:text-primary hover:bg-primary/5 rounded transition-colors"
        >
          Kitchen Display (KDS)
        </Link>

        <span className="px-3 py-2 text-[10px] uppercase font-bold tracking-wider text-muted-foreground/45 block pt-4">
          Configuration
        </span>
        <Link 
          href={ROUTES.admin.tables} 
          className="flex items-center px-3 py-2 text-sm font-medium hover:text-primary hover:bg-primary/5 rounded transition-colors"
        >
          Tables Map
        </Link>
        <Link 
          href={ROUTES.admin.menu} 
          className="flex items-center px-3 py-2 text-sm font-medium hover:text-primary hover:bg-primary/5 rounded transition-colors"
        >
          Menu & Category CMS
        </Link>
        <Link 
          href={ROUTES.admin.settings.root} 
          className="flex items-center px-3 py-2 text-sm font-medium hover:text-primary hover:bg-primary/5 rounded transition-colors"
        >
          System Settings
        </Link>
        <Link 
          href={ROUTES.admin.notifications} 
          className="flex items-center px-3 py-2 text-sm font-medium hover:text-primary hover:bg-primary/5 rounded transition-colors"
        >
          Notification Logs
        </Link>
        <Link 
          href={ROUTES.admin.logs} 
          className="flex items-center px-3 py-2 text-sm font-medium hover:text-primary hover:bg-primary/5 rounded transition-colors"
        >
          Audit Activity Logs
        </Link>
      </nav>

      {/* Admin Profile Footer */}
      <div className="p-4 border-t border-primary/10 text-xs">
        <p className="font-semibold text-foreground">Logged in as: Owner</p>
        <p className="text-[10px] text-muted-foreground/60">Namaste Restaurant Ciechanów</p>
      </div>
    </aside>
  );
}
