'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ROUTES } from '@/lib/routes/path';
import { LayoutDashboard, ShoppingCart, CalendarDays, ChefHat, BookOpen, Settings, Users, BarChart3, Activity } from 'lucide-react';

export default function AdminSidebar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === ROUTES.admin.dashboard) {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  const operationsItems = [
    { href: ROUTES.admin.dashboard, label: 'Dashboard Overview', icon: LayoutDashboard },
    { href: ROUTES.admin.orders, label: 'Orders Approval', icon: ShoppingCart },
    { href: ROUTES.admin.reservations, label: 'Reservations Grid', icon: CalendarDays },
    { href: ROUTES.admin.kds, label: 'Kitchen Display (KDS)', icon: ChefHat },
    { href: ROUTES.admin.menu, label: 'Menu & Category CMS', icon: BookOpen },
  ];

  const administrationItems = [
    { href: ROUTES.admin.settings.root, label: 'Settings', icon: Settings },
    { href: ROUTES.admin.users, label: 'Users & Roles', icon: Users },
    { href: ROUTES.admin.analytics, label: 'Raporty i Analizy / Analytics', icon: BarChart3 },
    { href: ROUTES.admin.performance, label: 'Wydajność / Performance', icon: Activity },
  ];

  return (
    <aside className="w-64 border-r border-border bg-card text-foreground flex flex-col h-screen sticky top-0 font-sans z-20 shrink-0" aria-label="Admin Navigation Sidebar">
      {/* Admin Branding Header */}
      <div className="p-6 border-b border-border">
        <Link href={ROUTES.admin.dashboard} className="flex flex-col group">
          <span className="text-lg font-serif font-black tracking-widest text-primary leading-tight group-hover:opacity-90 transition-opacity">
            NAMASTE ADMIN
          </span>
          <span className="text-[9px] tracking-[0.2em] text-muted-foreground font-semibold uppercase mt-0.5">
            Management Panel
          </span>
        </Link>
      </div>

      {/* Admin Menu Links */}
      <nav className="flex-1 p-4 space-y-5 overflow-y-auto">
        <div>
          <span className="px-3 py-1.5 text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">
            Operations
          </span>
          <div className="space-y-1 mt-1.5">
            {operationsItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              
              return (
                <Link 
                  key={item.href}
                  href={item.href} 
                  className={`flex items-center gap-3 px-3 py-2.5 text-xs font-bold uppercase tracking-wider rounded transition-all duration-200 ${
                    active 
                      ? 'text-primary bg-primary/10 border-l-4 border-primary pl-2' 
                      : 'text-muted-foreground hover:text-primary hover:bg-primary/5'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-primary' : 'text-muted-foreground/75'}`} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>

        <div>
          <span className="px-3 py-1.5 text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">
            Administration
          </span>
          <div className="space-y-1 mt-1.5">
            {administrationItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              
              return (
                <Link 
                  key={item.href}
                  href={item.href} 
                  className={`flex items-center gap-3 px-3 py-2.5 text-xs font-bold uppercase tracking-wider rounded transition-all duration-200 ${
                    active 
                      ? 'text-primary bg-primary/10 border-l-4 border-primary pl-2' 
                      : 'text-muted-foreground hover:text-primary hover:bg-primary/5'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-primary' : 'text-muted-foreground/75'}`} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Admin Profile Footer */}
      <div className="p-5 border-t border-border bg-muted/30 text-xs">
        <p className="font-bold text-foreground">Logged in as: Owner</p>
        <p className="text-[10px] text-muted-foreground font-medium mt-0.5">Namaste Restaurant Ciechanów</p>
      </div>
    </aside>
  );
}
