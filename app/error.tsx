'use client';

import React, { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled Global Error:', error);
  }, [error]);

  return (
    <div className="min-h-[80vh] w-full text-white flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-[#070B1E] border border-primary/20 p-8 rounded-xl shadow-2xl text-center space-y-6">
        <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 text-red-400 rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
          !
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-serif font-bold text-primary">Something went wrong</h2>
          <p className="text-sm text-slate-400">
            An unexpected error occurred. Our team has been notified.
          </p>
        </div>
        <button
          onClick={() => reset()}
          className="w-full py-2.5 px-4 bg-primary text-primary-foreground font-semibold rounded-lg hover:brightness-110 transition-all text-sm"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
