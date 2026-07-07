'use client';

import React from 'react';
import { Volume2, Play } from 'lucide-react';
import { useAdminAlerts } from './admin-alerts-context';

export function AutoplayUnlockOverlay() {
  const { audioState, soundEnabled, unlockAudio } = useAdminAlerts();

  // Only show if sound is enabled and the browser has suspended the AudioContext
  if (!soundEnabled || audioState !== 'suspended') {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-[#070B1E]/95 backdrop-blur-md z-[9999] flex items-center justify-center p-4 select-none animate-fade-in font-sans text-foreground">
      {/* Decorative luxury background pattern */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-primary/5 rounded-full blur-[90px] pointer-events-none" />

      <div className="relative max-w-md w-full bg-[#050B1E] border border-primary/20 rounded-2xl shadow-2xl p-8 text-center space-y-6 gold-border-glow">
        {/* Saffron border-accent bar at the top */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 via-primary to-amber-500 rounded-t-2xl" />

        {/* Animated volume icon */}
        <div className="flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 border border-primary/20 text-primary mx-auto animate-pulse shadow-[0_0_20px_rgba(212,175,55,0.15)]">
          <Volume2 className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-serif font-black tracking-widest text-gold-gradient uppercase">
            NAMASTE DASHBOARD
          </h3>
          <p className="text-[11px] uppercase tracking-widest text-slate-400 font-bold">
            Real-time Audio Alert System
          </p>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed font-light font-sans max-w-xs mx-auto">
          Browser security guidelines require a single manual action to initialize and enable automated, real-time sound alarms for incoming order notifications.
        </p>

        <button
          onClick={unlockAudio}
          className="w-full bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-[#070B1E] font-black text-xs uppercase tracking-widest py-4 px-6 rounded-xl shadow-[0_4px_20px_rgba(245,158,11,0.2)] hover:shadow-[0_6px_25px_rgba(245,158,11,0.35)] transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer focus:outline-none"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>Enter Dashboard & Activate Audio</span>
        </button>

        <div className="pt-2 border-t border-primary/5">
          <p className="text-[10px] text-muted-foreground/40 font-mono">
            Requires sound permission in your browser settings.
          </p>
        </div>
      </div>
    </div>
  );
}
