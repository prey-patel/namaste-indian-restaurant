'use client';

import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Admin Panel Error:', error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-card border border-border p-8 rounded-xl shadow-2xl text-center space-y-6">
        <div className="w-14 h-14 bg-destructive/10 border border-destructive/20 text-destructive rounded-full flex items-center justify-center mx-auto">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-foreground">Admin Workspace Error</h2>
          <p className="text-sm text-muted-foreground">
            {error.message || 'An error occurred while loading this section.'}
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => reset()}
            className="flex-1 bg-primary text-primary-foreground font-semibold"
          >
            <RefreshCw className="w-4 h-4 mr-2" /> Reload Section
          </Button>
        </div>
      </div>
    </div>
  );
}
