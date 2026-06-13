import React, { ReactNode } from 'react';
import PageTransition from './page-transition';

type PageShellProps = {
  children: ReactNode;
  className?: string;
};

export default function PageShell({ children, className = '' }: PageShellProps) {
  return (
    <PageTransition>
      <div className={`w-full flex-1 flex flex-col ${className}`}>
        {children}
      </div>
    </PageTransition>
  );
}
