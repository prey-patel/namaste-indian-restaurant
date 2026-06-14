import React from 'react';
import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';
import PremiumCard from '@/components/ui/premium-card';
import StatusPill from '@/components/ui/status-pill';
import { ROUTES } from '@/lib/routes/path';
import { Calendar, ClipboardList, ChefHat, LayoutGrid } from 'lucide-react';

export const revalidate = 0; // Enforce dynamic rendering for fresh stats

export default async function AdminDashboardPage() {
  let pendingReservations = 0;
  let activeOrders = 0;
  let kitchenOrders = 0;
  let todayReservations = 0;

  try {
    const adminClient = createAdminClient();

    // Fetch counts in parallel
    const [pendingRes, activeOrd, kitchenOrd, todayRes] = await Promise.all([
      adminClient
        .from('reservations')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending'),
      adminClient
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .in('status', ['pending', 'approved', 'preparing', 'ready_for_pickup', 'out_for_delivery']),
      adminClient
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'preparing'),
      adminClient
        .from('reservations')
        .select('id', { count: 'exact', head: true })
        .gte('reservation_start_at', new Date(new Date().setHours(0,0,0,0)).toISOString())
        .lt('reservation_start_at', new Date(new Date().setHours(23,59,59,999)).toISOString())
        .in('status', ['pending', 'confirmed'])
    ]);

    pendingReservations = pendingRes.count || 0;
    activeOrders = activeOrd.count || 0;
    kitchenOrders = kitchenOrd.count || 0;
    todayReservations = todayRes.count || 0;
  } catch (err) {
    console.error('Error fetching admin dashboard metrics:', err);
  }

  return (
    <div className="space-y-8 font-sans">
      
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-primary/10 pb-6 gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-primary">Panel Administratora</h1>
          <p className="text-xs text-muted-foreground mt-1">Namaste Restaurant Management Control</p>
        </div>
        <StatusPill status="success" label="Live Production" />
      </div>

      {/* Dashboard Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Pending Reservations */}
        <Link href={ROUTES.admin.reservations} className="block group">
          <PremiumCard hoverable className="relative overflow-hidden transition-all duration-300 group-hover:border-primary/40">
            <div className="flex justify-between items-start mb-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Rezerwacje oczekujące
              </p>
              <Calendar className="w-4 h-4 text-primary opacity-60 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="flex items-baseline space-x-2">
              <p className="text-3xl font-bold text-primary font-serif">{pendingReservations}</p>
            </div>
            <p className="text-[10px] text-muted-foreground/40 mt-3 border-t border-primary/5 pt-2">
              Pending Reservations
            </p>
          </PremiumCard>
        </Link>

        {/* Today's Bookings */}
        <Link href={ROUTES.admin.reservations} className="block group">
          <PremiumCard hoverable className="relative overflow-hidden transition-all duration-300 group-hover:border-primary/40">
            <div className="flex justify-between items-start mb-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Dzisiejsze Rezerwacje
              </p>
              <Calendar className="w-4 h-4 text-primary opacity-60 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="flex items-baseline space-x-2">
              <p className="text-3xl font-bold text-primary font-serif">{todayReservations}</p>
            </div>
            <p className="text-[10px] text-muted-foreground/40 mt-3 border-t border-primary/5 pt-2">
              Today&apos;s Bookings (Active)
            </p>
          </PremiumCard>
        </Link>

        {/* Active Orders */}
        <Link href={ROUTES.admin.orders} className="block group">
          <PremiumCard hoverable className="relative overflow-hidden transition-all duration-300 group-hover:border-primary/40">
            <div className="flex justify-between items-start mb-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Aktywne Zamówienia
              </p>
              <ClipboardList className="w-4 h-4 text-primary opacity-60 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="flex items-baseline space-x-2">
              <p className="text-3xl font-bold text-primary font-serif">{activeOrders}</p>
            </div>
            <p className="text-[10px] text-muted-foreground/40 mt-3 border-t border-primary/5 pt-2">
              Active Orders (In Progress)
            </p>
          </PremiumCard>
        </Link>

        {/* KDS Kitchen Queue */}
        <Link href={ROUTES.admin.kds} className="block group">
          <PremiumCard hoverable className="relative overflow-hidden transition-all duration-300 group-hover:border-primary/40">
            <div className="flex justify-between items-start mb-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Zlecenia w Kuchni (KDS)
              </p>
              <ChefHat className="w-4 h-4 text-primary opacity-60 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="flex items-baseline space-x-2">
              <p className="text-3xl font-bold text-primary font-serif">{kitchenOrders}</p>
            </div>
            <p className="text-[10px] text-muted-foreground/40 mt-3 border-t border-primary/5 pt-2">
              Kitchen Queue (Preparing)
            </p>
          </PremiumCard>
        </Link>

      </div>

      {/* Quick Navigation Panels */}
      <div className="border border-primary/10 rounded-2xl bg-card/10 p-6 md:p-8 space-y-6">
        <div className="flex items-center space-x-2 text-primary">
          <LayoutGrid className="w-5 h-5" />
          <h2 className="text-lg font-serif font-bold">Szybkie skróty / Operations Shortcuts</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <Link href={ROUTES.admin.orders} className="px-4 py-3 rounded-lg border border-primary/20 hover:bg-primary/5 text-center text-xs font-bold uppercase tracking-wider text-primary transition-all duration-300">
            Akceptacja Zamówień / Orders Approval
          </Link>
          <Link href={ROUTES.admin.reservations} className="px-4 py-3 rounded-lg border border-primary/20 hover:bg-primary/5 text-center text-xs font-bold uppercase tracking-wider text-primary transition-all duration-300">
            Terminarz Rezerwacji / Reservations Grid
          </Link>
          <Link href={ROUTES.admin.kds} className="px-4 py-3 rounded-lg border border-primary/20 hover:bg-primary/5 text-center text-xs font-bold uppercase tracking-wider text-primary transition-all duration-300">
            Monitor Kuchenny / Kitchen Display System
          </Link>
          <Link href={ROUTES.admin.menu} className="px-4 py-3 rounded-lg border border-primary/20 hover:bg-primary/5 text-center text-xs font-bold uppercase tracking-wider text-primary transition-all duration-300 sm:col-span-2 md:col-span-3">
            Zarządzanie Menu CMS / Menu & Categories CMS
          </Link>
        </div>
      </div>

    </div>
  );
}
