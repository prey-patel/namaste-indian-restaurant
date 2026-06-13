import React from 'react';
import PremiumCard from '@/components/ui/premium-card';
import LuxuryAlert from '@/components/ui/luxury-alert';
import StatusPill from '@/components/ui/status-pill';

export default function AdminDashboardPage() {
  return (
    <div className="space-y-8 font-sans">
      
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-primary/10 pb-6 gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-primary">Panel Administratora</h1>
          <p className="text-xs text-muted-foreground mt-1">Namaste Restaurant Management Control</p>
        </div>
        <StatusPill status="neutral" label="Makieta UI" />
      </div>

      {/* Mockup Information Alert */}
      <LuxuryAlert type="info" title="System w trybie projektowym / Design System Mode">
        Panel administracyjny znajduje się obecnie w trybie demonstracyjnym (Faza 3). Wszystkie statystyki, 
        dane i akcje są makietami (placeholders) służącymi do weryfikacji wyglądu oraz spójności layoutu. 
        Połączenie z bazą danych Supabase oraz mechanizmy autoryzacji zostaną zintegrowane w kolejnych fazach wdrożenia.
      </LuxuryAlert>

      {/* Dashboard Metrics Placeholders */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        <PremiumCard hoverable={false} className="relative overflow-hidden">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
            Rezerwacje oczekujące
          </p>
          <div className="flex items-baseline space-x-2">
            <p className="text-3xl font-bold text-primary font-serif">—</p>
            <span className="text-[9px] text-muted-foreground/60 uppercase tracking-wider">(Atrapa)</span>
          </div>
          <p className="text-[10px] text-muted-foreground/40 mt-3 border-t border-primary/5 pt-2">
            Pending Reservations
          </p>
        </PremiumCard>

        <PremiumCard hoverable={false} className="relative overflow-hidden">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
            Dzisiejsze Stoliki
          </p>
          <div className="flex items-baseline space-x-2">
            <p className="text-3xl font-bold text-primary font-serif">—</p>
            <span className="text-[9px] text-muted-foreground/60 uppercase tracking-wider">(Atrapa)</span>
          </div>
          <p className="text-[10px] text-muted-foreground/40 mt-3 border-t border-primary/5 pt-2">
            Today&apos;s Bookings
          </p>
        </PremiumCard>

        <PremiumCard hoverable={false} className="relative overflow-hidden">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
            Aktywne Zamówienia
          </p>
          <div className="flex items-baseline space-x-2">
            <p className="text-3xl font-bold text-primary font-serif">—</p>
            <span className="text-[9px] text-muted-foreground/60 uppercase tracking-wider">(Atrapa)</span>
          </div>
          <p className="text-[10px] text-muted-foreground/40 mt-3 border-t border-primary/5 pt-2">
            Active Orders (Del / CO)
          </p>
        </PremiumCard>

        <PremiumCard hoverable={false} className="relative overflow-hidden">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
            Zlecenia w Kuchni (KDS)
          </p>
          <div className="flex items-baseline space-x-2">
            <p className="text-3xl font-bold text-primary font-serif">—</p>
            <span className="text-[9px] text-muted-foreground/60 uppercase tracking-wider">(Atrapa)</span>
          </div>
          <p className="text-[10px] text-muted-foreground/40 mt-3 border-t border-primary/5 pt-2">
            Kitchen Queue (KDS)
          </p>
        </PremiumCard>

      </div>

      {/* Operational guidelines shell */}
      <PremiumCard hoverable={false} className="border-primary/20 bg-primary/5 py-8 text-center max-w-2xl mx-auto space-y-4">
        <h2 className="text-xl font-serif font-bold text-primary">Struktura Panelu Wdrożona Pomyślnie</h2>
        <p className="text-xs text-muted-foreground leading-relaxed max-w-lg mx-auto">
          Zdefiniowaliśmy spójny system typografii serif/sans oraz luksusowe motywy Navy/Gold. 
          Struktura panelu administratora (sidebar, topbar, responsive drawer) jest w pełni przygotowana 
          na integracje logiki biznesowej, które nastąpią w kolejnych fazach projektu.
        </p>
      </PremiumCard>

    </div>
  );
}
