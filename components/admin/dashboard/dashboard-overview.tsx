'use client';

import React, { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { getSingleSignedUrlAction } from '@/app/admin/menu/actions';
import { getDashboardDataAction } from '@/app/admin/actions';
import PremiumCard from '@/components/ui/premium-card';
import StatusPill from '@/components/ui/status-pill';
import DonutChart from './donut-chart';
import LineChart from './line-chart';
import { ROUTES } from '@/lib/routes/path';
import {
  Calendar,
  CalendarCheck,
  ShoppingBag,
  ChefHat,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  Clock,
  Phone,
  User,
  RefreshCw,
  LayoutGrid,
  ClipboardList,
  Settings,
  AlertCircle
} from 'lucide-react';
import type { DashboardData } from '@/lib/admin/dashboard';

interface DashboardOverviewProps {
  initialData: DashboardData;
}

export default function DashboardOverview({ initialData }: DashboardOverviewProps) {
  const t = useTranslations('adminDashboard');
  const locale = useLocale();
  const [data, setData] = useState<DashboardData>(initialData);
  const [isPending, startTransition] = useTransition();
  const [currentTime, setCurrentTime] = useState<string>('');
  const [signedImageUrl, setSignedImageUrl] = useState<string | null>(null);

  // Refresh dashboard data
  const handleRefresh = () => {
    startTransition(async () => {
      try {
        const freshData = await getDashboardDataAction();
        setData(freshData);
      } catch (err) {
        console.error('Failed to refresh dashboard data:', err);
      }
    });
  };

  // Realtime subscription + Polish/Warsaw live clock
  useEffect(() => {
    const supabase = createClient();

    // Live clock in Europe/Warsaw timezone
    const updateClock = () => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('pl-PL', {
        timeZone: 'Europe/Warsaw',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
      const dateStr = now.toLocaleDateString(locale === 'pl' ? 'pl-PL' : 'en-US', {
        timeZone: 'Europe/Warsaw',
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      setCurrentTime(`${dateStr}, ${timeStr}`);
    };

    updateClock();
    const clockInterval = setInterval(updateClock, 1000);

    // Realtime listeners for immediate updates on database changes
    const channel = supabase
      .channel('admin-dashboard-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => handleRefresh()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reservations' },
        () => handleRefresh()
      )
      .subscribe();

    return () => {
      clearInterval(clockInterval);
      supabase.removeChannel(channel);
    };
  }, [locale]);

  // Load signed URL for popular item image
  useEffect(() => {
    let active = true;

    async function loadItemImage() {
      if (!data.mostPopularItem?.imageUrl) {
        setSignedImageUrl(null);
        return;
      }
      try {
        const url = await getSingleSignedUrlAction(data.mostPopularItem.imageUrl);
        if (active) {
          setSignedImageUrl(url);
        }
      } catch (err) {
        console.error('Error loading popular item image:', err);
        if (active) {
          setSignedImageUrl(null);
        }
      }
    }

    loadItemImage();

    return () => {
      active = false;
    };
  }, [data.mostPopularItem?.imageUrl]);

  // Calculations for KPI differences
  const yesterdayRev = data.yesterdayRevenue;
  const todayRev = data.todayRevenue;
  const revenueDiffPercent = yesterdayRev > 0 ? ((todayRev - yesterdayRev) / yesterdayRev) * 100 : 0;

  // Donut chart calculations
  const totalToday = data.deliveryCount + data.takeawayCount;
  const donutSegments = [
    {
      value: data.deliveryCount,
      color: 'hsl(var(--primary))',
      label: t('channels.delivery')
    },
    {
      value: data.takeawayCount,
      color: '#10b981',
      label: t('channels.takeaway')
    }
  ];

  // Helper to format relative time for activity feed
  const formatRelativeTime = (dateStr: string) => {
    const diffMs = new Date().getTime() - new Date(dateStr).getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return t('recentActivity.justNow');
    if (diffMins < 60) return `${diffMins} ${t('recentActivity.minutesAgo')}`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}${t('recentActivity.hoursAgo')}`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}${t('recentActivity.daysAgo')}`;
  };

  // Helper to get localized event title from dictionary keys
  const getEventTitle = (iconKey: string, defaultTitle: string) => {
    // Check if the translation key exists
    const key = `recentActivity.${iconKey}`;
    try {
      const translated = t(key);
      if (translated && translated !== key) return translated;
    } catch (_) {}
    return defaultTitle;
  };

  // Get dynamic background and text colors for activity feed icons
  const getActivityStyles = (type: string, icon: string) => {
    if (type === 'admin_action') {
      return { bg: 'bg-zinc-500/10 border-zinc-500/20', text: 'text-zinc-600 dark:text-zinc-400' };
    }
    if (icon.toLowerCase().includes('reject') || icon.toLowerCase().includes('cancel') || icon.toLowerCase().includes('noshow')) {
      return { bg: 'bg-red-500/10 border-red-500/20', text: 'text-red-600 dark:text-red-400' };
    }
    if (icon.toLowerCase().includes('ready') || icon.toLowerCase().includes('complete') || icon.toLowerCase().includes('confirm') || icon.toLowerCase().includes('approve')) {
      return { bg: 'bg-green-500/10 border-green-500/20', text: 'text-green-600 dark:text-green-400' };
    }
    if (icon.toLowerCase().includes('prepare') || icon.toLowerCase().includes('delivery')) {
      return { bg: 'bg-blue-500/10 border-blue-500/20', text: 'text-blue-600 dark:text-blue-400' };
    }
    return { bg: 'bg-amber-500/10 border-amber-500/20', text: 'text-amber-600 dark:text-amber-400' };
  };

  // Best day and average sales trend calculations
  const bestTrendDay = data.salesTrend.reduce(
    (best, curr) => (curr.revenue > best.revenue ? curr : best),
    { date: '', revenue: 0, orders: 0 }
  );

  const totalTrendRevenue = data.salesTrend.reduce((sum, curr) => sum + curr.revenue, 0);
  const avgDailySales = data.salesTrend.length > 0 ? totalTrendRevenue / data.salesTrend.length : 0;

  return (
    <div className="space-y-8 font-sans">
      
      {/* Header section with live clock and manual refresh */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-primary/10 pb-6 gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-primary">{t('title')}</h1>
          <p className="text-xs text-muted-foreground mt-1">{t('subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-left md:text-right hidden sm:block">
            <p className="text-xs font-semibold text-foreground/80">{currentTime || 'Loading clock...'}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Europe/Warsaw timezone</p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isPending}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-primary/25 bg-primary/5 hover:bg-primary/10 disabled:opacity-50 text-xs font-bold uppercase tracking-wider text-primary transition-all duration-300"
            aria-label="Refresh dashboard data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isPending ? 'animate-spin' : ''}`} />
          </button>
          <StatusPill status="success" label="Live operations" />
        </div>
      </div>

      {/* Row 1 — 4 Status Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Pending Reservations */}
        <Link href={ROUTES.admin.reservations} className="block group">
          <PremiumCard hoverable className="relative overflow-hidden transition-all duration-300 group-hover:border-amber-500/40 border-l-4 border-l-amber-500">
            <div className="flex justify-between items-start mb-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {t('cards.pendingReservations')}
              </p>
              <Calendar className="w-4.5 h-4.5 text-amber-500 opacity-80 group-hover:scale-110 transition-transform" />
            </div>
            <div className="flex items-baseline space-x-2">
              <p className="text-3xl font-bold text-primary font-serif">{data.pendingReservations}</p>
            </div>
            <p className="text-[10px] text-muted-foreground/50 mt-3 border-t border-primary/5 pt-2 flex justify-between items-center">
              <span>{t('cards.pendingReservationsSub')}</span>
              <span className="text-[9px] uppercase font-bold tracking-widest text-amber-500 group-hover:translate-x-1 transition-transform">{t('viewAll')} →</span>
            </p>
          </PremiumCard>
        </Link>

        {/* Today's Reservations */}
        <Link href={ROUTES.admin.reservations} className="block group">
          <PremiumCard hoverable className="relative overflow-hidden transition-all duration-300 group-hover:border-green-500/40 border-l-4 border-l-green-500">
            <div className="flex justify-between items-start mb-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {t('cards.todayReservations')}
              </p>
              <CalendarCheck className="w-4.5 h-4.5 text-green-500 opacity-80 group-hover:scale-110 transition-transform" />
            </div>
            <div className="flex items-baseline space-x-2">
              <p className="text-3xl font-bold text-primary font-serif">{data.todayReservations}</p>
            </div>
            <p className="text-[10px] text-muted-foreground/50 mt-3 border-t border-primary/5 pt-2 flex justify-between items-center">
              <span>{t('cards.todayReservationsSub')}</span>
              <span className="text-[9px] uppercase font-bold tracking-widest text-green-500 group-hover:translate-x-1 transition-transform">{t('viewAll')} →</span>
            </p>
          </PremiumCard>
        </Link>

        {/* Active Orders */}
        <Link href={ROUTES.admin.orders} className="block group">
          <PremiumCard hoverable className="relative overflow-hidden transition-all duration-300 group-hover:border-blue-500/40 border-l-4 border-l-blue-500">
            <div className="flex justify-between items-start mb-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {t('cards.activeOrders')}
              </p>
              <ShoppingBag className="w-4.5 h-4.5 text-blue-500 opacity-80 group-hover:scale-110 transition-transform" />
            </div>
            <div className="flex items-baseline space-x-2">
              <p className="text-3xl font-bold text-primary font-serif">{data.activeOrders}</p>
            </div>
            <p className="text-[10px] text-muted-foreground/50 mt-3 border-t border-primary/5 pt-2 flex justify-between items-center">
              <span>{t('cards.activeOrdersSub')}</span>
              <span className="text-[9px] uppercase font-bold tracking-widest text-blue-500 group-hover:translate-x-1 transition-transform">{t('viewAll')} →</span>
            </p>
          </PremiumCard>
        </Link>

        {/* KDS Queue */}
        <Link href={ROUTES.admin.kds} className="block group">
          <PremiumCard hoverable className="relative overflow-hidden transition-all duration-300 group-hover:border-purple-500/40 border-l-4 border-l-purple-500">
            <div className="flex justify-between items-start mb-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {t('cards.kitchenOrders')}
              </p>
              <ChefHat className="w-4.5 h-4.5 text-purple-500 opacity-80 group-hover:scale-110 transition-transform" />
            </div>
            <div className="flex items-baseline space-x-2">
              <p className="text-3xl font-bold text-primary font-serif">{data.kdsQueue}</p>
            </div>
            <p className="text-[10px] text-muted-foreground/50 mt-3 border-t border-primary/5 pt-2 flex justify-between items-center">
              <span>{t('cards.kitchenOrdersSub')}</span>
              <span className="text-[9px] uppercase font-bold tracking-widest text-purple-500 group-hover:translate-x-1 transition-transform">{t('viewKds')} →</span>
            </p>
          </PremiumCard>
        </Link>

      </div>

      {/* Row 2 — 4 Information Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* 1. Today's Revenue */}
        <PremiumCard className="flex flex-col justify-between h-48">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
              {t('revenue.title')}
            </p>
            <p className="text-3xl font-bold font-serif text-primary">
              {data.todayRevenue.toLocaleString()} <span className="text-sm font-sans font-normal text-muted-foreground">PLN</span>
            </p>
          </div>
          <div className="mt-auto border-t border-primary/5 pt-3">
            <div className="flex items-center gap-1.5">
              {revenueDiffPercent >= 0 ? (
                <span className="inline-flex items-center text-xs font-bold text-green-600 dark:text-green-400">
                  <ArrowUpRight className="w-4 h-4 mr-0.5" />
                  +{revenueDiffPercent.toFixed(1)}%
                </span>
              ) : (
                <span className="inline-flex items-center text-xs font-bold text-red-600 dark:text-red-400">
                  <ArrowDownRight className="w-4 h-4 mr-0.5" />
                  {revenueDiffPercent.toFixed(1)}%
                </span>
              )}
              <span className="text-[10px] text-muted-foreground/60">{t('revenue.vsYesterday')}</span>
            </div>
          </div>
        </PremiumCard>

        {/* 2. Delivery vs Takeaway split */}
        <PremiumCard className="flex flex-col justify-between h-48">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
              {t('channels.title')}
            </p>
            <div className="flex items-center justify-between gap-4">
              <DonutChart 
                segments={donutSegments} 
                centerValue={totalToday.toString()} 
                centerLabel={t('channels.totalOrders')}
                size={90}
              />
              <div className="text-xs space-y-1.5 shrink-0">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                  <span className="text-muted-foreground">{t('channels.delivery')}:</span>
                  <span className="font-bold">{data.deliveryCount}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
                  <span className="text-muted-foreground">{t('channels.takeaway')}:</span>
                  <span className="font-bold">{data.takeawayCount}</span>
                </div>
              </div>
            </div>
          </div>
        </PremiumCard>

        {/* 3. Most Popular Item */}
        <PremiumCard className="flex flex-col justify-between h-48">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
              {t('popularItem.title')}
            </p>
            {data.mostPopularItem ? (
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-lg overflow-hidden bg-primary/5 border border-primary/10 flex-shrink-0 flex items-center justify-center relative">
                  {signedImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img 
                      src={signedImageUrl} 
                      alt={locale === 'pl' ? data.mostPopularItem.namePl : data.mostPopularItem.nameEn} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <ChefHat className="w-6 h-6 text-primary/40" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-foreground leading-tight truncate">
                    {locale === 'pl' ? data.mostPopularItem.namePl : data.mostPopularItem.nameEn}
                  </p>
                  <p className="text-[10px] text-muted-foreground/70 mt-1">
                    <span className="font-serif font-bold text-primary text-sm">{data.mostPopularItem.orderCount}</span> {t('popularItem.ordersToday')}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-muted-foreground/60 py-2">
                <AlertCircle className="w-4 h-4 text-muted-foreground/40" />
                <span>{t('popularItem.noData')}</span>
              </div>
            )}
          </div>
        </PremiumCard>

        {/* 4. Current Opening Status */}
        <PremiumCard className="flex flex-col justify-between h-48">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
              {t('openingStatus.title')}
            </p>
            <div className="flex flex-col gap-2">
              <div>
                {data.openingStatus.isOpen ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-bold tracking-widest uppercase border bg-green-500/10 text-green-600 border-green-500/25">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1 animate-pulse" />
                    {t('openingStatus.open')}
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-bold tracking-widest uppercase border bg-red-500/10 text-red-600 border-red-500/25">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 mr-1" />
                    {t('openingStatus.closed')}
                  </span>
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                <p className="font-semibold">{t('openingStatus.hours')}:</p>
                {data.openingStatus.todayOpenTime && data.openingStatus.todayCloseTime ? (
                  <p className="font-mono mt-0.5">{data.openingStatus.todayOpenTime} – {data.openingStatus.todayCloseTime}</p>
                ) : (
                  <p className="mt-0.5">{t('openingStatus.closedToday')}</p>
                )}
              </div>
            </div>
          </div>
          {data.openingStatus.isOpen && data.openingStatus.openedSinceMinutes !== null && (
            <div className="border-t border-primary/5 pt-2 mt-auto text-[10px] text-muted-foreground/60 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-primary/60" />
              <span>
                {t('openingStatus.openSince')}{' '}
                <span className="font-bold text-primary font-mono">
                  {Math.floor(data.openingStatus.openedSinceMinutes / 60)}h{' '}
                  {data.openingStatus.openedSinceMinutes % 60}m
                </span>
              </span>
            </div>
          )}
        </PremiumCard>

      </div>

      {/* Row 3 — Sales Trend, Channel Stats & Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Sales Trend line chart (covers 2 cols on lg) */}
        <div className="lg:col-span-2">
          <PremiumCard className="h-full space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-primary/5 pb-4 gap-2">
              <div>
                <h3 className="text-md font-serif font-bold text-primary">{t('salesTrend.title')}</h3>
                <p className="text-[10px] text-muted-foreground">{t('salesTrend.last7Days')}</p>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="inline-flex items-center text-primary/80 font-semibold bg-primary/5 px-2.5 py-1 rounded">
                  <TrendingUp className="w-3.5 h-3.5 mr-1" />
                  {t('salesTrend.avgDaily')}: {Math.round(avgDailySales).toLocaleString()} PLN
                </span>
              </div>
            </div>
            <LineChart data={data.salesTrend.map(pt => ({
              label: pt.date.slice(5), // MM-DD
              value: pt.revenue
            }))} />
            <div className="text-[10px] text-muted-foreground/70 flex justify-between items-center pt-2 border-t border-primary/5">
              <span>* Dzienna wartość sprzedaży (PLN)</span>
              {bestTrendDay.date && (
                <span>
                  {t('salesTrend.bestDay')}: <strong className="text-primary font-mono">{bestTrendDay.date}</strong> ({Math.round(bestTrendDay.revenue).toLocaleString()} PLN)
                </span>
              )}
            </div>
          </PremiumCard>
        </div>

        {/* Order Channel & Activity Feed */}
        <div className="space-y-6">
          
          {/* Order Channel stats */}
          <PremiumCard className="space-y-4">
            <h3 className="text-md font-serif font-bold text-primary border-b border-primary/5 pb-3">
              {t('channelDistribution.title')}
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-primary/5 rounded-lg border border-primary/10">
                <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                  {t('channelDistribution.avgOrderValue')}
                </p>
                <p className="text-xl font-bold font-serif text-primary mt-1">
                  {Math.round(data.avgOrderValue).toLocaleString()} <span className="text-[10px] font-sans font-normal">PLN</span>
                </p>
              </div>
              <div className="p-3 bg-primary/5 rounded-lg border border-primary/10">
                <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                  {t('channelDistribution.avgPrepTime')}
                </p>
                <p className="text-xl font-bold font-serif text-primary mt-1">
                  {data.avgPrepTimeMinutes > 0 ? (
                    <>
                      {Math.round(data.avgPrepTimeMinutes)} <span className="text-[10px] font-sans font-normal">min</span>
                    </>
                  ) : (
                    <span className="text-sm font-sans font-normal text-muted-foreground">--</span>
                  )}
                </p>
              </div>
            </div>
          </PremiumCard>

          {/* Combined Recent Activity Feed */}
          <PremiumCard className="space-y-4 max-h-[300px] flex flex-col">
            <div className="flex justify-between items-center border-b border-primary/5 pb-3 shrink-0">
              <h3 className="text-md font-serif font-bold text-primary">{t('recentActivity.title')}</h3>
              <span className="text-[10px] text-muted-foreground/60">Live</span>
            </div>
            
            <div className="overflow-y-auto space-y-3 pr-1 flex-grow scrollbar-thin">
              {data.recentActivity.length === 0 ? (
                <div className="text-center py-6 text-xs text-muted-foreground/60">
                  {t('recentActivity.noActivity')}
                </div>
              ) : (
                data.recentActivity.map((evt) => {
                  const styles = getActivityStyles(evt.type, evt.icon);
                  return (
                    <div key={evt.id} className="flex items-start gap-3 text-xs leading-normal">
                      <div className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0 text-[10px] font-bold ${styles.bg} ${styles.text}`}>
                        {evt.type === 'order_status' ? 'Z' : evt.type === 'reservation_status' ? 'R' : 'A'}
                      </div>
                      <div className="min-w-0 flex-grow">
                        <p className="font-semibold text-foreground/90 truncate">
                          {getEventTitle(evt.icon, evt.title)}
                        </p>
                        <p className="text-[10px] text-muted-foreground/70 truncate mt-0.5">
                          {evt.subtitle}
                        </p>
                      </div>
                      <div className="text-[9px] text-muted-foreground/50 shrink-0 font-semibold">
                        {formatRelativeTime(evt.timestamp)}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </PremiumCard>

        </div>

      </div>

      {/* Row 4 — Quick Actions & Upcoming Reservations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Quick Actions Grid (1/3 cols) */}
        <div>
          <PremiumCard className="h-full space-y-4">
            <h3 className="text-md font-serif font-bold text-primary border-b border-primary/5 pb-3 flex items-center gap-2">
              <LayoutGrid className="w-5 h-5 text-primary/70" />
              <span>{t('quickActions.title')}</span>
            </h3>
            
            <div className="grid grid-cols-2 gap-3">
              <Link
                href={ROUTES.admin.orders}
                className="flex flex-col items-center justify-center p-3 rounded-lg border border-primary/15 bg-card hover:bg-primary/5 text-center text-[10px] font-bold uppercase tracking-wider text-primary transition-all duration-300 hover:scale-102"
              >
                <ClipboardList className="w-5 h-5 mb-1.5 text-primary/80" />
                <span>{t('quickActions.orders')}</span>
              </Link>
              <Link
                href={ROUTES.admin.reservations}
                className="flex flex-col items-center justify-center p-3 rounded-lg border border-primary/15 bg-card hover:bg-primary/5 text-center text-[10px] font-bold uppercase tracking-wider text-primary transition-all duration-300 hover:scale-102"
              >
                <Calendar className="w-5 h-5 mb-1.5 text-primary/80" />
                <span>{t('quickActions.reservations')}</span>
              </Link>
              <Link
                href={ROUTES.admin.kds}
                className="flex flex-col items-center justify-center p-3 rounded-lg border border-primary/15 bg-card hover:bg-primary/5 text-center text-[10px] font-bold uppercase tracking-wider text-primary transition-all duration-300 hover:scale-102"
              >
                <ChefHat className="w-5 h-5 mb-1.5 text-primary/80" />
                <span>{t('quickActions.kds')}</span>
              </Link>
              <Link
                href={ROUTES.admin.menu}
                className="flex flex-col items-center justify-center p-3 rounded-lg border border-primary/15 bg-card hover:bg-primary/5 text-center text-[10px] font-bold uppercase tracking-wider text-primary transition-all duration-300 hover:scale-102"
              >
                <LayoutGrid className="w-5 h-5 mb-1.5 text-primary/80" />
                <span>{t('quickActions.menu')}</span>
              </Link>
              <Link
                href={ROUTES.admin.settings.root}
                className="flex flex-col items-center justify-center p-3 rounded-lg border border-primary/15 bg-card hover:bg-primary/5 text-center text-[10px] font-bold uppercase tracking-wider text-primary transition-all duration-300 hover:scale-102"
              >
                <Settings className="w-5 h-5 mb-1.5 text-primary/80" />
                <span>{t('quickActions.settings')}</span>
              </Link>
              <Link
                href={ROUTES.admin.analytics}
                className="flex flex-col items-center justify-center p-3 rounded-lg border border-primary/15 bg-card hover:bg-primary/5 text-center text-[10px] font-bold uppercase tracking-wider text-primary transition-all duration-300 hover:scale-102"
              >
                <TrendingUp className="w-5 h-5 mb-1.5 text-primary/80" />
                <span>{t('quickActions.analytics')}</span>
              </Link>
            </div>
          </PremiumCard>
        </div>

        {/* Upcoming Reservations List (2/3 cols) */}
        <div className="lg:col-span-2">
          <PremiumCard className="h-full space-y-4">
            <div className="flex items-center justify-between border-b border-primary/5 pb-3">
              <h3 className="text-md font-serif font-bold text-primary flex items-center gap-2">
                <CalendarCheck className="w-5 h-5 text-primary/70" />
                <span>{t('upcomingReservations.title')}</span>
              </h3>
              <Link 
                href={ROUTES.admin.reservations}
                className="text-[10px] uppercase font-bold tracking-widest text-primary hover:text-primary/70 transition-colors"
              >
                {t('upcomingReservations.viewAll')} →
              </Link>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-primary/5 text-muted-foreground uppercase font-bold tracking-wider text-[9px]">
                    <th className="py-2.5 pr-4">{t('upcomingReservations.time')}</th>
                    <th className="py-2.5 px-4">{t('upcomingReservations.name')}</th>
                    <th className="py-2.5 px-4 text-center">{t('upcomingReservations.guests')}</th>
                    <th className="py-2.5 px-4">{t('upcomingReservations.phone')}</th>
                    <th className="py-2.5 pl-4 text-right">{t('upcomingReservations.table')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-primary/5">
                  {data.upcomingReservations.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-muted-foreground/60">
                        {t('upcomingReservations.noReservations')}
                      </td>
                    </tr>
                  ) : (
                    data.upcomingReservations.map((res) => (
                      <tr key={res.id} className="hover:bg-primary/5 transition-colors">
                        <td className="py-3 pr-4 font-bold text-primary font-mono">{res.time}</td>
                        <td className="py-3 px-4 font-semibold text-foreground/80 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
                          <span>{res.customerName}</span>
                        </td>
                        <td className="py-3 px-4 text-center font-bold font-serif text-primary">{res.guestsCount}</td>
                        <td className="py-3 px-4 text-muted-foreground flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
                          <span>{res.customerPhone}</span>
                        </td>
                        <td className="py-3 pl-4 text-right font-bold text-primary">
                          {res.tableNumber !== null ? (
                            <span className="inline-block px-2 py-0.5 rounded bg-primary/10 border border-primary/20 text-[10px]">
                              {res.tableNumber}
                            </span>
                          ) : (
                            <span className="text-muted-foreground/40 font-normal">—</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </PremiumCard>
        </div>

      </div>

    </div>
  );
}
