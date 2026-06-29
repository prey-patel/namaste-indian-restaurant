'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ROUTES } from '@/lib/routes/path';
import { LayoutDashboard, ShoppingCart, CalendarDays, ChefHat, BookOpen, Settings, Users, BarChart3, Activity, ClipboardList, Truck, Mail } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useAdminSidebarBadges } from '@/hooks/use-admin-sidebar-badges';

interface AdminSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function AdminSidebar({ isOpen = false, onClose }: AdminSidebarProps) {
  const pathname = usePathname();
  const t = useTranslations('adminSidebar');
  const tTopbar = useTranslations('adminTopbar');
  const { ordersApprovalCount, kdsCount, reservationsCount, deliveryCount, inquiriesCount } = useAdminSidebarBadges();

  const isActive = (href: string) => {
    if (href === ROUTES.admin.dashboard) {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  const operationsItems = [
    { href: ROUTES.admin.dashboard, key: 'dashboard', icon: LayoutDashboard },
    { href: ROUTES.admin.orders, key: 'orders', icon: ShoppingCart },
    { href: ROUTES.admin.orderSummary, key: 'orderSummary', icon: ClipboardList },
    { href: ROUTES.admin.reservations, key: 'reservations', icon: CalendarDays },
    { href: ROUTES.admin.kds, key: 'kds', icon: ChefHat },
    { href: ROUTES.admin.delivery, key: 'delivery', icon: Truck },
    { href: ROUTES.admin.inquiries, key: 'inquiries', icon: Mail },
    { href: ROUTES.admin.menu, key: 'menu', icon: BookOpen },
  ];

  const administrationItems = [
    { href: ROUTES.admin.settings.root, key: 'settings', icon: Settings },
    { href: ROUTES.admin.users, key: 'users', icon: Users },
    { href: ROUTES.admin.analytics, key: 'analytics', icon: BarChart3 },
    { href: ROUTES.admin.performance, key: 'performance', icon: Activity },
  ];

  return (
    <aside 
      className={`fixed inset-y-0 left-0 w-64 border-r border-border bg-card text-foreground flex flex-col h-screen transition-transform duration-300 ease-in-out z-30 lg:static lg:translate-x-0 font-sans shrink-0 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`} 
      aria-label="Admin Navigation Sidebar"
    >
      {/* Admin Branding Header */}
      <div className="p-6 border-b border-border flex items-center justify-between">
        <Link href={ROUTES.admin.dashboard} className="flex flex-col group" onClick={onClose}>
          <span className="text-lg font-serif font-black tracking-widest text-primary leading-tight group-hover:opacity-90 transition-opacity">
            NAMASTE ADMIN
          </span>
          <span className="text-[9px] tracking-[0.2em] text-muted-foreground font-semibold uppercase mt-0.5">
            Management Panel
          </span>
        </Link>
        
        {/* Mobile Close Button */}
        <button 
          onClick={onClose}
          className="lg:hidden p-2 -mr-2 text-muted-foreground hover:text-foreground rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label="Close menu"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Admin Menu Links */}
      <nav className="flex-1 p-4 space-y-5 overflow-y-auto">
        <div>
          <span className="px-3 py-1.5 text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">
            {t('sections.operations')}
          </span>
          <div className="space-y-1 mt-1.5">
            {operationsItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              
              let badgeCount = 0;
              if (item.key === 'orders') badgeCount = ordersApprovalCount;
              if (item.key === 'kds') badgeCount = kdsCount;
              if (item.key === 'reservations') badgeCount = reservationsCount;
              if (item.key === 'delivery') badgeCount = deliveryCount;
              if (item.key === 'inquiries') badgeCount = inquiriesCount;

              return (
                <Link 
                  key={item.href}
                  href={item.href} 
                  onClick={onClose}
                  className={`flex items-center gap-3 px-3 py-2.5 text-xs font-bold uppercase tracking-wider rounded transition-all duration-200 ${
                    active 
                      ? 'text-primary bg-primary/10 border-l-4 border-primary pl-2' 
                      : 'text-muted-foreground hover:text-primary hover:bg-primary/5'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-primary' : 'text-muted-foreground/75'}`} />
                  <span className="flex-1 text-left">{t(`links.${item.key}`)}</span>
                  {badgeCount > 0 && (
                    <span 
                      className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 text-[10px] font-black text-white leading-none shadow-sm shadow-red-950/20 shrink-0 select-none animate-pulse"
                      aria-label={`${badgeCount} items needing attention`}
                    >
                      {badgeCount > 99 ? '99+' : badgeCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        <div>
          <span className="px-3 py-1.5 text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">
            {t('sections.administration')}
          </span>
          <div className="space-y-1 mt-1.5">
            {administrationItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              
              return (
                <Link 
                  key={item.href}
                  href={item.href} 
                  onClick={onClose}
                  className={`flex items-center gap-3 px-3 py-2.5 text-xs font-bold uppercase tracking-wider rounded transition-all duration-200 ${
                    active 
                      ? 'text-primary bg-primary/10 border-l-4 border-primary pl-2' 
                      : 'text-muted-foreground hover:text-primary hover:bg-primary/5'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-primary' : 'text-muted-foreground/75'}`} />
                  {t(`links.${item.key}`)}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Admin Profile Footer */}
      <div className="p-5 border-t border-border bg-muted/30 text-xs">
        <p className="font-bold text-foreground">
          {t('footer.loggedInAs', { role: tTopbar('roleOwner') })}
        </p>
        <p className="text-[10px] text-muted-foreground font-medium mt-0.5">
          {t('footer.restaurantLocation')}
        </p>
      </div>
    </aside>
  );
}
