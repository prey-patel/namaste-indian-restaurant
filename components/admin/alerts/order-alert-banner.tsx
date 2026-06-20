'use client';

import React from 'react';
import { ShoppingBag, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  pendingCount: number;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

export default function OrderAlertBanner({
  pendingCount,
  soundEnabled,
  onToggleSound
}: Props) {
  if (pendingCount === 0) return null;

  return (
    <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-600 [.admin-theme_&]:text-yellow-800 dark:text-yellow-400 p-4 rounded-lg flex items-center justify-between gap-4 font-sans animate-pulse">
      <div className="flex items-center space-x-3">
        <ShoppingBag className="w-5 h-5 shrink-0" />
        <div>
          <h3 className="text-sm font-bold">New Orders Waiting for Approval</h3>
          <p className="text-[11px] opacity-80 mt-0.5">
            There {pendingCount === 1 ? 'is 1 order' : `are ${pendingCount} orders`} that require review.
          </p>
        </div>
      </div>
      {soundEnabled && (
        <Button
          onClick={onToggleSound}
          variant="outline"
          className="border-yellow-500/30 text-yellow-600 hover:bg-yellow-500/20 [.admin-theme_&]:text-yellow-800 text-xs font-semibold px-4 py-2 flex items-center gap-1.5 shrink-0"
        >
          <VolumeX className="w-4 h-4" />
          Silence Loop
        </Button>
      )}
    </div>
  );
}
