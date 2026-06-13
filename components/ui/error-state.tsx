import React from 'react';
import PremiumCard from './premium-card';
import PremiumButton from './premium-button';

type ErrorStateProps = {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryText?: string;
  className?: string;
};

export default function ErrorState({
  title = 'Coś poszło nie tak / Something went wrong',
  message,
  onRetry,
  retryText = 'Spróbuj ponownie / Try Again',
  className = ''
}: ErrorStateProps) {
  return (
    <PremiumCard hoverable={false} className={`max-w-md mx-auto text-center border-red-500/25 py-8 ${className}`}>
      <div className="text-red-500 mb-4 flex justify-center">
        <svg className="w-12 h-12 stroke-current" fill="none" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h3 className="font-serif text-lg font-bold text-red-400 mb-2">{title}</h3>
      <p className="text-xs text-muted-foreground leading-relaxed mb-6">{message}</p>
      {onRetry && (
        <PremiumButton variant="outline" size="sm" onClick={onRetry}>
          {retryText}
        </PremiumButton>
      )}
    </PremiumCard>
  );
}
