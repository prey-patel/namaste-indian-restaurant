import { useEffect, useRef, useState } from 'react';

// Background Web Worker code to bypass browser background tab throttling
const createWorkerBlobUrl = () => {
  const code = `
    let timer = null;
    self.onmessage = function(e) {
      const { action, interval } = e.data;
      if (action === 'start') {
        if (timer) clearInterval(timer);
        timer = setInterval(() => {
          self.postMessage('tick');
        }, interval || 2000);
      } else if (action === 'stop') {
        if (timer) {
          clearInterval(timer);
          timer = null;
        }
      } else if (action === 'setInterval') {
        if (timer) {
          clearInterval(timer);
          timer = setInterval(() => {
            self.postMessage('tick');
          }, interval);
        }
      }
    };
  `;
  const blob = new Blob([code], { type: 'application/javascript' });
  return URL.createObjectURL(blob);
};

/**
 * Custom hook to manage Admin Pending Order audio alerts.
 * Features:
 * - Continuous dual-tone chime loop when pending orders exist.
 * - Browser AudioContext autoplay unlock helper.
 * - Cross-tab coordination via BroadcastChannel (only one tab plays sound).
 * - Background keep-alive using inline Web Worker.
 * - Dynamic 3-stage escalating alarm based on order age.
 * - Blinking tab title when new orders are pending and tab is hidden.
 */
export function useAdminOrderAlerts(pendingCount: number) {
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [isLeader, setIsLeader] = useState(true);
  const [isVisible, setIsVisible] = useState(true);

  const audioContextRef = useRef<AudioContext | null>(null);
  const isPlayingRef = useRef(false);
  const workerRef = useRef<Worker | null>(null);
  
  const tabIdRef = useRef(Math.random());
  const lastLeaderPingRef = useRef<number>(Date.now());
  const pendingStartTimeRef = useRef<number | null>(null);
  const currentStageRef = useRef<number>(1);

  const originalTitleRef = useRef<string>('');
  const blinkIntervalRef = useRef<any>(null);

  // 1. Load sound preference
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem('admin_sound_enabled');
    if (stored === 'true') {
      setSoundEnabled(true);
    }
  }, []);

  // 2. Web Worker Initialization
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = createWorkerBlobUrl();
    const worker = new Worker(url);

    worker.onmessage = (e) => {
      if (e.data === 'tick') {
        playTone(currentStageRef.current);
      }
    };

    workerRef.current = worker;

    return () => {
      worker.terminate();
      URL.revokeObjectURL(url);
    };
  }, []);

  // 3. Cross-tab leadership election
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

  // 4. Tab Visibility Tracker
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

  // 5. Title Blinking Handler
  const startBlinking = () => {
    if (typeof window === 'undefined' || blinkIntervalRef.current) return;
    if (!originalTitleRef.current) {
      originalTitleRef.current = document.title;
    }
    let showAlt = true;
    blinkIntervalRef.current = setInterval(() => {
      document.title = showAlt ? '🔴 NEW ORDER! 🔴' : originalTitleRef.current;
      showAlt = !showAlt;
    }, 1000);
  };

  const stopBlinking = () => {
    if (blinkIntervalRef.current) {
      clearInterval(blinkIntervalRef.current);
      blinkIntervalRef.current = null;
    }
    if (originalTitleRef.current) {
      document.title = originalTitleRef.current;
      originalTitleRef.current = '';
    }
  };

  useEffect(() => {
    if (!isVisible && pendingCount > 0) {
      startBlinking();
    } else {
      stopBlinking();
    }
    return () => stopBlinking();
  }, [pendingCount, isVisible]);

  // 6. Play tone based on dynamic stages
  const playTone = (stage: number) => {
    if (!audioContextRef.current) return;
    const ctx = audioContextRef.current;
    if (ctx.state === 'suspended') return;

    try {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.type = 'sine';
      osc2.type = 'sine';

      const now = ctx.currentTime;

      if (stage === 1) {
        // Stage 1: Quiet gentle beep (C5, 523Hz) every 8s
        osc1.frequency.setValueAtTime(523.25, now);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        osc1.start(now);
        osc1.stop(now + 0.6);
      } else if (stage === 2) {
        // Stage 2: Alternating dual-tone chime (C5 & E5) every 4s
        osc1.frequency.setValueAtTime(523.25, now);
        osc1.start(now);
        osc1.stop(now + 0.25);

        osc2.frequency.setValueAtTime(659.25, now + 0.18);
        osc2.start(now + 0.18);
        osc2.stop(now + 0.5);

        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
      } else {
        // Stage 3: Rapid loud alarm (E5 & G5) every 1.5s
        osc1.frequency.setValueAtTime(659.25, now);
        osc1.start(now);
        osc1.stop(now + 0.18);

        osc2.frequency.setValueAtTime(783.99, now + 0.12);
        osc2.start(now + 0.12);
        osc2.stop(now + 0.4);

        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      }
    } catch (err) {
      console.warn('[Audio Alerts] Tone generation error:', err);
    }
  };

  const startSound = (interval: number) => {
    if (isPlayingRef.current) return;
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      isPlayingRef.current = true;

      if (workerRef.current) {
        workerRef.current.postMessage({ action: 'start', interval });
      }
    } catch (err) {
      console.error('[Audio Alerts] AudioContext start failed:', err);
    }
  };

  const stopSound = () => {
    isPlayingRef.current = false;
    if (workerRef.current) {
      workerRef.current.postMessage({ action: 'stop' });
    }
    if (audioContextRef.current && audioContextRef.current.state === 'running') {
      audioContextRef.current.suspend();
    }
  };

  // 7. Core Alert Coordinator with Escalating Timer Loop
  useEffect(() => {
    if (!soundEnabled || pendingCount === 0 || !isLeader) {
      stopSound();
      pendingStartTimeRef.current = null;
      return;
    }

    if (pendingStartTimeRef.current === null) {
      pendingStartTimeRef.current = Date.now();
    }

    // Trigger immediately with initial Stage 1 configuration (8s interval)
    currentStageRef.current = 1;
    startSound(8000);

    const checkStageInterval = setInterval(() => {
      if (pendingStartTimeRef.current === null) return;
      const elapsedSec = (Date.now() - pendingStartTimeRef.current) / 1000;

      let targetStage = 1;
      let targetInterval = 8000;

      if (elapsedSec >= 120) {
        targetStage = 3;
        targetInterval = 1500;
      } else if (elapsedSec >= 30) {
        targetStage = 2;
        targetInterval = 4000;
      }

      if (targetStage !== currentStageRef.current) {
        console.log(`[Audio Alerts] Transitioning to Alarm Stage ${targetStage} (Interval: ${targetInterval}ms)`);
        currentStageRef.current = targetStage;
        if (workerRef.current && isPlayingRef.current) {
          workerRef.current.postMessage({ action: 'setInterval', interval: targetInterval });
        }
      }
    }, 1000);

    return () => {
      clearInterval(checkStageInterval);
      stopSound();
    };
  }, [soundEnabled, pendingCount, isLeader]);

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

  const unlockAudio = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    // Small baseline beep to confirm audio path is unlocked
    try {
      const ctx = audioContextRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      gain.gain.setValueAtTime(0.01, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.1);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } catch (e) {
      console.warn('Test tone failed:', e);
    }
  };

  return {
    soundEnabled,
    toggleSound,
    unlockAudio,
    isLeader
  };
}
