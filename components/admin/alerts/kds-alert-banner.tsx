'use client';

import React from 'react';
import { ChefHat, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  unseenCount: number;
  onMarkSeen: () => void;
}

export default function KdsAlertBanner({ unseenCount, onMarkSeen }: Props) {
  if (unseenCount === 0) return null;

  return (
    <div className="bg-primary/20 border border-primary/30 text-foreground p-4 rounded-lg flex items-center justify-between gap-4 font-sans animate-pulse">
      <div className="flex items-center space-x-3">
        <ChefHat className="w-5 h-5 text-primary shrink-0" />
        <div>
          <h3 className="text-sm font-bold">New Kitchen Orders Arrived</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            There {unseenCount === 1 ? 'is 1 new approved order' : `are ${unseenCount} new approved orders`} that need preparation.
          </p>
        </div>
      </div>
      <Button
        onClick={onMarkSeen}
        className="bg-primary hover:bg-primary/90 text-black text-xs font-bold px-4 py-2 flex items-center gap-1.5 shrink-0"
      >
        <Check className="w-4 h-4" />
        Mark Alert Seen
      </Button>
    </div>
  );
}
