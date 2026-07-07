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
      
      // Helper function to play a single resonant chord strike
      const triggerStrike = (timeOffset: number, decayDuration: number, strikeVolume: number) => {
        const strikeTime = now + timeOffset;
        const notes = [
          { freq: 523.25, type: 'triangle' as const, volCoeff: 0.35 }, // C5 Carrier
          { freq: 659.25, type: 'sine' as const, volCoeff: 0.25 },     // E5 Harmonizer
          { freq: 783.99, type: 'sine' as const, volCoeff: 0.25 },     // G5 Accent
          { freq: 1046.50, type: 'sine' as const, volCoeff: 0.15 }     // C6 Ringing High
        ];

        notes.forEach(({ freq, type, volCoeff }) => {
          const osc = ctx.createOscillator();
          const gainNode = ctx.createGain();
          osc.connect(gainNode);
          gainNode.connect(ctx.destination);
          
          osc.type = type;
          osc.frequency.setValueAtTime(freq, strikeTime);
          
          gainNode.gain.setValueAtTime(strikeVolume * volCoeff, strikeTime);
          gainNode.gain.exponentialRampToValueAtTime(0.001, strikeTime + decayDuration);
          
          osc.start(strikeTime);
          osc.stop(strikeTime + decayDuration + 0.1);
        });
      };

      // Play 3 loud strikes (triple service bell) lasting over 3.5 seconds total
      triggerStrike(0, 1.2, 0.7);    // Strike 1
      triggerStrike(0.4, 1.2, 0.7);  // Strike 2
      triggerStrike(0.8, 2.7, 0.9);  // Strike 3 (long ring-out tail)

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
