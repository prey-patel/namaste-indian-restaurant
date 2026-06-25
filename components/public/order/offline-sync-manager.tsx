'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { getPendingOrders, deleteOrder, updateOrderStatus, OfflineOrder } from '@/lib/pwa/indexed-db';
import { createOrderRequestAction } from '@/app/[locale]/(public)/order/actions';
import { AnimatePresence, motion } from 'framer-motion';
import { Wifi, CheckCircle2, AlertCircle, ShoppingBag, X } from 'lucide-react';
import { useLocale } from 'next-intl';

interface ToastMessage {
  id: string;
  type: 'success' | 'info' | 'error';
  title: string;
  message: string;
}

export default function OfflineSyncManager() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const locale = useLocale();

  const addToast = useCallback((type: 'success' | 'info' | 'error', title: string, message: string) => {
    const id = `toast_${Date.now()}_${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, title, message }]);
    
    // Auto remove after 7 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 7000);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const syncOrders = useCallback(async () => {
    if (typeof window === 'undefined' || !navigator.onLine || isSyncing) return;

    try {
      const pending = await getPendingOrders();
      if (pending.length === 0) return;

      setIsSyncing(true);
      addToast(
        'info',
        locale === 'pl' ? 'Przywrócono połączenie' : 'Connection Restored',
        locale === 'pl' 
          ? `Synchronizacja ${pending.length} zamówień oczekujących...` 
          : `Synchronizing ${pending.length} pending offline orders...`
      );

      for (const order of pending) {
        try {
          // Update status to 'syncing' first to prevent race conditions
          await updateOrderStatus(order.id, 'syncing');

          const res = await createOrderRequestAction(order.payload);
          
          if (res.success) {
            // Delete order from DB on success
            await deleteOrder(order.id);
            
            addToast(
              'success',
              locale === 'pl' ? 'Zamówienie Wysłane!' : 'Order Placed!',
              locale === 'pl'
                ? `Twoje zamówienie złożone offline zostało pomyślnie zsynchronizowane.`
                : `Your offline order has been successfully synchronized.`
            );
          } else {
            // Check if it's a validation error or permanent block
            await updateOrderStatus(order.id, 'failed');
            addToast(
              'error',
              locale === 'pl' ? 'Błąd synchronizacji' : 'Sync Error',
              locale === 'pl'
                ? `Nie udało się wysłać zamówienia: ${res.error || 'Nieznany błąd'}`
                : `Could not submit queued order: ${res.error || 'Unknown error'}`
            );
          }
        } catch (itemErr: any) {
          // Restore status to pending to retry later
          await updateOrderStatus(order.id, 'pending');
          console.error('Failed to sync offline order:', itemErr);
        }
      }
    } catch (err) {
      console.error('Offline synchronization error:', err);
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, locale, addToast]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Initial check on mount
    const timer = setTimeout(() => {
      syncOrders();
    }, 3000);

    // 2. Listen for transition to online state
    window.addEventListener('online', syncOrders);

    // 3. Periodic synchronization fallback check (every 30 seconds)
    const interval = setInterval(syncOrders, 30000);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('online', syncOrders);
      clearInterval(interval);
    };
  }, [syncOrders]);

  return (
    <div className="fixed bottom-5 right-5 z-[10000] flex flex-col space-y-3 max-w-sm w-full pointer-events-none font-sans select-none">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            className="pointer-events-auto w-full"
          >
            <div className={`p-4 border rounded-xl shadow-2xl backdrop-blur-md flex items-start gap-3.5 relative overflow-hidden bg-[#050B1E]/95 border-primary/20`}>
              {/* Left Color strip indicator */}
              <div 
                className={`absolute top-0 left-0 bottom-0 w-1 ${
                  t.type === 'success' ? 'bg-emerald-500' : t.type === 'error' ? 'bg-rose-500' : 'bg-amber-500'
                }`} 
              />
              
              {/* Icons based on type */}
              <div className="shrink-0 pt-0.5">
                {t.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                {t.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-400" />}
                {t.type === 'info' && <Wifi className="w-5 h-5 text-amber-400 animate-pulse" />}
              </div>

              {/* Title & Message */}
              <div className="flex-1 space-y-1 pr-6">
                <h5 className="font-sans font-bold text-sm tracking-wide text-foreground leading-none">
                  {t.title}
                </h5>
                <p className="font-sans text-xs text-muted-foreground leading-relaxed">
                  {t.message}
                </p>
              </div>

              {/* Close Button */}
              <button
                onClick={() => removeToast(t.id)}
                className="absolute top-3 right-3 text-muted-foreground hover:text-foreground hover:bg-[#0A1128]/50 p-1 rounded-lg transition-all"
                aria-label="Close alert"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
