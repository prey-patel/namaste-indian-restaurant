import React from 'react';
import GoldSpinner from './gold-spinner';

type LoadingStateProps = {
  message?: string;
  className?: string;
};

export default function LoadingState({
  message = 'Wczytywanie... / Loading...',
  className = ''
}: LoadingStateProps) {
  return (
    <div className={`min-h-[40vh] w-full flex flex-col items-center justify-center space-y-4 ${className}`}>
      <GoldSpinner size="lg" />
      <p className="text-xs text-muted-foreground uppercase tracking-widest animate-pulse font-sans font-bold">
        {message}
      </p>
    </div>
  );
}
