import React from 'react';
import GoldSpinner from '@/components/ui/gold-spinner';

export default function AdminLoading() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
      <GoldSpinner size="lg" />
      <p className="text-xs text-muted-foreground uppercase tracking-widest animate-pulse font-semibold">
        Loading Admin Data...
      </p>
    </div>
  );
}
