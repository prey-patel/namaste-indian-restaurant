import { useEffect, useRef, useState } from 'react';
import { getAlertSoundSignedUrlAction } from '@/app/admin/settings/actions';

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
export function useAdminOrderAlerts(pendingCount: number, soundSetting: string = 'alarm-drum-bass') {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isLeader, setIsLeader] = useState(true);
  const [isVisible, setIsVisible] = useState(true);
  const [audioState, setAudioState] = useState<AudioContextState>('suspended');
  const [hasUnlockedInSession, setHasUnlockedInSession] = useState(() => {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem('admin_audio_unlocked_session') === 'true';
  });

  const audioContextRef = useRef<AudioContext | null>(null);
  const decodedBufferRef = useRef<AudioBuffer | null>(null);
  const isLoadingSoundRef = useRef<boolean>(false);
  const isPlayingRef = useRef(false);
  const workerRef = useRef<Worker | null>(null);
  
  const tabIdRef = useRef(Math.random());
  const lastLeaderPingRef = useRef<number>(Date.now());
  const pendingStartTimeRef = useRef<number | null>(null);
  const currentStageRef = useRef<number>(1);

  const originalTitleRef = useRef<string>('');
  const blinkIntervalRef = useRef<any>(null);

  // 1. Load sound preference (defaults to true if not set)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem('admin_sound_enabled');
    if (stored === 'false') {
      setSoundEnabled(false);
    } else {
      setSoundEnabled(true);
      localStorage.setItem('admin_sound_enabled', 'true');
    }
  }, []);

  // Unlock AudioContext on the first interaction anywhere on the page
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleGlobalInteraction = () => {
      unlockAudio();
      document.removeEventListener('click', handleGlobalInteraction);
      document.removeEventListener('touchstart', handleGlobalInteraction);
    };

    document.addEventListener('click', handleGlobalInteraction);
    document.addEventListener('touchstart', handleGlobalInteraction);

    return () => {
      document.removeEventListener('click', handleGlobalInteraction);
      document.removeEventListener('touchstart', handleGlobalInteraction);
    };
  }, [soundSetting]);

  // Reset/reload audio buffer when soundSetting changes
  useEffect(() => {
    decodedBufferRef.current = null;
    isLoadingSoundRef.current = false;
    if (soundEnabled && pendingCount > 0 && isLeader) {
      unlockAudio();
    }
  }, [soundSetting]);

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

  // 6. Play tone based on dynamic stages using decoded sound files or synthesis
  const playTone = (stage: number) => {
    if (!audioContextRef.current) return;
    const ctx = audioContextRef.current;
    if (ctx.state === 'suspended') return;

    try {
      const now = ctx.currentTime;

      if (soundSetting === 'digital-beeps') {
        // Digital Beeps (synthesis)
        const repeats = stage === 3 ? 4 : stage === 2 ? 3 : 2;
        for (let i = 0; i < repeats; i++) {
          const beepTime = now + (i * 0.15);
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = 'square';
          osc.frequency.setValueAtTime(987.77, beepTime);
          
          const volume = stage === 1 ? 0.08 : stage === 2 ? 0.18 : 0.3;
          gain.gain.setValueAtTime(volume, beepTime);
          gain.gain.exponentialRampToValueAtTime(0.0001, beepTime + 0.12);
          osc.start(beepTime);
          osc.stop(beepTime + 0.15);
        }
      } else if (soundSetting === 'high-chime') {
        // High chime (synthesis)
        const volume = stage === 1 ? 0.15 : stage === 2 ? 0.25 : 0.45;
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.frequency.setValueAtTime(880, now);
        osc1.type = 'sine';
        gain1.gain.setValueAtTime(volume, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc1.start(now);
        osc1.stop(now + 0.4);

        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.frequency.setValueAtTime(1100, now + 0.1);
        osc2.type = 'sine';
        gain2.gain.setValueAtTime(volume, now + 0.1);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        osc2.start(now + 0.1);
        osc2.stop(now + 0.5);
      } else if (soundSetting === 'modulating-siren') {
        // Emergency siren (synthesis)
        const volume = stage === 1 ? 0.08 : stage === 2 ? 0.18 : 0.3;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.35);
        osc.frequency.exponentialRampToValueAtTime(440, now + 0.7);
        gain.gain.setValueAtTime(volume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
        osc.start(now);
        osc.stop(now + 0.7);
      } else {
        // Load buffer play (Drum & Bass, or custom uploaded file)
        if (!decodedBufferRef.current) {
          console.warn('[Audio Alerts] Cannot play sound: context or buffer not ready for sound setting:', soundSetting);
          return;
        }
        const source = ctx.createBufferSource();
        source.buffer = decodedBufferRef.current;

        const gain = ctx.createGain();
        source.connect(gain);
        gain.connect(ctx.destination);

        // Adjust volume based on stage
        let volume = 0.25;
        if (stage === 1) {
          volume = 0.25;
        } else if (stage === 2) {
          volume = 0.6;
        } else {
          volume = 1.0;
        }

        gain.gain.setValueAtTime(volume, now);

        if (stage === 3) {
          source.playbackRate.setValueAtTime(1.15, now);
        }

        source.start(now);
      }
    } catch (err) {
      console.warn('[Audio Alerts] Sound playback error:', err);
    }
  };

  const startSound = (interval: number) => {
    if (isPlayingRef.current) return;
    try {
      unlockAudio();
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
  }, [soundEnabled, pendingCount, isLeader, soundSetting]);

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

  const unlockAudio = async () => {
    if (!audioContextRef.current) {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      ctx.onstatechange = () => {
        setAudioState(ctx.state);
      };
      audioContextRef.current = ctx;
      setAudioState(ctx.state);
    }
    const ctx = audioContextRef.current;
    if (ctx.state === 'suspended') {
      try {
        await ctx.resume();
        setAudioState(ctx.state);
      } catch (err) {
        console.error('[Audio Alerts] AudioContext resume failed:', err);
      }
    }

    // Mark as unlocked in the current session
    try {
      sessionStorage.setItem('admin_audio_unlocked_session', 'true');
      setHasUnlockedInSession(true);
    } catch (e) {
      // Ignore storage errors in private browsing/unsupported environs
    }

    // Trigger load and decode of the sound setting if needed
    if (
      soundSetting !== 'digital-beeps' &&
      soundSetting !== 'high-chime' &&
      soundSetting !== 'modulating-siren' &&
      !decodedBufferRef.current &&
      !isLoadingSoundRef.current
    ) {
      isLoadingSoundRef.current = true;
      try {
        let audioUrl = '/alarm.mp3';
        if (soundSetting.startsWith('alert-sounds/')) {
          const res = await getAlertSoundSignedUrlAction(soundSetting);
          if (res.success && res.signedUrl) {
            audioUrl = res.signedUrl;
          }
        }
        
        console.log('[Audio Alerts] Loading alert audio from:', audioUrl);
        const fetchRes = await fetch(audioUrl);
        const arrayBuffer = await fetchRes.arrayBuffer();
        const decodedBuffer = await ctx.decodeAudioData(arrayBuffer);
        decodedBufferRef.current = decodedBuffer;
        console.log('[Audio Alerts] Custom sound loaded and decoded successfully.');
        
        // Play a tiny silent tone to wake AudioContext on iOS/safari
        const source = ctx.createBufferSource();
        source.buffer = decodedBuffer;
        const gain = ctx.createGain();
        source.connect(gain);
        gain.connect(ctx.destination);
        gain.gain.setValueAtTime(0.01, ctx.currentTime);
        source.start(ctx.currentTime);
        source.stop(ctx.currentTime + 0.1);
      } catch (err) {
        console.error('[Audio Alerts] Failed to load/decode alarm sound:', err);
      } finally {
        isLoadingSoundRef.current = false;
      }
    }
  };

  return {
    soundEnabled,
    toggleSound,
    unlockAudio,
    isLeader,
    audioState,
    hasUnlockedInSession
  };
}
