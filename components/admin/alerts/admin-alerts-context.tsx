'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAdminOrderAlerts } from '@/hooks/use-admin-order-alerts';

interface AdminAlertsContextType {
  soundEnabled: boolean;
  toggleSound: () => void;
  unlockAudio: () => void;
  pendingCount: number;
}

const AdminAlertsContext = createContext<AdminAlertsContextType | undefined>(undefined);

export function AdminAlertsProvider({ children }: { children: ReactNode }) {
  const [pendingCount, setPendingCount] = useState(0);
  const { soundEnabled, toggleSound, unlockAudio } = useAdminOrderAlerts(pendingCount);

  useEffect(() => {
    const supabase = createClient();

    const fetchPendingCount = async () => {
      try {
        const { count, error } = await supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending');
        if (!error && count !== null) {
          setPendingCount(count);
        }
      } catch (err) {
        console.error('[Admin Alerts Context] Failed to fetch pending count:', err);
      }
    };

    // Initial fetch
    fetchPendingCount();

    // Subscribe to realtime orders changes
    const channel = supabase
      .channel('admin-global-orders-alert')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          fetchPendingCount();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  return (
    <AdminAlertsContext.Provider value={{ soundEnabled, toggleSound, unlockAudio, pendingCount }}>
      {children}
    </AdminAlertsContext.Provider>
  );
}

export function useAdminAlerts() {
  const context = useContext(AdminAlertsContext);
  if (!context) {
    throw new Error('useAdminAlerts must be used within an AdminAlertsProvider');
  }
  return context;
}
