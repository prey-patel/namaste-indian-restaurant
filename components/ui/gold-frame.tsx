import React, { ReactNode } from 'react';

type GoldFrameProps = {
  children: ReactNode;
  className?: string;
};

export default function GoldFrame({ children, className = '' }: GoldFrameProps) {
  return (
    <div className={`relative p-4 border border-border rounded-lg bg-card ${className}`}>
      {/* Decorative Gold corner brackets representing premium Indian hospitality */}
      <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-primary rounded-tl-sm pointer-events-none" />
      <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-primary rounded-tr-sm pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-primary rounded-bl-sm pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-primary rounded-br-sm pointer-events-none" />
      
      {/* Inner containment */}
      <div className="relative border border-border rounded p-2 bg-background overflow-hidden text-foreground">
        {children}
      </div>
    </div>
  );
}
