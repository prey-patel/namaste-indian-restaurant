import { useEffect, useRef, useState, useCallback } from 'react';

type KdsOrderSimple = {
  id: string;
  status: string;
};

/**
 * Custom hook to manage KDS Kitchen one-time sound alerts.
 * Features:
 * - One-time dual-tone bell sound ("ding ding") when a new approved order arrives.
 * - Prevents playing audio for old approved orders on page mount.
 * - Local-only seen state to prevent duplicates.
 */
export function useKdsAlerts(currentOrders: KdsOrderSimple[]) {
  const [soundEnabled, setSoundEnabled] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  
  // Track seen order IDs to prevent replay. Initialized to true for all orders present on first load.
  const seenOrderIdsRef = useRef<Set<string>>(new Set());
  const isFirstLoadRef = useRef(true);

  // 1. Initialize seen orders on first load so we don't chime for old history
  useEffect(() => {
    if (isFirstLoadRef.current && currentOrders.length > 0) {
      currentOrders.forEach((order) => {
        seenOrderIdsRef.current.add(order.id);
      });
      isFirstLoadRef.current = false;
      console.log('[KDS Alerts] Initialized seen set with existing orders:', seenOrderIdsRef.current.size);
    } else if (isFirstLoadRef.current && currentOrders.length === 0) {
      // If we load with 0 orders, we've handled first load, next arrivals will chime
      isFirstLoadRef.current = false;
    }
  }, [currentOrders]);

  // 2. Load sound preference
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem('kds_sound_enabled');
    if (stored === 'true') {
      setSoundEnabled(true);
    }
  }, []);

  const toggleSound = () => {
    setSoundEnabled((prev) => {
      const next = !prev;
      localStorage.setItem('kds_sound_enabled', String(next));
      if (next) playKitchenChime();
      return next;
    });
  };

  const playKitchenChime = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      // High-pitched premium double service bell chime (alert name: kds-new-order-alert)
      const now = ctx.currentTime;
      
      // Ding 1
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.frequency.setValueAtTime(880, now); // A5 note
      osc1.type = 'sine';
      gain1.gain.setValueAtTime(0.2, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc1.start(now);
      osc1.stop(now + 0.4);

      // Ding 2 (slightly higher, offset by 0.12s)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.frequency.setValueAtTime(1100, now + 0.12); // C#6 note
      osc2.type = 'sine';
      gain2.gain.setValueAtTime(0.2, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.52);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.52);

    } catch (err) {
      console.error('[KDS Alerts] Failed to play kitchen chime:', err);
    }
  }, []);

  // 3. Monitor new orders and trigger chime if unseen
  useEffect(() => {
    // If it's still first load setup, skip
    if (isFirstLoadRef.current) return;

    let hasNewUnseen = false;

    currentOrders.forEach((order) => {
      // Only chime for approved/ready kitchen visible orders
      if (order.status === 'approved' && !seenOrderIdsRef.current.has(order.id)) {
        seenOrderIdsRef.current.add(order.id);
        hasNewUnseen = true;
        console.log('[KDS Alerts] New unseen order arrived:', order.id);
      } else {
        // Just make sure it is added to seen if it has any other status
        seenOrderIdsRef.current.add(order.id);
      }
    });

    if (hasNewUnseen && soundEnabled) {
      playKitchenChime();
    }
  }, [currentOrders, soundEnabled, playKitchenChime]);

  const unlockAudio = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
  };

  return {
    soundEnabled,
    toggleSound,
    unlockAudio,
    playKitchenChime
  };
}
