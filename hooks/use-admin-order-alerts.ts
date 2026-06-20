import { useEffect, useRef, useState } from 'react';

/**
 * Custom hook to manage Admin Pending Order audio alerts.
 * Features:
 * - Continuous dual-tone chime loop when pending orders exist.
 * - Browser AudioContext autoplay unlock helper.
 * - Cross-tab coordination via BroadcastChannel (only one tab plays sound).
 */
export function useAdminOrderAlerts(pendingCount: number) {
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [isLeader, setIsLeader] = useState(true);

  const audioContextRef = useRef<AudioContext | null>(null);
  const loopIntervalRef = useRef<any>(null);
  const isPlayingRef = useRef(false);
  
  const tabIdRef = useRef(Math.random());
  const lastLeaderPingRef = useRef<number>(Date.now());

  // 1. Load sound preference
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem('admin_sound_enabled');
    if (stored === 'true') {
      setSoundEnabled(true);
    }
  }, []);

  // 2. Cross-tab leadership election
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const channel = new BroadcastChannel('namaste_orders_alert_channel');

    const ping = () => {
      channel.postMessage({ type: 'ping', tabId: tabIdRef.current });
    };

    const interval = setInterval(ping, 1000);
    ping();

    const handleMessage = (event: MessageEvent) => {
      const msg = event.data;
      if (msg && msg.type === 'ping') {
        if (msg.tabId < tabIdRef.current) {
          // Found an older tab. Yield leadership.
          setIsLeader(false);
          lastLeaderPingRef.current = Date.now();
        }
      }
    };

    channel.addEventListener('message', handleMessage);

    const watchdog = setInterval(() => {
      // If we are not the leader, but we haven't heard from the leader in 2.5s, claim leadership
      if (!isLeader && Date.now() - lastLeaderPingRef.current > 2500) {
        console.log('[Audio Alerts] Tab claiming alert leadership.');
        setIsLeader(true);
      }
    }, 1000);

    return () => {
      clearInterval(interval);
      clearInterval(watchdog);
      channel.removeEventListener('message', handleMessage);
      channel.close();
    };
  }, [isLeader]);

  const toggleSound = () => {
    setSoundEnabled((prev) => {
      const next = !prev;
      localStorage.setItem('admin_sound_enabled', String(next));
      if (!next) {
        stopSound();
      }
      return next;
    });
  };

  const startSound = () => {
    // Only play if we are the tab leader and sound is enabled
    if (isPlayingRef.current || !isLeader) return;
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      isPlayingRef.current = true;

      // Premium dual-tone chime (alert name: admin-new-order-alert)
      const playTone = () => {
        if (!isPlayingRef.current || !audioContextRef.current) return;
        const ctx = audioContextRef.current;
        if (ctx.state === 'suspended') return;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        // Gold standard alternating frequencies: 523Hz (C5) and 659Hz (E5)
        osc.frequency.setValueAtTime(523.25, ctx.currentTime);
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.18);
        osc.type = 'sine';

        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7);

        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.7);
      };

      playTone();
      loopIntervalRef.current = setInterval(playTone, 2000);
    } catch (err) {
      console.error('[Audio Alerts] AudioContext start failed:', err);
    }
  };

  const stopSound = () => {
    isPlayingRef.current = false;
    if (loopIntervalRef.current) {
      clearInterval(loopIntervalRef.current);
      loopIntervalRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state === 'running') {
      audioContextRef.current.suspend();
    }
  };

  const [isVisible, setIsVisible] = useState(true);

  // 3. Document visibility change tracking (honoring active-only custom sounds)
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const handleVisibility = () => {
      setIsVisible(document.visibilityState === 'visible');
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  // 4. Coordinate alert playback based on pendingCount, soundEnabled, leadership, and visibility
  useEffect(() => {
    if (soundEnabled && pendingCount > 0 && isLeader && isVisible) {
      startSound();
    } else {
      stopSound();
    }
    return () => {
      stopSound();
    };
  }, [soundEnabled, pendingCount, isLeader, isVisible]);

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
    isLeader
  };
}
