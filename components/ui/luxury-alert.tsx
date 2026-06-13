import React, { ReactNode } from 'react';

type AlertType = 'info' | 'success' | 'warning' | 'error';

type LuxuryAlertProps = {
  type?: AlertType;
  title?: string;
  children: ReactNode;
  className?: string;
};

export default function LuxuryAlert({
  type = 'info',
  title,
  children,
  className = ''
}: LuxuryAlertProps) {
  const styles = {
    info: 'border-primary/30 bg-[#0A1128]/90 text-[#D4AF37]/90',
    success: 'border-green-500/30 bg-green-500/5 text-green-300',
    warning: 'border-yellow-500/30 bg-yellow-500/5 text-yellow-300',
    error: 'border-red-500/30 bg-red-500/5 text-red-300'
  };

  const icons = {
    info: (
      <svg className="w-5 h-5 mr-3 shrink-0 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    success: (
      <svg className="w-5 h-5 mr-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    warning: (
      <svg className="w-5 h-5 mr-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    error: (
      <svg className="w-5 h-5 mr-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  };

  return (
    <div
      role="alert"
      className={`flex p-4 border rounded-lg text-sm leading-relaxed ${styles[type]} ${className}`}
    >
      {icons[type]}
      <div>
        {title && <h5 className="font-sans font-bold text-foreground mb-1">{title}</h5>}
        <div className="opacity-90">{children}</div>
      </div>
    </div>
  );
}
