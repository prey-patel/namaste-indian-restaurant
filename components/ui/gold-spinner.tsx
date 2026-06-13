import React from 'react';

type GoldSpinnerProps = {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

export default function GoldSpinner({ size = 'md', className = '' }: GoldSpinnerProps) {
  const sizeClasses = {
    sm: 'w-6 h-6 border-2',
    md: 'w-10 h-10 border-[3px]',
    lg: 'w-16 h-16 border-[4px]'
  };

  return (
    <div className={`relative flex items-center justify-center ${className}`} role="status" aria-label="Loading">
      {/* Outer gold ring spinning */}
      <div
        className={`rounded-full animate-spin border-transparent border-t-primary border-r-primary ${sizeClasses[size]}`}
      />
      {/* Inner faint glowing ring */}
      <div
        className={`absolute rounded-full border-primary/10 ${sizeClasses[size]}`}
      />
      <span className="sr-only">Wczytywanie... / Loading...</span>
    </div>
  );
}
