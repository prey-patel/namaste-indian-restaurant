'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAdminOrderAlerts } from '@/hooks/use-admin-order-alerts';

interface AdminAlertsContextType {
  soundEnabled: boolean;
  toggleSound: () => void;
  unlockAudio: () => void;
  pendingCount: number;
  audioState: AudioContextState;
}

const AdminAlertsContext = createContext<AdminAlertsContextType | undefined>(undefined);

export function AdminAlertsProvider({ children }: { children: ReactNode }) {
  const [pendingCount, setPendingCount] = useState(0);
  const [soundSetting, setSoundSetting] = useState<string>('alarm-drum-bass');
  const { soundEnabled, toggleSound, unlockAudio, audioState } = useAdminOrderAlerts(pendingCount, soundSetting);

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

    const fetchSoundSetting = async () => {
      try {
        const { data, error } = await supabase
          .from('system_settings')
          .select('value')
          .eq('key', 'admin_notification_sound')
          .single();
        if (!error && data && data.value) {
          setSoundSetting(data.value);
        }
      } catch (err) {
        console.error('[Admin Alerts Context] Failed to fetch sound setting:', err);
      }
    };

    // Initial fetch
    fetchPendingCount();
    fetchSoundSetting();

    // Subscribe to realtime orders changes
    const ordersChannel = supabase
      .channel('admin-global-orders-alert')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          fetchPendingCount();
        }
      )
      .subscribe();

    // Subscribe to settings changes
    const settingsChannel = supabase
      .channel('admin-global-settings-alert')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'system_settings', filter: 'key=eq.admin_notification_sound' },
        (payload) => {
          if (payload.new && (payload.new as any).value) {
            setSoundSetting((payload.new as any).value);
          }
        }
      )
      .subscribe();

    return () => {
      ordersChannel.unsubscribe();
      settingsChannel.unsubscribe();
    };
  }, []);

  return (
    <AdminAlertsContext.Provider value={{ soundEnabled, toggleSound, unlockAudio, pendingCount, audioState }}>
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
